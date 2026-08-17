# Dashboard Admin — Format Foto, Export ZIP, dan Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Revisi dashboard admin WebFoto agar semua upload baru disimpan sebagai `.jpg`, export ZIP mendukung per kelas dan seluruh kelas, seluruh label UI berbahasa Indonesia, dan foto bisa dipreview dengan klik nama.

**Architecture:** Perubahan terpusat pada lapisan storage (konversi ke JPEG), helper ekstensi murni di `domain.ts`, endpoint serve foto (content-type dinamis), endpoint export ZIP (dukung `classId=all` + ekstensi dinamis), dan halaman admin (modal preview + label Indonesia + tombol ZIP adaptif).

**Tech Stack:** Next.js 15 (App Router), TypeScript, Drizzle ORM (MySQL), sharp, archiver, Vitest.

## Global Constraints

- Semua upload baru dikonversi ke JPEG quality 82, resize max 1600px, tetap rotate.
- Enum status DB tidak berubah: `pending`, `uploaded`, `blur`.
- Nama file ZIP: `{Kelas} - {Absen} - {Nama}.{ext}`.
- Ekstensi ZIP dari `photoExportExtension(mimeType)` (`image/webp`→`webp`, lainnya→`jpg`).
- File `.webp` lama tidak dikonversi ulang.
- Seluruh label UI admin berbahasa Indonesia.
- Tidak menambah dependency baru.
- Verifikasi wajib: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build` di `/WebFoto/app`.
- TDD: setiap fungsi produksi baru harus didahului test yang gagal.

---

### Task 1: Helper ekstensi foto `photoExportExtension` + test

**Files:**
- Modify: `src/lib/domain.ts`
- Modify: `src/lib/domain-more.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export function photoExportExtension(mimeType: string): string`

- [ ] **Step 1: Write the failing test**

Tambahkan `describe` baru di `src/lib/domain-more.test.ts`:

```ts
import { parseStudentCsv, photoExportExtension, validateImageSignature } from "./domain";

describe("photo export extension", () => {
  it("maps webp mime to webp extension", () => {
    expect(photoExportExtension("image/webp")).toBe("webp");
  });

  it("maps jpeg mime to jpg extension", () => {
    expect(photoExportExtension("image/jpeg")).toBe("jpg");
  });

  it("maps png mime to jpg extension", () => {
    expect(photoExportExtension("image/png")).toBe("jpg");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/domain-more.test.ts` di `/WebFoto/app`
Expected: FAIL — `photoExportExtension is not defined`

- [ ] **Step 3: Write minimal implementation**

Tambahkan di akhir `src/lib/domain.ts`:

```ts
export function photoExportExtension(mimeType: string): string {
  return mimeType === "image/webp" ? "webp" : "jpg";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/domain-more.test.ts` di `/WebFoto/app`
Expected: PASS (3 test baru + 2 test lama)

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain.ts src/lib/domain-more.test.ts
git commit -m "feat: add photoExportExtension helper"
```

---

### Task 2: Konversi upload ke JPEG

**Files:**
- Modify: `src/lib/storage.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `processUpload(file: File, studentId: string): Promise<{ storagePath: string; absolutePath: string; fileSize: number; mimeType: string }>` — sekarang selalu `mimeType: "image/jpeg"`, file `${studentId}.jpg`.

- [ ] **Step 1: Modify storage**

Ganti isi `processUpload` di `src/lib/storage.ts`:

```ts
export async function processUpload(file: File, studentId: string) {
  if (!file.size || file.size > maxSize) throw new Error("Ukuran foto terlalu besar atau kosong.");
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) throw new Error("Format foto harus JPG, PNG, atau WEBP.");
  const input = Buffer.from(await file.arrayBuffer());
  if (!validateImageSignature(input, file.type)) throw new Error("File foto tidak valid atau rusak.");
  await fs.mkdir(uploadDir, { recursive: true });
  const filename = `${studentId}.jpg`;
  const absolutePath = path.join(uploadDir, filename);
  await sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toFile(absolutePath);
  const stat = await fs.stat(absolutePath);
  return { storagePath: filename, absolutePath, fileSize: stat.size, mimeType: "image/jpeg" };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck` di `/WebFoto/app`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/storage.ts
git commit -m "feat: convert all uploads to jpeg"
```

---

### Task 3: Serve foto dengan content-type dinamis

**Files:**
- Modify: `src/app/api/photos/[studentId]/route.ts`

**Interfaces:**
- Consumes: `photos.mimeType` dari DB.
- Produces: response dengan header `content-type` dari mimeType DB.

- [ ] **Step 1: Modify route**

Ubah query select dan response di `src/app/api/photos/[studentId]/route.ts`:

```ts
import fs from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { photos, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { storagePath } from "@/lib/storage";

export async function GET(_: Request, context: { params: Promise<{ studentId: string }> }) {
  try { await requireAdmin(); } catch { return new Response("Unauthorized", { status: 401 }); }
  const [row] = await db.select({ path: photos.storagePath, mimeType: photos.mimeType }).from(photos).innerJoin(students, eq(students.id, photos.studentId)).where(eq(students.studentId, (await context.params).studentId)).limit(1);
  if (!row) return new Response("Not found", { status: 404 });
  try { return new Response(await fs.readFile(storagePath(row.path)), { headers: { "content-type": row.mimeType, "cache-control": "private, max-age=60" } }); } catch { return new Response("Not found", { status: 404 }); }
}
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npm run typecheck` dan `npm run lint` di `/WebFoto/app`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/photos/[studentId]/route.ts
git commit -m "feat: serve photos with dynamic content-type"
```

---

### Task 4: Export ZIP per kelas dan seluruh kelas

**Files:**
- Modify: `src/app/api/admin/export/[classId]/route.ts`

**Interfaces:**
- Consumes: `photoExportExtension` dari `@/lib/domain`, `photos.mimeType` dari DB.
- Produces: GET `/api/admin/export/{classId}` (classId=angka → ZIP kelas; `all` → `Semua Kelas.zip` berisi folder per kelas).

- [ ] **Step 1: Modify route**

Ganti isi `src/app/api/admin/export/[classId]/route.ts`:

```ts
import fs from "node:fs/promises";
import archiver from "archiver";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { classes, photos, students } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { exportFilename, photoExportExtension, sanitizeFilename } from "@/lib/domain";
import { storagePath } from "@/lib/storage";

export async function GET(_: Request, context: { params: Promise<{ classId: string }> }) {
  try { await requireAdmin(); } catch { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
  const classIdParam = (await context.params).classId;
  const chunks: Buffer[] = [];
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));

  if (classIdParam === "all") {
    const classRows = await db.select({ id: classes.id, name: classes.name }).from(classes).orderBy(asc(classes.id));
    for (const classRow of classRows) {
      const folder = sanitizeFilename(classRow.name);
      const rows = await db.select({ name: students.name, attendance: students.attendanceNumber, storagePath: photos.storagePath, mimeType: photos.mimeType }).from(students).leftJoin(photos, eq(photos.studentId, students.id)).where(eq(students.classId, classRow.id)).orderBy(asc(students.attendanceNumber));
      for (const row of rows) if (row.storagePath) {
        try { const file = await fs.readFile(storagePath(row.storagePath)); archive.append(file, { name: `${folder}/${exportFilename(classRow.name, row.attendance, row.name, photoExportExtension(row.mimeType))}` }); } catch { /* missing files are skipped */ }
      }
    }
    await archive.finalize();
    return new Response(Buffer.concat(chunks), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="Semua Kelas.zip"` } });
  }

  const classId = Number(classIdParam);
  const [classRow] = await db.select({ name: classes.name }).from(classes).where(eq(classes.id, classId)).limit(1);
  if (!classRow) return Response.json({ error: "Kelas tidak ditemukan." }, { status: 404 });
  const rows = await db.select({ name: students.name, attendance: students.attendanceNumber, storagePath: photos.storagePath, mimeType: photos.mimeType }).from(students).leftJoin(photos, eq(photos.studentId, students.id)).where(eq(students.classId, classId)).orderBy(asc(students.attendanceNumber));
  for (const row of rows) if (row.storagePath) {
    try { const file = await fs.readFile(storagePath(row.storagePath)); archive.append(file, { name: exportFilename(classRow.name, row.attendance, row.name, photoExportExtension(row.mimeType)) }); } catch { /* missing files are skipped */ }
  }
  await archive.finalize();
  return new Response(Buffer.concat(chunks), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${sanitizeFilename(classRow.name)}.zip"` } });
}
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npm run typecheck` dan `npm run lint` di `/WebFoto/app`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/export/[classId]/route.ts
git commit -m "feat: support zip export for all classes"
```

---

### Task 5: Dashboard admin — label Indonesia, preview, tombol ZIP

**Files:**
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: `/api/admin/students` (rows dengan `studentId`), `/api/admin/export/{classId}`, `/api/photos/{studentId}`, `/api/admin/photos/{id}/status`.
- Produces: halaman admin dengan preview modal, label Indonesia, tombol ZIP adaptif.

- [ ] **Step 1: Modify page**

Ganti isi `src/app/admin/page.tsx` dengan versi berikut (perhatikan: `Row` menyertakan `studentId`):

```tsx
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Row = { id: number; studentId: string; name: string; attendanceNumber: number; className: string; status: string; uploadedAt: string | null; photoId: number | null };
type ClassRow = { id: number; name: string };
type Stats = { total: number; uploaded: number; blur: number; submitted: number; pending: number; submittedPercentage: number; pendingPercentage: number; pendingByClass: { className: string; total: number; pending: number }[] };
type PendingRow = { className: string; total: number; pending: number };

export default function AdminPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Stats>({ total: 0, uploaded: 0, blur: 0, submitted: 0, pending: 0, submittedPercentage: 0, pendingPercentage: 0, pendingByClass: [] });
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState<Row | null>(null);

  async function load() {
    const response = await fetch(`/api/admin/students?classId=${classId}&status=${status}&search=${encodeURIComponent(search)}`);
    if (!response.ok) return;
    const data = await response.json();
    setRows(data.rows); setStats(data.stats);
  }

  useEffect(() => { fetch("/api/classes").then((response) => response.json()).then(setClasses); }, []);
  useEffect(() => { load(); }, [classId, status]);

  useEffect(() => {
    if (!preview) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);

  async function mark(photoId: number | null, next: "blur" | "uploaded") {
    if (!photoId) return;
    await fetch(`/api/admin/photos/${photoId}/status`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: next }) });
    load();
  }

  async function copyNames(type: "pending" | "blur") {
    const text = await (await fetch(`/api/admin/names?status=${type}`)).text();
    await navigator.clipboard.writeText(text);
    setNotice(`Daftar ${type === "pending" ? "belum upload" : "foto blur"} berhasil disalin.`);
  }

  async function logout() { await fetch("/api/admin/logout", { method: "POST" }); location.href = "/admin/login"; }
  function exportZip() { location.href = classId ? `/api/admin/export/${classId}` : "/api/admin/export/all"; }
  function exportAllZip() { location.href = "/api/admin/export/all"; }

  return <main className="min-h-screen bg-slate-50">
    <header className="border-b border-blue-100 bg-white"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4"><div className="flex items-center gap-3"><Image src="/logo-sekolah.png" alt="Logo sekolah" width={48} height={48} className="rounded-xl object-contain" /><div><p className="text-xs font-bold uppercase tracking-widest text-blue-600">LDK SMK NEGERI 1 BATANG</p><h1 className="font-black text-slate-900">Pengumpulan Foto LDK 2026</h1></div></div><button onClick={logout} className="rounded-lg px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100">Keluar</button></div></header>
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="grid gap-4 sm:grid-cols-3"><Stat label="Total Siswa" value={stats.total} /><Stat label="Sudah Upload" value={stats.submitted} color="text-green-600" /><Stat label="Foto Blur" value={stats.blur} color="text-amber-600" /></div>
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Persentase Upload Keseluruhan</p>
          <div className="mt-4 flex items-center gap-5">
            <Donut submitted={stats.submittedPercentage} pending={stats.pendingPercentage} />
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-blue-600" /><span className="font-semibold text-slate-700">{stats.submittedPercentage}% sudah upload</span> <span className="text-slate-500">({stats.submitted} siswa)</span></p>
              <p className="flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-slate-200" /><span className="font-semibold text-slate-700">{stats.pendingPercentage}% belum upload</span> <span className="text-slate-500">({stats.pending} siswa)</span></p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Kelas Belum Upload Terbanyak</p>
          <div className="mt-4 space-y-2.5">{stats.pendingByClass.map((row) => <ClassBar key={row.className} row={row} max={stats.pendingByClass[0]?.pending ?? 0} />)}</div>
        </div>
      </section>
      <section className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 lg:flex-row"><select value={classId} onChange={(event) => setClassId(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="">Semua kelas</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-slate-200 px-3 py-2"><option value="all">Semua status</option><option value="pending">Belum upload</option><option value="uploaded">Sudah upload</option><option value="blur">Blur</option></select><input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === "Enter" && load()} placeholder="Cari nama atau NIS" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2" /><button onClick={() => copyNames("pending")} className="rounded-xl bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700">Copy Belum Upload</button><button onClick={() => copyNames("blur")} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-700">Copy Foto Blur</button><button onClick={exportZip} className="rounded-xl bg-blue-600 px-3 py-2 text-sm font-bold text-white">Download ZIP</button><button onClick={exportAllZip} className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-bold text-white">Download ZIP Semua</button></div>{notice && <p className="mt-3 text-sm font-semibold text-green-700">{notice}</p>}</section>
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-blue-50 text-xs uppercase text-blue-800"><tr><th className="px-4 py-3">Absen</th><th className="px-4 py-3">Nama</th><th className="px-4 py-3">Kelas</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Waktu Upload</th><th className="px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-bold">{String(row.attendanceNumber).padStart(2, "0")}</td><td className="px-4 py-3 font-semibold">{row.status === "uploaded" || row.status === "blur" ? <button onClick={() => setPreview(row)} className="font-bold text-blue-700 hover:underline">{row.name}</button> : <span>{row.name}</span>}</td><td className="px-4 py-3 text-slate-500">{row.className}</td><td className="px-4 py-3"><Status status={row.status} /></td><td className="px-4 py-3 text-slate-500">{row.uploadedAt ? new Date(row.uploadedAt).toLocaleString("id-ID") : "-"}</td><td className="px-4 py-3">{row.status === "uploaded" ? <button onClick={() => mark(row.photoId, "blur")} className="font-bold text-amber-700">Tandai Blur</button> : row.status === "blur" ? <button onClick={() => mark(row.photoId, "uploaded")} className="font-bold text-green-700">Tandai Valid</button> : <span className="text-slate-400">-</span>}</td></tr>)}</tbody></table></div>{!rows.length && <p className="p-10 text-center text-slate-500">Tidak ada data yang cocok.</p>}</section>
    </div>
    {preview && <PreviewModal row={preview} onClose={() => setPreview(null)} />}
  </main>;
}

function Stat({ label, value, color = "text-blue-600" }: { label: string; value: number; color?: string }) { return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-slate-500">{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></div>; }
function Donut({ submitted, pending }: { submitted: number; pending: number }) {
  const size = 120; const stroke = 14; const radius = (size - stroke) / 2; const circumference = 2 * Math.PI * radius;
  const filled = Math.max(0, Math.min(1, submitted / 100));
  return <div className="relative" style={{ width: size, height: size }}>
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#2563eb" strokeWidth={stroke} strokeDasharray={`${filled * circumference} ${circumference}`} strokeLinecap="round" />
    </svg>
    <div className="absolute inset-0 flex items-center justify-center"><p className="text-2xl font-black text-blue-700">{Math.round(submitted)}%</p></div>
  </div>;
}
function ClassBar({ row, max }: { row: PendingRow; max: number }) {
  const width = max ? Math.round((row.pending / max) * 100) : 0;
  const pct = row.total ? Math.round((row.pending / row.total) * 100) : 0;
  return <div>
    <div className="flex items-center justify-between text-xs font-semibold text-slate-600"><span>{row.className}</span><span>{row.pending} belum <span className="text-slate-400">({pct}%)</span></span></div>
    <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${width}%` }} /></div>
  </div>;
}
function Status({ status }: { status: string }) { const label = status === "blur" ? "⚠ Blur" : status === "uploaded" ? "✓ Sudah upload" : "○ Belum upload"; const style = status === "blur" ? "bg-amber-100 text-amber-800" : status === "uploaded" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${style}`}>{label}</span>; }
function PreviewModal({ row, onClose }: { row: Row; onClose: () => void }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4" onClick={onClose}>
    <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
      <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-xl font-black text-slate-900">{row.name}</h2><p className="text-sm text-slate-500">{row.className} — Absen {String(row.attendanceNumber).padStart(2, "0")} · <Status status={row.status} /></p></div><button onClick={onClose} aria-label="Tutup" className="rounded-lg px-3 py-1.5 text-sm font-bold text-slate-500 hover:bg-slate-100">✕</button></div>
      <img src={`/api/photos/${row.studentId}`} alt={`Foto ${row.name}`} className="mx-auto max-h-[75vh] rounded-xl object-contain" />
    </div>
  </div>;
}
```

- [ ] **Step 2: Verify typecheck + lint**

Run: `npm run typecheck` dan `npm run lint` di `/WebFoto/app`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: indonesian labels, photo preview, adaptive zip buttons"
```

---

### Task 6: Update dokumentasi

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update fitur**

Di `README.md`:

- Line 10 `- Foto diputar sesuai orientasi, diperkecil, dan disimpan sebagai WEBP.` → `- Foto diputar sesuai orientasi, diperkecil, dan disimpan sebagai JPEG (.jpg).`
- Line 14 `- Export ZIP berdasarkan kelas dengan nama `Kelas - Absen - Nama.webp`.` → `- Export ZIP per kelas atau seluruh kelas (folder per kelas) dengan nama `Kelas - Absen - Nama.jpg`.` dan tambahkan baris `- Preview foto langsung dari dashboard dengan mengklik nama siswa.`

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update feature list for jpeg, zip all, preview"
```

---

### Task 7: Verifikasi akhir menyeluruh

**Files:**
- None.

- [ ] **Step 1: Jalankan seluruh verifikasi**

Run di `/WebFoto/app`:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: semua PASS, build sukses (13 route + middleware).

- [ ] **Step 2: Laporan**

Ringkas hasil: jumlah test hijau, status typecheck/lint/build.