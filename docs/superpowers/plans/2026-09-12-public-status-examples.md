# Public Status and Example Photos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tambahkan contoh foto pada form publik, halaman status publik `/status` yang mengikuti mode event aktif, API status aman, dan update dependency patch/minor yang kompatibel.

**Architecture:** Buat helper agregasi publik yang mengubah data roster/submission menjadi statistik aman. Endpoint `/api/status` membaca konfigurasi aktif lalu memilih query list atau free; halaman `/status` merender layout referensi tanpa foto siswa. Asset contoh ditempatkan di `app/public`, sedangkan dependency hanya dinaikkan ke versi wanted patch/minor.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Drizzle ORM MySQL, sharp, Vitest, Tailwind CSS v4.

## Global Constraints

- `/status` publik tidak memerlukan login.
- Response publik tidak boleh memuat NIS, storage path, atau foto siswa.
- Mode list menampilkan total/sudah/belum/progress, grafik per kelas, dan detail nama/status/waktu.
- Mode free menampilkan total submission/sudah/blur/progress dan daftar nama/status/waktu tanpa kelas/NIS/foto.
- Contoh asset: `contoh-foto-benar.png` dan `contoh-foto-salah.png` disalin ke `app/public`.
- Grafik memakai SVG/CSS; tidak menambah Chart.js.
- Dependency hanya update patch/minor yang kompatibel; jangan naik major Next 16, TypeScript 7, Vitest 5, Sharp 0.35, atau Archiver 8.
- Verifikasi: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

---

## File Map

- Create: `app/src/app/api/status/route.ts` — public mode-aware status API.
- Create: `app/src/app/status/page.tsx` — public status page.
- Modify: `app/src/app/page.tsx` — example photo section and status link.
- Modify: `app/src/lib/public-status.ts` — safe aggregation/types.
- Create: `app/src/lib/public-status.test.ts` — aggregation/security tests.
- Add binary assets: `app/public/contoh-foto-benar.png`, `app/public/contoh-foto-salah.png`.
- Modify: `app/package.json`, `app/package-lock.json` — wanted patch/minor updates only.
- Modify: `README.md`, `CARA_DEPLOY_LOKAL.md` — public status and dependency update notes.

---

### Task 1: Public status aggregation and safety helpers

**Files:**
- Create: `app/src/lib/public-status.ts`
- Create: `app/src/lib/public-status.test.ts`

**Interfaces:**
- `PublicListRow = { name: string; className: string; attendanceNumber: number; status: "uploaded" | "blur" | "pending"; uploadedAt: Date | string | null }`.
- `PublicFreeRow = { name: string; status: "uploaded" | "blur"; uploadedAt: Date | string | null }`.
- `buildPublicListStats(input)` returns total, uploaded, blur, pending, progress, and grouped class summaries.
- `buildPublicFreeStats(input)` returns total, submitted, blur, progress, and sanitized rows.
- `publicStatusSettings(settings)` returns only title/year/description/mode; never includes database identifiers or internal settings fields.

- [ ] **Step 1: Write failing tests**

```ts
it("aggregates list rows including students without photos", () => {
  const result = buildPublicListStats({
    rows: [
      { name: "A", className: "X TJKT", attendanceNumber: 1, status: "uploaded", uploadedAt: "2026-09-01" },
      { name: "B", className: "X TJKT", attendanceNumber: 2, status: "pending", uploadedAt: null },
    ],
  });
  expect(result.total).toBe(2);
  expect(result.uploaded).toBe(1);
  expect(result.pending).toBe(1);
  expect(result.progress).toBe(50);
});

it("does not expose internal identifiers in public settings", () => {
  expect(publicStatusSettings({ id: 1, mode: "list", title: "Event", year: "2026", description: "" })).toEqual({ mode: "list", title: "Event", year: "2026", description: "" });
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run `npx vitest run src/lib/public-status.test.ts` in `/WebFoto/app`.
Expected: FAIL because the aggregation helpers do not exist.

- [ ] **Step 3: Implement pure helpers**

Keep output deterministic: class order follows first appearance/query order, students follow attendance order, and free rows follow upload order. Round progress to one decimal. Do not include `studentId`, `nis`, `photoId`, `storagePath`, or `submissionKey` in public output.

- [ ] **Step 4: Run GREEN**

Run `npx vitest run src/lib/public-status.test.ts`; expected PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/public-status.ts app/src/lib/public-status.test.ts
git commit -m "feat: add public status aggregation"
```

---

### Task 2: Public status API

**Files:**
- Create: `app/src/app/api/status/route.ts`

**Interfaces:**
- `GET /api/status` returns `{ settings, mode, stats, classes|submissions }` according to active mode.
- No `requireAdmin()` call is used.
- Database query selects only public fields.

- [ ] **Step 1: Write focused route tests**

Test mocked repository/response mapping:

```ts
it("returns list status without internal identifiers", async () => {
  const response = await GET(new Request("http://localhost/api/status"));
  const data = await response.json();
  expect(data.settings).not.toHaveProperty("id");
  expect(data.classes[0].students[0]).not.toHaveProperty("nis");
  expect(data.classes[0].students[0]).not.toHaveProperty("photoPath");
});
```

- [ ] **Step 2: Run focused test and confirm RED**

Run `npx vitest run src/lib/public-status-api.test.ts`; expected failure because route does not exist.

- [ ] **Step 3: Implement list/free query branches**

Read `getActiveSettings()`. For list mode, left join `students` to list `photoSubmissions`, return class groups and derived pending status. For free mode, query free submissions and return only name/status/uploadedAt. Catch database errors with a generic 503 response; never return storage/file fields.

- [ ] **Step 4: Run GREEN and checks**

Run focused tests, `npm run typecheck`, and `npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add app/src/app/api/status/route.ts app/src/lib/public-status-api.test.ts
git commit -m "feat: add public upload status API"
```

---

### Task 3: Public form examples and status page

**Files:**
- Add binary: `app/public/contoh-foto-benar.png`
- Add binary: `app/public/contoh-foto-salah.png`
- Modify: `app/src/app/page.tsx`
- Create: `app/src/app/status/page.tsx`
- Create/modify: `app/src/lib/public-status-ui.test.ts`

**Interfaces:**
- `/status` reads `/api/status` using `appPath()` so it works at root and OpenLiteSpeed custom paths.
- Main form links to `status` with a visible `Lihat Status Upload` button.

- [ ] **Step 1: Add assets and failing UI helper tests**

Assert the status page route uses public API and example paths remain under `/contoh-foto-benar.png` and `/contoh-foto-salah.png` after `appPath`.

- [ ] **Step 2: Implement example section**

Copy the two supplied root images into `app/public`. Add a responsive `Contoh Foto` section after `Persyaratan Foto`; use `Image` with `appPath` and descriptive alt text. Add a link/button to `/status` through `next/link`.

- [ ] **Step 3: Implement `/status` list mode**

Render the reference structure: header, back/admin links, four stat cards, progress bar, SVG/CSS class chart, class search, and class detail cards. Each student row shows name, attendance, status, and upload time. Do not render images or NIS.

- [ ] **Step 4: Implement `/status` free mode**

Render total submission, submitted, blur, and progress cards. Render a single `Nama Bebas` detail section with name/status/time. Do not show class chart, class, NIS, or photos.

- [ ] **Step 5: Add responsive/error/loading states**

Use the existing blue/white visual language, support mobile layouts, display an error/retry state when `/api/status` fails, and ensure empty classes/submissions render a useful message.

- [ ] **Step 6: Run checks and commit**

Run focused UI tests, `npm run typecheck`, `npm run lint`, and `npm run build`.

```bash
git add app/public/contoh-foto-benar.png app/public/contoh-foto-salah.png app/src/app/page.tsx app/src/app/status app/src/lib/public-status-ui.test.ts
git commit -m "feat: add public examples and upload status page"
```

---

### Task 4: Safe dependency updates and documentation

**Files:**
- Modify: `app/package.json`, `app/package-lock.json`
- Modify: `README.md`, `CARA_DEPLOY_LOKAL.md`

- [ ] **Step 1: Update compatible versions only**

Use npm wanted versions and verify official Context7/Next documentation before changing package ranges. Update patch/minor candidates such as Next 15.5.x, `eslint-config-next` 15.5.x, `jose`, `mysql2`, `postcss`, `tsx`, `zod`, and `@types/react-dom`. Do not upgrade major Next 16, TypeScript 7, Vitest 5, Sharp 0.35, or Archiver 8.

Run:

```bash
npm outdated
npm update
```

Review `package.json` and lockfile to ensure no major versions were introduced.

- [ ] **Step 2: Update documentation**

Document:

- `/status` public URL and mode-dependent behavior.
- Example photo section on the upload page.
- No public photo/NIS exposure on status page.
- Dependency update policy and verification commands.

- [ ] **Step 3: Final verification**

Run sequentially from `/WebFoto/app`:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

If testing the OpenLiteSpeed custom path, build with `NEXT_PUBLIC_BASE_PATH=/webfoto npm run build` and verify `/webfoto/status` plus `/webfoto/api/status` manually.

- [ ] **Step 4: Commit**

```bash
git add app/package.json app/package-lock.json README.md CARA_DEPLOY_LOKAL.md
git commit -m "chore: update compatible dependencies and status docs"
```
