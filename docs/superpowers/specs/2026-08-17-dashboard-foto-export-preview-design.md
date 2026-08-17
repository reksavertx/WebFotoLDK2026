# Design: Dashboard Admin — Format Foto, Export ZIP, dan Preview

Tanggal: 2026-08-17

## Ringkasan

Revisi dashboard admin WebFoto dengan empat perubahan utama:

1. Semua upload baru disimpan sebagai `.jpg` (konversi dari JPEG/PNG/WEBP), bukan `.webp`.
2. Export ZIP mendukung per kelas dan seluruh kelas (folder per kelas).
3. Label status "pending" menjadi "Belum upload", dan seluruh UI admin menggunakan bahasa Indonesia.
4. Preview foto langsung dengan mengklik nama siswa.

## Latar Belakang

- Saat ini `src/lib/storage.ts` mengonversi semua upload ke `.webp` (quality 82, resize max 1600px). Ini tidak diinginkan karena file ZIP berakhir dengan ekstensi `.webp`.
- Export ZIP hanya mendukung per kelas dan mewajibkan pemilihan kelas.
- Label status menampilkan "Pending" dalam bahasa Inggris.
- Belum ada cara melihat foto di dashboard tanpa mengunduh ZIP.

## Keputusan Desain

### 1. Format Penyimpanan Upload

Semua upload baru (JPEG, PNG, WEBP) dikonversi ke JPEG:

- Proses: `sharp(input).rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 })`.
- File disimpan sebagai `${studentId}.jpg`.
- `mimeType` di DB disimpan `image/jpeg`.
- Validasi signature input tetap menerima JPEG/PNG/WEBP.

File `.webp` yang sudah terupload sebelumnya tidak dikonversi ulang; tetap `.webp` (mimeType `image/webp` sudah tersimpan).

### 2. Helper Ekstensi Foto

Fungsi murni `photoExportExtension(mimeType)`:

- `image/webp` → `"webp"`
- selain itu → `"jpg"`

Digunakan untuk menentukan ekstensi nama file di ZIP.

### 3. Endpoint Serve Foto

`GET /api/photos/[studentId]`:

- Header `content-type` diambil dari `mimeType` di DB, bukan hardcode `image/webp`.

### 4. Export ZIP

`GET /api/admin/export/[classId]`:

- `classId === "all"`:
  - Export seluruh kelas.
  - Struktur folder per kelas: `X TJKT/01 - NAMA.jpg`.
  - Nama zip: `Semua Kelas.zip`.
- `classId` spesifik:
  - Tetap seperti sekarang: `X TJKT.zip`, nama file `X TJKT - 01 - NAMA.jpg`.
- Nama file di dalam ZIP selalu `{Kelas} - {Absen} - {Nama}.{ext}`, dengan `ext` dari `photoExportExtension`.
- Termasuk semua siswa yang punya foto (status `uploaded` dan `blur`); siswa tanpa foto dilewati.

### 5. Preview Foto

Di halaman admin:

- Klik nama siswa dengan status `uploaded`/`blur` membuka modal preview.
- Modal menampilkan `<img src="/api/photos/{studentId}">` plus info nama, kelas, absen, status.
- Ukuran modal besar (max-w-4xl).
- Tutup via tombol ✕, klik backdrop, atau tombol Escape.
- Nama siswa tanpa foto (belum upload) tidak bisa diklik.

### 6. Bahasa UI Admin

Seluruh label dashboard admin dalam bahasa Indonesia:

- Badge status: `Belum upload` / `Sudah upload` / `Blur`.
- Filter: `Semua status`, `Belum upload`, `Sudah upload`, `Blur`.
- Header tabel: `Waktu Upload`, `Aksi`.
- Tombol aksi: `Tandai Blur` / `Tandai Valid`.
- Nilai DB (enum) tidak berubah: `pending`, `uploaded`, `blur`.

### 7. Tombol ZIP Adaptif

- Tombol `Download ZIP`: jika kelas dipilih → ZIP kelas itu; jika "Semua kelas" → ZIP semua.
- Tombol `Download ZIP Semua` terpisah selalu tersedia.

## File yang Berubah

- `app/src/lib/storage.ts` — konversi ke JPEG, filename `.jpg`.
- `app/src/lib/domain.ts` — tambah `photoExportExtension`.
- `app/src/lib/domain.test.ts` / file test baru — test helper.
- `app/src/app/api/photos/[studentId]/route.ts` — content-type dinamis.
- `app/src/app/api/admin/export/[classId]/route.ts` — dukung `all`, ekstensi dinamis, ambil mimeType/originalFilename.
- `app/src/app/admin/page.tsx` — preview modal, label Indonesia, tombol ZIP.
- `README.md` — update dokumentasi.

## Data Flow

```
Upload:
  File → validasi signature → sharp.rotate().resize().jpeg(82) → ${studentId}.jpg (disk)
  DB: mimeType=image/jpeg

ZIP:
  Query foto (dengan mimeType) → untuk tiap foto: read file → append ke archive
  Nama: {Kelas} - {Absen} - {Nama}.{ext} (ext = photoExportExtension(mimeType))

Preview:
  Klik nama → modal → GET /api/photos/{studentId} (content-type dari mimeType)
```

## Error Handling

- File hilang di disk saat ZIP → dilewati (tidak mengagalkan export).
- Siswa tanpa foto → dilewati di ZIP; nama tidak diklik di preview.
- Unauthorized → semua endpoint admin tetap menolak.

## Testing

- Test unit `photoExportExtension`:
  - `image/webp` → `webp`
  - `image/jpeg` → `jpg`
  - `image/png` → `jpg`
- Verifikasi: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Non-Goals

- Tidak ada migrasi ulang file `.webp` lama.
- Tidak mengubah enum status di DB.
- Tidak menambah dependency baru.
