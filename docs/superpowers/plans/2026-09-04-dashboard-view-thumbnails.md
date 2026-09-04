# Dashboard View and Photo Thumbnails Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan filter view submission yang independen dari mode form, ubah dashboard menjadi accordion kelas dengan kartu thumbnail, dan pastikan mode form dapat berpindah dari daftar ke nama bebas walaupun foto lama masih ada.

**Architecture:** API dashboard akan menerima `view=all|list|free`, menghitung dan mengelompokkan submission di server, lalu UI merender group kelas atau group Nama Bebas. Endpoint preview yang sudah admin-protected akan menambahkan variant thumbnail server-side tanpa menyimpan file tambahan; preview besar tetap memakai file asli yang telah diproses.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Drizzle ORM MySQL, sharp, archiver, Vitest, Tailwind CSS v4.

## Global Constraints

- Filter dashboard `Semua / Sesuai daftar / Nama bebas` hanya mengubah tampilan dashboard, tidak mengubah mode form publik.
- Dashboard awal memilih `Semua` dan semua group accordion tertutup.
- Submission daftar dikelompokkan berdasarkan kelas; submission bebas berada dalam satu group virtual `Nama Bebas`.
- Header group kelas menampilkan nama kelas, progres sudah/belum upload, persentase, dan tombol ZIP kelas.
- Kartu siswa berisi thumbnail, nomor absen, nama, dan badge status; siswa tanpa foto tetap memiliki placeholder `Belum upload`.
- Nama dan thumbnail yang memiliki foto membuka preview besar; kartu pending tidak membuka preview.
- Grid memakai 2 kolom mobile dan 3-4 kolom desktop dengan thumbnail ukuran sedang.
- Urutan kelas mengikuti master CSV; siswa mengikuti nomor absen; submission bebas mengikuti waktu upload.
- Filter status dan pencarian berlaku pada kartu/group.
- Thumbnail memakai endpoint `?variant=thumb`, tidak menyimpan file thumbnail permanen, dan maksimal sekitar 240px.
- Mode `free` dapat diaktifkan walaupun submission `list` masih ada; submission lama tidak diubah.
- Mode awal database baru tetap `list`.
- Semua route admin memanggil `requireAdmin()`.
- Tidak menambah dependency baru.
- Verifikasi akhir wajib: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` di `/WebFoto/app`.

---

## File Map

- Modify: `app/src/lib/dashboard.ts` — tipe/grouping/stats helper.
- Modify: `app/src/lib/settings.ts` dan `app/src/lib/settings.test.ts` — regression mode activation.
- Modify: `app/src/app/api/admin/submissions/route.ts` — view filter, groups, stats.
- Modify: `app/src/app/api/photos/submission/[submissionKey]/route.ts` — thumbnail variant.
- Modify: `app/src/app/admin/page.tsx` — view selector, accordion classes, cards, thumbnails.
- Modify: `app/src/app/admin/form/page.tsx` — ensure activation flow is clear while photos exist.
- Modify: `README.md`, `CARA_DEPLOY_LOKAL.md` — document dashboard view/thumbnail behavior if needed.
- Create/modify: focused tests in `app/src/lib/*.test.ts`.

---

### Task 1: Dashboard grouping and settings regression helpers

**Files:**
- Modify: `app/src/lib/dashboard.ts`
- Modify: `app/src/lib/settings.ts`
- Modify: `app/src/lib/settings.test.ts`
- Create: `app/src/lib/dashboard-groups.test.ts`

**Interfaces:**
- `DashboardView = "all" | "list" | "free"`.
- `SubmissionRow` includes `submissionKey`, nullable `studentId`/`nis`, `name`, nullable `className`/`attendanceNumber`, `sourceMode`, `status`, `uploadedAt`, and nullable `photoId`.
- `groupSubmissionRows(rows: SubmissionRow[], view: DashboardView): SubmissionGroup[]` returns class groups and one `Nama Bebas` group.
- `buildSubmissionStats` preserves `submitted = uploaded + blur` and percentages.
- `activateSettings()` must only copy draft to active; it must not query, delete, or reject existing submissions.

- [ ] **Step 1: Write failing grouping tests**

```ts
it("groups list rows by class in CSV order", () => {
  const groups = groupSubmissionRows([
    { sourceMode: "list", className: "X DKV 1", name: "B", status: "uploaded", submissionKey: "b" },
    { sourceMode: "list", className: "X TJKT", name: "A", status: "pending", submissionKey: null },
  ], "list");
  expect(groups.map((group) => group.title)).toEqual(["X TJKT", "X DKV 1"]);
});

it("puts free rows in one virtual group", () => {
  const groups = groupSubmissionRows([
    { sourceMode: "free", className: null, name: "Budi", status: "uploaded", submissionKey: "1" },
    { sourceMode: "free", className: null, name: "Ani", status: "blur", submissionKey: "2" },
  ], "free");
  expect(groups).toHaveLength(1);
  expect(groups[0].title).toBe("Nama Bebas");
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/dashboard-groups.test.ts`; expected failure because grouping types/helper do not exist.

- [ ] **Step 3: Implement grouping helper**

Group list rows by `className`, preserve first-seen master/query order, calculate each group’s `total`, `submitted`, and `pending`, and group free rows under key `free`. Filter `view` before grouping. Keep pending list rows in their class group.

- [ ] **Step 4: Add settings activation regression test**

Extend `settings.test.ts` or repository test with a configured draft and an unrelated existing submission fixture/mocked count; assert activating draft changes only active settings and does not call a submission deletion/guard path. The implementation must not add a submission check to `activateSettings`.

- [ ] **Step 5: Run GREEN tests**

Run `npx vitest run src/lib/dashboard-groups.test.ts src/lib/settings.test.ts`; expected PASS.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/dashboard.ts app/src/lib/dashboard-groups.test.ts app/src/lib/settings.ts app/src/lib/settings.test.ts
git commit -m "feat: add dashboard submission grouping"
```

---

### Task 2: Thumbnail endpoint

**Files:**
- Modify: `app/src/app/api/photos/submission/[submissionKey]/route.ts`
- Create/modify: `app/src/lib/thumbnail.test.ts`

**Interfaces:**
- `GET /api/photos/submission/:submissionKey` returns the processed full image.
- `GET /api/photos/submission/:submissionKey?variant=thumb` returns an image resized to max 240px.
- Both variants require `requireAdmin()` and use the DB `mimeType` for the response.

- [ ] **Step 1: Write failing thumbnail tests**

Add a pure/isolated assertion for variant parsing and a real temporary-image test where the thumbnail output metadata has width/height no greater than 240:

```ts
it("recognizes the thumb variant", () => {
  expect(imageVariant("thumb")).toBe("thumb");
  expect(imageVariant("full")).toBe("full");
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/thumbnail.test.ts`; expected failure because `imageVariant` is absent.

- [ ] **Step 3: Implement thumbnail processing**

Read the query string. For `thumb`, run `sharp(buffer).resize({ width: 240, height: 240, fit: "inside", withoutEnlargement: true }).toBuffer()` while retaining the source format/content type; for full, return the stored bytes. Keep `cache-control: private, max-age=60` and return 404 for missing records/files.

- [ ] **Step 4: Run GREEN and checks**

Run `npx vitest run src/lib/thumbnail.test.ts`, `npm run typecheck`, and `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add app/src/app/api/photos/submission/[submissionKey]/route.ts app/src/lib/thumbnail.test.ts
git commit -m "feat: add server-side photo thumbnails"
```

---

### Task 3: Dashboard API view/filter/groups

**Files:**
- Modify: `app/src/app/api/admin/submissions/route.ts`
- Modify: `app/src/lib/dashboard.ts`
- Create/modify: `app/src/lib/dashboard-api.test.ts`

**Interfaces:**
- `GET /api/admin/submissions?view=all|list|free&status=all|pending|uploaded|blur&classId=&search=` returns `{ activeMode, view, settings, stats, groups, rows }`.
- `groups` item is `{ type: "class" | "free", key, classId, title, total, submitted, pending, rows }`.
- List pending means `isNull(photoSubmissions.id)`, not `photoSubmissions.status = "pending"`.
- Free rows are read directly from `photoSubmissions` and expose `photoId` for status actions.

- [ ] **Step 1: Write failing API/helper tests**

Cover these cases:

```ts
it("supports all/list/free views independently from active mode", () => {
  expect(normalizeDashboardView("list")).toBe("list");
  expect(normalizeDashboardView("free")).toBe("free");
  expect(normalizeDashboardView("unknown")).toBe("all");
});

it("counts a list student without a submission as pending", () => {
  const result = buildSubmissionStats({ total: 2, uploaded: 1, blur: 0, pending: 1, byClass: [] });
  expect(result.pending).toBe(1);
  expect(result.submittedPercentage).toBe(50);
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/dashboard-api.test.ts`; expected failure for missing view normalization/updated API helper.

- [ ] **Step 3: Implement view-aware queries**

Refactor the current active-mode branch so `view` selects the source independently:

- `list`: left join all students to list submissions, apply class/status/search filters, and build class groups.
- `free`: select free submissions, apply status/search, and build the `Nama Bebas` group.
- `all`: combine list student rows and free submission rows, then build both group types.

Use MySQL-compatible `LIKE` search and `SUM(CASE ...)`. For a class filter, apply it only to list groups; free view has no class filter. Stats must correspond to the selected view/filter data, with list pending derived from missing submission records.

- [ ] **Step 4: Add API response tests with narrow repository fixtures**

Assert response shape includes `view`, `groups`, `photoId`, pending rows, and no class field on free rows. Keep admin auth behavior unchanged.

- [ ] **Step 5: Run GREEN and checks**

Run `npx vitest run src/lib/dashboard-api.test.ts src/lib/dashboard-groups.test.ts`, `npm run typecheck`, and `npm run lint`.

- [ ] **Step 6: Commit**

```bash
git add app/src/app/api/admin/submissions/route.ts app/src/lib/dashboard.ts app/src/lib/dashboard-api.test.ts
git commit -m "feat: add dashboard view filters"
```

---

### Task 4: Dashboard accordion, cards, and thumbnails

**Files:**
- Modify: `app/src/app/admin/page.tsx`
- Modify: `app/src/lib/dashboard.ts`
- Create/modify: `app/src/lib/dashboard-ui.test.ts`

**Interfaces:**
- Dashboard state has `view: "all" | "list" | "free"` and `openGroups: Set<string>`/equivalent.
- Dashboard fetches `/api/admin/submissions` with `view`, status, class, and search.
- Thumbnail URL is `/api/photos/submission/${encodeURIComponent(submissionKey)}?variant=thumb`.

- [ ] **Step 1: Write failing UI helper tests**

Test initial/changed view group state and preview eligibility:

```ts
it("starts with every group closed", () => {
  expect(initialOpenGroups(["class:1", "class:2"])).toEqual([]);
});

it("allows preview only when a submission key exists", () => {
  expect(canPreview({ submissionKey: "abc", status: "uploaded" })).toBe(true);
  expect(canPreview({ submissionKey: null, status: "pending" })).toBe(false);
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/dashboard-ui.test.ts`; expected failure because helpers are absent.

- [ ] **Step 3: Implement view selector and data loading**

Add a toolbar selector with `Semua`, `Sesuai daftar`, `Nama bebas`. Keep the active public form mode as an informational label. Reset open groups when view/filter data changes. Add manual Refresh and preserve loading/error/unauthorized states.

- [ ] **Step 4: Replace student table with accordion groups**

Render all API groups as closed cards. Each class header shows class name, `{submitted}/{total}`, pending count, percentage, and a per-class ZIP button. The virtual free group has no class ZIP button. Stop propagation on the ZIP button so it does not toggle the accordion.

- [ ] **Step 5: Render responsive student cards**

Inside an open class group, render a 2-column mobile / 3-4-column desktop grid. Each card contains:

- thumbnail using `variant=thumb` when `submissionKey` exists;
- placeholder block with `Belum upload` when no submission;
- attendance number when available;
- name and status badge;
- status action for uploaded/blur rows.

Clicking name or thumbnail opens the existing accessible large modal. Add image error fallback for thumbnails and modal. Do not add prev/next.

- [ ] **Step 6: Keep export behavior**

Wire per-class ZIP buttons to `/api/admin/export/{classId}` and global ZIP to `/api/admin/export/all`. Free submissions use global ZIP only.

- [ ] **Step 7: Run GREEN and checks**

Run `npx vitest run src/lib/dashboard-ui.test.ts`, `npm run typecheck`, `npm run lint`, and `npm run build`.

- [ ] **Step 8: Commit**

```bash
git add app/src/app/admin/page.tsx app/src/lib/dashboard.ts app/src/lib/dashboard-ui.test.ts
git commit -m "feat: browse dashboard by class with thumbnails"
```

---

### Task 5: Documentation and final integration verification

**Files:**
- Modify: `README.md`
- Modify: `CARA_DEPLOY_LOKAL.md`

- [ ] **Step 1: Document dashboard behavior**

Document view filters, accordion class browsing, thumbnails, large preview, and the fact that changing public form mode does not delete existing submissions.

- [ ] **Step 2: Run complete verification sequentially**

From `/WebFoto/app` run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Run typecheck after build if parallel execution causes `.next/types` race. Expected: all tests pass, typecheck/lint pass, production build succeeds.

- [ ] **Step 3: Manual smoke checklist**

Verify: activate free mode while list photos remain; dashboard view list/free/all; all groups initially closed; accordion class browsing; class header progress and ZIP; thumbnail loading; placeholder pending; click name/thumbnail preview; filter status/search; free duplicate names; global ZIP; switch back to list mode without deleting old free/list submissions.

- [ ] **Step 4: Commit documentation**

```bash
git add README.md CARA_DEPLOY_LOKAL.md
git commit -m "docs: document dashboard browsing modes"
```
