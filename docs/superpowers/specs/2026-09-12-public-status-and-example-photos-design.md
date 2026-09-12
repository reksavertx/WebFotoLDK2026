# Design: Public Status and Example Photos

Tanggal: 2026-09-12

## Tujuan

Menambahkan contoh foto benar/salah pada form publik, halaman status publik `/status` yang mengikuti mode event aktif, dan memperbarui dependency ke versi patch/minor yang kompatibel.

## Contoh Foto

- Salin `contoh-foto-benar.png` dan `contoh-foto-salah.png` ke `app/public/`.
- Tampilkan section `Contoh Foto` di halaman utama setelah persyaratan foto.
- Gunakan dua kartu responsive:
  - `Contoh Foto yang Benar`
  - `Contoh Foto yang Salah`
- Asset hanya untuk panduan publik; tidak dipakai sebagai submission dan tidak disimpan di database.

## Status Publik `/status`

- Halaman tidak membutuhkan login.
- Mengikuti judul, tahun, dan deskripsi konfigurasi event aktif.
- Tombol kembali menuju form publik dan tombol login admin.
- Tidak menampilkan foto, NIS, storage path, atau data admin.

### Mode Sesuai Daftar

- Kartu Total Siswa, Sudah Upload, Belum Upload, Progress.
- Progress keseluruhan.
- Grafik upload per kelas menggunakan SVG/CSS, tanpa library chart baru.
- Detail upload per kelas dengan pencarian kelas.
- Setiap siswa menampilkan nama, nomor absen, status, dan waktu upload.
- Siswa tanpa submission tetap ditampilkan sebagai Belum Upload.

### Mode Nama Bebas

- Kartu Total Submission, Sudah Upload, Foto Blur, Progress Submission.
- Daftar submission nama + status + waktu upload.
- Tidak menampilkan kategori Belum Upload karena tidak ada roster target.
- Tidak menampilkan kelas/NIS/foto.

## Public API

Tambah:

```text
GET /api/status
```

Response memuat `settings`, `mode`, `stats`, dan data kelas/submission sesuai mode aktif. Query hanya membaca data yang aman untuk publik.

## Dependency Update

- Update patch/minor kompatibel dari lockfile/npm audit versi saat ini.
- Kandidat utama: Next.js dan `eslint-config-next` ke patch `15.5.x`, `jose`, `mysql2`, `postcss`, `tsx`, `zod`, dan `@types/react-dom` ke versi wanted yang kompatibel.
- Tidak menaikkan major Next 16, TypeScript 7, Vitest 5, Sharp 0.35, atau Archiver 8 pada pekerjaan ini.
- Tidak menambah Chart.js; grafik memakai SVG/CSS.
- Jalankan test, typecheck, lint, dan build setelah update.

## Testing

- Test public status aggregation list mode: total, uploaded, pending, blur, per-class.
- Test public status free mode: submissions, blur, progress, tanpa data roster/NIS.
- Test endpoint tidak membutuhkan auth dan tidak mengembalikan path foto/NIS.
- Test parser/settings aktif untuk judul/tahun/deskripsi.
- Test paths asset contoh foto.
- Jalankan `npm test`, `npm run typecheck`, `npm run lint`, dan `npm run build`.

## Non-Goals

- Tidak menampilkan thumbnail/foto siswa di halaman publik.
- Tidak mengubah data submission melalui `/status`.
- Tidak membuat library chart baru.
- Tidak melakukan upgrade major dependency.
