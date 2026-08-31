# Reusable Photo Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bangun sidebar admin, mode form daftar/bebas, model submission generik, pengaturan event, dan alur reset/roster agar WebFoto dapat dipakai ulang untuk event berikutnya.

**Architecture:** Ganti tabel `photos` dengan `photo_submissions` yang dapat menyimpan submission mode daftar maupun nama bebas. Simpan konfigurasi draft/aktif pada singleton `event_settings`; API upload, dashboard, preview, status, dan export membaca model submission generik. Admin UI dipecah menjadi shell/sidebar dan tiga URL: `/admin`, `/admin/form`, `/admin/reuse`.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Tailwind CSS v4, Drizzle ORM MySQL, sharp, archiver, jose, bcryptjs, Vitest.

## Global Constraints

- Admin memiliki tiga menu: Dashboard Data Foto, Pengaturan Form, dan Gunakan Kembali Web.
- Sidebar desktop berada di kiri; pada mobile sidebar menjadi drawer buka/tutup.
- URL menu: `/admin`, `/admin/form`, dan `/admin/reuse`.
- Mode awal database baru adalah `Sesuai daftar`.
- Form menggunakan draft dan konfigurasi aktif; form publik hanya memakai konfigurasi aktif.
- Judul dan tahun event wajib; deskripsi opsional.
- Mode `Sesuai daftar` meminta kelas + nama dari CSV; mode `Nama bebas` hanya meminta nama.
- Nama bebas di-trim, panjang 3-160 karakter, duplikat diperbolehkan, setiap submit menjadi submission baru.
- Mode boleh diganti ketika foto sudah ada.
- Reset menghapus record submission, `data/uploads`, dan `data/generated`; roster/admin/settings tetap dipertahankan.
- Reset membutuhkan input tepat `HAPUS` dan mengembalikan ringkasan jumlah berhasil/gagal.
- CSV memakai format `NO,NIS,NISN,NAMA,KELAS`, preview, input tepat `GANTI DATA`, dan hanya dapat diterapkan ketika tidak ada submission.
- CSV baru mengganti roster lama secara total dan mengaktifkan mode `Sesuai daftar`.
- Semua endpoint admin memakai session dan operasi reset/roster memakai POST.
- Upload baru dikonversi JPEG quality 82, rotate, resize max 1600px.
- File `.webp` lama tetap diexport sebagai `.webp`; upload baru disimpan `.jpg`.
- Tidak menambah dependency baru.
- Verifikasi akhir: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` di `/WebFoto/app`.

---

## File Map

**Database/domain:**

- Create: `app/src/db/migrations/0001_reusable_photo_web.sql`
- Modify: `app/src/db/schema.ts`, `app/src/db/seed.ts`
- Modify: `app/src/lib/domain.ts`, `app/src/lib/storage.ts`
- Create: `app/src/lib/settings.ts`, `app/src/lib/submissions.ts`

**API:**

- Create: `app/src/app/api/settings/route.ts`
- Create: `app/src/app/api/admin/settings/route.ts`, `app/src/app/api/admin/settings/activate/route.ts`
- Create: `app/src/app/api/admin/submissions/route.ts`
- Create: `app/src/app/api/admin/reuse/clear-photos/route.ts`, `app/src/app/api/admin/reuse/roster/preview/route.ts`, `app/src/app/api/admin/reuse/roster/commit/route.ts`
- Modify: `app/src/app/api/photos/upload/route.ts`, `app/src/app/api/photos/[studentId]/route.ts`, `app/src/app/api/classes/[id]/students/route.ts`
- Modify: `app/src/app/api/admin/photos/[id]/status/route.ts`, `app/src/app/api/admin/names/route.ts`, `app/src/app/api/admin/export/[classId]/route.ts`

**Admin/public UI:**

- Create: `app/src/app/admin/layout.tsx`, `app/src/app/admin/components/AdminShell.tsx`
- Create: `app/src/app/admin/form/page.tsx`, `app/src/app/admin/reuse/page.tsx`
- Modify: `app/src/app/admin/page.tsx`, `app/src/app/page.tsx`

**Tests/docs:**

- Create/modify focused tests under `app/src/lib/*.test.ts`
- Modify: `README.md`, `CARA_DEPLOY_LOKAL.md` if settings/migration commands need documentation.

---

### Task 1: Generic schema, settings, and submission domain

**Files:**
- Modify: `app/src/db/schema.ts`
- Create: `app/src/db/migrations/0001_reusable_photo_web.sql`
- Modify: `app/src/lib/domain.ts`
- Create: `app/src/lib/settings.ts`, `app/src/lib/submissions.ts`
- Create: `app/src/lib/reusable-domain.test.ts`

**Interfaces:**
- `FormMode = "list" | "free"`.
- `SubmissionStatus = "uploaded" | "blur"`.
- `photoSubmissions` stores `submissionKey`, `sourceMode`, nullable `studentId`, snapshot `name`, nullable `className`, `attendanceNumber`, `nis`, file metadata, status, and timestamps.
- `eventSettings` is singleton row `id=1` with draft/active mode, title, year, description, and timestamps.
- `photoExportExtension(mimeType: string): "jpg" | "webp"` remains compatible with old `.webp` records.
- `validateFreeName(value: string): string` trims and throws for length outside 3-160.
- `freeSubmissionFilename(submissionKey: string, name: string, extension: string): string` returns sanitized `{submissionKey} - {name}.{extension}`.

- [ ] **Step 1: Write failing domain tests**

Add tests that express the required behavior:

```ts
it("validates and trims a free-form name", () => {
  expect(validateFreeName("  Budi Santoso  ")).toBe("Budi Santoso");
  expect(() => validateFreeName("ab")).toThrow();
});

it("creates a collision-safe free submission filename", () => {
  expect(freeSubmissionFilename("01HABC", "Budi/A", "jpg")).toBe("01HABC - Budi_A.jpg");
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/reusable-domain.test.ts` in `/WebFoto/app`.
Expected: fail because the new helpers/schema-facing types do not exist.

- [ ] **Step 3: Implement schema and pure helpers**

Use these exact model rules:

```ts
export const formMode = mysqlEnum("form_mode", ["list", "free"]);
export const submissionStatus = mysqlEnum("submission_status", ["uploaded", "blur"]);

// eventSettings: id=1, draftMode, activeMode, draftTitle, activeTitle,
// draftYear, activeYear, draftDescription, activeDescription, timestamps.
// photoSubmissions: submissionKey unique, sourceMode, nullable studentId,
// name, nullable className/attendanceNumber/nis, storagePath,
// originalFilename, mimeType, fileSize, status, uploadedAt, updatedAt.
```

`studentId` must have a nullable unique index so list mode has one row per student while multiple free rows with `NULL` are allowed. New settings default to active/draft mode `list`, title `Pengumpulan Foto LDK`, year `2026`, and the current description.

- [ ] **Step 4: Add MySQL migration**

Generate or write a migration that creates `event_settings` and `photo_submissions`, then drops the old `photos` table because the approved design allows reset/no legacy migration. Keep `classes`, `students`, and `admin_users`.

- [ ] **Step 5: Run GREEN tests and schema checks**

Run `npx vitest run src/lib/reusable-domain.test.ts`, `npm run typecheck`, and `npm run db:generate` if migration generation is needed. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/db/schema.ts app/src/db/migrations app/src/lib/domain.ts app/src/lib/settings.ts app/src/lib/submissions.ts app/src/lib/reusable-domain.test.ts
git commit -m "feat: add reusable event and submission models"
```

---

### Task 2: Settings API and seed defaults

**Files:**
- Modify: `app/src/db/seed.ts`
- Modify: `app/src/lib/settings.ts`
- Create: `app/src/app/api/settings/route.ts`
- Create: `app/src/app/api/admin/settings/route.ts`
- Create: `app/src/app/api/admin/settings/activate/route.ts`
- Create: `app/src/lib/settings.test.ts`

**Interfaces:**
- `getActiveSettings()` returns `{ mode, title, year, description }`.
- `GET /api/settings` returns only active settings and is public.
- `GET /api/admin/settings` returns `{ draft, active }` and requires admin.
- `PUT /api/admin/settings` validates and stores draft fields.
- `POST /api/admin/settings/activate` copies draft to active and requires admin.

- [ ] **Step 1: Write failing tests**

Test settings validation/default behavior with pure helpers, including required title/year and optional description:

```ts
it("rejects an empty event title or year", () => {
  expect(() => validateEventSettings({ title: "", year: "2026", description: "" })).toThrow();
  expect(() => validateEventSettings({ title: "Event", year: "", description: "" })).toThrow();
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/settings.test.ts`; expected failure because validation/getter is not implemented.

- [ ] **Step 3: Implement settings repository and routes**

Use `id=1` upsert/select semantics. Keep server-side validation of mode (`list|free`), title, year, and description length. `activate` must copy all draft fields in one update. Do not expose draft fields from public `GET /api/settings`.

- [ ] **Step 4: Update seed**

After class/student/admin seed, upsert the singleton settings row without overwriting an existing configured event. A new database must start in list mode with the current LDK defaults.

- [ ] **Step 5: Run GREEN tests and route typecheck**

Run `npx vitest run src/lib/settings.test.ts`, `npm run typecheck`, and `npm run lint`.

- [ ] **Step 6: Commit**

```bash
git add app/src/db/seed.ts app/src/lib/settings.ts app/src/lib/settings.test.ts app/src/app/api/settings app/src/app/api/admin/settings
git commit -m "feat: add active and draft event settings"
```

---

### Task 3: Generic upload, public class list, and preview file API

**Files:**
- Modify: `app/src/lib/storage.ts`
- Modify: `app/src/app/api/photos/upload/route.ts`
- Modify: `app/src/app/api/classes/[id]/students/route.ts`
- Modify: `app/src/app/api/photos/[studentId]/route.ts`
- Create: `app/src/app/api/photos/submission/[submissionKey]/route.ts`
- Create: `app/src/lib/upload-flow.test.ts`

**Interfaces:**
- List upload input: `classId`, `studentId`, `file`; validates active mode is `list`, snapshots student name/class/NO/NIS, and upserts one `photoSubmissions` row.
- Free upload input: `name`, `file`; validates active mode is `free`, creates a new `submissionKey` row with no class/student.
- New storage output: `${submissionKey}.jpg`, `mimeType: "image/jpeg"`.
- `GET /api/photos/submission/[submissionKey]` requires admin and serves the stored file using DB mimeType.
- Existing class student response keeps `status: "pending"` as a derived UI value when no submission exists.

- [ ] **Step 1: Write failing upload-flow tests**

Test pure request validation/filename behavior:

```ts
it("requires only a name in free mode", () => {
  expect(validateUploadInput({ mode: "free", name: " Budi " })).toEqual({ name: "Budi" });
  expect(() => validateUploadInput({ mode: "free", name: "ab" })).toThrow();
});

it("requires class and student in list mode", () => {
  expect(() => validateUploadInput({ mode: "list", name: "Budi" })).toThrow();
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/upload-flow.test.ts`; expected failure because the validator/flow does not exist.

- [ ] **Step 3: Change storage to JPEG submission keys**

Keep input validation for JPEG/PNG/WEBP. Use the generated submission key as storage filename, then apply rotate, max 1600 resize, and JPEG quality 82. Do not use the old student ID filename for new generic submissions.

- [ ] **Step 4: Implement mode-aware upload route**

Read active settings on the server. Reject a payload that does not match the active mode. For list mode, query the selected student and class, then upsert by nullable unique `studentId`. For free mode, ignore any client class/student fields, validate the name, generate a unique key, and insert a new row. Return the success message `Terimakasih Telah Mensubmit. Foto berhasil diunggah.`.

- [ ] **Step 5: Update class students and preview routes**

Join `photo_submissions` to expose derived `pending`, `uploaded`, or `blur` status. Add the submission-key preview route and retain admin authentication. The old student preview route may delegate to the generic submission lookup for list-mode callers, but all new admin UI should use submission keys.

- [ ] **Step 6: Run GREEN tests and checks**

Run `npx vitest run src/lib/upload-flow.test.ts`, `npm run typecheck`, and `npm run lint`.

- [ ] **Step 7: Commit**

```bash
git add app/src/lib/storage.ts app/src/app/api/photos/upload app/src/app/api/classes app/src/app/api/photos app/src/lib/upload-flow.test.ts
git commit -m "feat: support list and free photo submissions"
```

---

### Task 4: Generic dashboard, status, names, and ZIP APIs

**Files:**
- Create: `app/src/app/api/admin/submissions/route.ts`
- Modify: `app/src/app/api/admin/photos/[id]/status/route.ts`
- Modify: `app/src/app/api/admin/names/route.ts`
- Modify: `app/src/app/api/admin/export/[classId]/route.ts`
- Create: `app/src/lib/dashboard-submissions.test.ts`

**Interfaces:**
- `GET /api/admin/submissions?status=&classId=&search=` returns `{ mode, settings, rows, stats }`.
- List rows include `submissionKey`, student ID/NIS, name, class, attendance, status, upload time, and photo ID; pending rows are generated from students without submissions.
- Free rows include `submissionKey`, name, status, upload time, and no class.
- Stats include total, submitted, pending, blur, percentages, and per-class `{ className, total, submitted, pending }` for list mode.
- Status patch updates `photoSubmissions.status`.
- Names endpoint returns pending list based on `isNull(photoSubmissions.id)` and blur list based on status.
- ZIP per class/all includes rows with files, including blur. List mode uses class-prefixed names; free mode uses `{submissionKey} - {name}.jpg`.

- [ ] **Step 1: Write failing statistic tests**

Add pure tests for list/free aggregation:

```ts
it("counts uploaded and blur as submitted in list mode", () => {
  expect(buildSubmissionStats({ total: 10, uploaded: 6, blur: 2, pending: 2 }).submitted).toBe(8);
});

it("does not create class chart rows for free submissions", () => {
  expect(buildSubmissionStats({ total: 3, uploaded: 3, blur: 0, pending: 0 }).byClass).toEqual([]);
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/dashboard-submissions.test.ts`; expected failure because the aggregation helper is absent.

- [ ] **Step 3: Implement dashboard query and aggregation**

For list mode, query all students with a left join to `photo_submissions`, and use `isNull(photoSubmissions.id)` for pending filters. For free mode, query submissions directly. Use MySQL-compatible `SUM(CASE WHEN ...)` expressions. Search free names and list names/NIS.

- [ ] **Step 4: Rewrite status/names/export routes**

All routes must query `photo_submissions`. Derive extensions with `photoExportExtension(mimeType)`. Keep missing files skipped, sanitize ZIP entry names, support `/api/admin/export/all`, and organize list all-class ZIP entries under sanitized class folders. Use free submission keys for free ZIP names.

- [ ] **Step 5: Improve archive robustness**

Attach an `error` listener to archiver. Catch missing-file `ENOENT` specifically and report/rethrow other read errors. Prefer a streamed response if compatible with the existing Next.js route; otherwise keep the current buffer implementation and document the school-sized limitation.

- [ ] **Step 6: Run GREEN tests and checks**

Run `npx vitest run src/lib/dashboard-submissions.test.ts`, `npm run typecheck`, and `npm run lint`.

- [ ] **Step 7: Commit**

```bash
git add app/src/app/api/admin/submissions app/src/app/api/admin/photos app/src/app/api/admin/names app/src/app/api/admin/export app/src/lib/dashboard-submissions.test.ts
git commit -m "feat: add generic submission dashboard APIs"
```

---

### Task 5: Admin shell/sidebar and dashboard page

**Files:**
- Create: `app/src/app/admin/layout.tsx`
- Create: `app/src/app/admin/components/AdminShell.tsx`
- Modify: `app/src/app/admin/page.tsx`

**Interfaces:**
- `AdminShell({ children }: { children: React.ReactNode })` renders desktop sidebar and mobile drawer, active link styling, and logout.
- Dashboard consumes `/api/admin/submissions` and `/api/settings`.

- [ ] **Step 1: Implement shared shell**

Create a client shell with links `/admin`, `/admin/form`, `/admin/reuse`. On mobile, provide a menu button, backdrop, close-on-link-click, and Escape handling. Keep admin auth enforcement in existing middleware/API guards.

- [ ] **Step 2: Replace dashboard data source**

Use the generic submissions endpoint. Add a manual Refresh button, explicit loading/error/unauthorized states, and mode-aware empty states. Preserve preview-on-name-click, but use `submissionKey` for `/api/photos/submission/{submissionKey}`.

- [ ] **Step 3: Improve dashboard visual data**

Keep overall summary cards and donut. In list mode render a two-color per-class chart showing submitted vs pending. In free mode hide the class chart and show total submissions/blur. Keep filter, search, copy names, per-class/all ZIP, and status actions.

- [ ] **Step 4: Add accessible preview modal**

Add `role="dialog"`, `aria-modal="true"`, an accessible title, close button, backdrop close, Escape close, image error fallback, and body scroll lock while open. Do not add prev/next navigation.

- [ ] **Step 5: Verify page**

Run `npm run typecheck`, `npm run lint`, and `npm run build`.

- [ ] **Step 6: Commit**

```bash
git add app/src/app/admin/layout.tsx app/src/app/admin/components/AdminShell.tsx app/src/app/admin/page.tsx
git commit -m "feat: add admin sidebar and reusable dashboard"
```

---

### Task 6: Form settings page and dynamic public form

**Files:**
- Create: `app/src/app/admin/form/page.tsx`
- Modify: `app/src/app/page.tsx`

**Interfaces:**
- Form settings page reads `{ draft, active }`, saves draft with `PUT`, and activates with `POST`.
- Public page reads active settings and selects the correct input mode.

- [ ] **Step 1: Build Pengaturan Form UI**

Render radio/select controls for `Sesuai daftar` and `Nama bebas`, inputs for title/year/description, Save Draft, and Aktifkan. Show active configuration separately from draft and display API validation errors.

- [ ] **Step 2: Update public page mode branching**

Fetch `/api/settings` on mount. In list mode retain class and student selects. In free mode remove class/student selects and show only a required text input with 3-160-character guidance. Submit `name` for free mode and existing class/student fields for list mode. Use active title/year/description in the page header.

- [ ] **Step 3: Verify mode behavior**

Test manually with both active modes: list upload must reject free payloads server-side, free upload must create distinct rows for duplicate names, and the success message must remain visible.

- [ ] **Step 4: Run checks and commit**

```bash
npm run typecheck
npm run lint
git add app/src/app/admin/form/page.tsx app/src/app/page.tsx
git commit -m "feat: add configurable public form modes"
```

---

### Task 7: Reuse Web APIs and UI

**Files:**
- Create: `app/src/app/api/admin/reuse/clear-photos/route.ts`
- Create: `app/src/app/api/admin/reuse/roster/preview/route.ts`
- Create: `app/src/app/api/admin/reuse/roster/commit/route.ts`
- Create: `app/src/app/admin/reuse/page.tsx`
- Modify: `app/src/lib/domain.ts` or create `app/src/lib/reuse.ts`
- Create: `app/src/lib/reuse.test.ts`

**Interfaces:**
- `POST /api/admin/reuse/clear-photos` body `{ confirmation: "HAPUS" }` returns `{ deletedSubmissions, deletedUploadFiles, deletedGeneratedFiles, failedFiles }`.
- `POST /api/admin/reuse/roster/preview` accepts multipart `file`, returns parsed count/classes/errors without changing DB.
- `POST /api/admin/reuse/roster/commit` accepts multipart `file` and `confirmation: "GANTI DATA"`; rejects if any submission exists; transactionally replaces classes/students and activates list mode.

- [ ] **Step 1: Write failing tests**

Test exact confirmations and roster conditions:

```ts
it("accepts only the exact reset confirmation", () => {
  expect(isResetConfirmation("HAPUS")).toBe(true);
  expect(isResetConfirmation("hapus")).toBe(false);
});

it("accepts only the exact roster confirmation", () => {
  expect(isRosterConfirmation("GANTI DATA")).toBe(true);
  expect(isRosterConfirmation("GANTI DATA ")).toBe(false);
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/reuse.test.ts`; expected failure because confirmation helpers/routes are absent.

- [ ] **Step 3: Implement clear-photo endpoint**

Require admin and exact `HAPUS`. Read submission storage paths before deleting rows. Delete all submission records in a DB transaction, unlink upload files and generated ZIP files separately, count successes/failures, and never delete roster/admin/settings.

- [ ] **Step 4: Implement CSV preview/commit**

Preview uses existing `parseStudentCsv`. Commit validates exact `GANTI DATA`, checks `count(photoSubmissions)=0`, parses CSV again, then in one transaction deletes classes (cascade students) and inserts the new classes/students. Update both active/draft form mode to `list` after success. On any validation/database failure, leave roster unchanged.

- [ ] **Step 5: Build reuse page**

Render two separate cards. Clear card shows counts/confirmation modal and reset result summary. CSV card has file picker, preview result, confirmation input, apply button, and clear error if photos still exist. Explain that backup is manual and not automatic.

- [ ] **Step 6: Run tests and checks**

Run `npx vitest run src/lib/reuse.test.ts`, `npm run typecheck`, `npm run lint`, and `npm run build`.

- [ ] **Step 7: Commit**

```bash
git add app/src/app/api/admin/reuse app/src/app/admin/reuse app/src/lib/reuse.ts app/src/lib/reuse.test.ts
git commit -m "feat: add safe event reuse operations"
```

---

### Task 8: Documentation, integration verification, and regression fixes

**Files:**
- Modify: `README.md`
- Modify: `CARA_DEPLOY_LOKAL.md`
- Modify any route/test files only when a verification regression is found.

- [ ] **Step 1: Update documentation**

Document the three admin URLs, settings draft/activate flow, list/free modes, generic submissions, reset confirmation `HAPUS`, CSV confirmation `GANTI DATA`, requirement to clear photos before roster replacement, and manual backup warning.

- [ ] **Step 2: Run the complete suite**

Run from `/WebFoto/app`:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all tests pass, typecheck/lint pass, and production build succeeds.

- [ ] **Step 3: Verify route and security coverage**

Confirm every new admin route calls `requireAdmin()`, public settings returns active-only fields, upload validates active mode server-side, reset/roster reject GET and bad confirmations, and roster commit rejects when submissions remain.

- [ ] **Step 4: Commit documentation and verified fixes**

```bash
git add README.md CARA_DEPLOY_LOKAL.md app/src
git commit -m "docs: document reusable photo event workflow"
```

- [ ] **Step 5: Final manual smoke checklist**

Check list mode upload, free mode duplicate-name uploads, admin preview, status blur/valid, dashboard refresh, class/all ZIP, draft/activate settings, reset summary, CSV preview/commit rejection with photos, and successful roster replacement after reset.
