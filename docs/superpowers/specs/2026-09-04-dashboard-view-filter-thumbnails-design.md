# Design: Dashboard View Filter and Photo Thumbnails

Tanggal: 2026-09-04

## Tujuan

Memperbaiki dashboard admin agar admin dapat memilih jenis submission yang dilihat, membuka data melalui accordion per kelas, memeriksa thumbnail secara massal, dan tetap membuka preview besar per foto. Perubahan juga memastikan mode form dapat berpindah dari `list` ke `free` walaupun submission mode daftar masih ada.

## Keputusan Produk

- Filter dashboard memiliki pilihan `Semua`, `Sesuai daftar`, dan `Nama bebas`.
- Filter dashboard hanya mengubah tampilan data admin; tidak mengubah mode form publik.
- Dashboard awal memilih `Semua` dan semua group tertutup.
- Submission mode daftar dikelompokkan berdasarkan kelas dalam accordion.
- Header group kelas menampilkan nama kelas, progres sudah/belum upload, persentase, dan tombol ZIP kelas.
- Isi group kelas berupa grid kartu siswa: thumbnail, nomor absen, nama, dan badge status.
- Siswa tanpa foto tetap ditampilkan dengan placeholder `Belum upload`.
- Nama dan thumbnail yang mempunyai foto membuka preview besar.
- Submission mode bebas dikelompokkan dalam satu group virtual `Nama Bebas`.
- Urutan kelas mengikuti urutan master CSV; siswa mengikuti nomor absen. Submission bebas mengikuti waktu upload.
- Filter status dan pencarian diterapkan pada kartu/group.
- Thumbnail memakai endpoint server-side `?variant=thumb`, tidak membuat file thumbnail permanen.
- Mode `free` dapat diaktifkan walaupun masih ada submission `list`; submission lama tetap aman.

## Mode Form

`POST /api/admin/settings/activate` hanya memindahkan draft ke active. Endpoint tidak boleh menghapus, memblokir, atau mensyaratkan kosongnya submission.

Saat mode aktif berubah:

- Submission lama tidak diubah.
- Upload baru divalidasi terhadap mode aktif di server.
- Mode `free` menerima nama saja dan membuat submission baru.
- Mode `list` menerima kelas + siswa dari roster dan melakukan upsert per siswa.

## API Dashboard

Endpoint utama:

```text
GET /api/admin/submissions?view=all|list|free&status=all|pending|uploaded|blur&classId=&search=
```

Response menyediakan:

```ts
{
  activeMode: "list" | "free",
  view: "all" | "list" | "free",
  stats: {
    total: number,
    submitted: number,
    pending: number,
    blur: number,
    submittedPercentage: number,
    pendingPercentage: number,
  },
  groups: Array<{
    type: "class" | "free",
    key: string,
    classId: number | null,
    title: string,
    total: number,
    submitted: number,
    pending: number,
    rows: SubmissionRow[],
  }>,
  rows: SubmissionRow[],
}
```

`view=list` hanya mengembalikan group kelas, `view=free` satu group `Nama Bebas`, dan `view=all` mengembalikan keduanya jika datanya tersedia. Pending list mode berasal dari siswa tanpa submission melalui kondisi foto `NULL`, bukan status database `pending`.

## Thumbnail dan Preview

Endpoint preview generik:

```text
GET /api/photos/submission/{submissionKey}
GET /api/photos/submission/{submissionKey}?variant=thumb
```

Keduanya memerlukan session admin. Variant `thumb` memproses gambar dengan sharp menjadi maksimal sekitar 240px dan mengembalikan mime type yang sesuai. Variant default mengembalikan foto besar untuk modal. File hasil thumbnail tidak disimpan permanen.

Jika foto hilang/gagal diproses, UI menampilkan placeholder error pada kartu/modal dan tidak merusak layout group lain.

## Dashboard UI

- Sidebar tetap menyediakan Dashboard, Pengaturan Form, Gunakan Kembali Web.
- Toolbar menampilkan selector view, selector status, search, Refresh, copy names, dan ZIP semua.
- Semua group tertutup saat pertama kali dibuka atau saat view berubah.
- Klik header group membuka/menutup satu accordion tanpa navigasi halaman.
- Tombol ZIP kelas pada header group tidak ikut membuka/menutup accordion.
- Kartu yang memiliki submission menampilkan thumbnail dari variant `thumb`.
- Kartu pending menampilkan placeholder dan tidak membuka preview.
- Preview besar menampilkan nama, kelas/ID, status, tombol tutup, backdrop close, Escape, dan error fallback.
- Grid responsif: 2 kolom mobile, 3-4 kolom desktop, thumbnail ukuran sedang.
- Mode aktif ditampilkan sebagai informasi, terpisah dari selector view.

## Testing

- Test aktivasi mode `free` saat submission `list` masih ada.
- Test dashboard view `list`, `free`, dan `all`.
- Test pengelompokan kelas/free, urutan, dan statistik.
- Test filter pending untuk siswa tanpa submission.
- Test nama bebas duplikat tidak tergabung menjadi satu row.
- Test endpoint thumbnail memerlukan admin, mengubah ukuran, dan mengembalikan content type.
- Test fallback file hilang tidak memutus response dashboard.
- Test helper UI menentukan group awal tertutup dan preview hanya untuk submission yang ada.
- Jalankan `npm test`, `npm run typecheck`, `npm run lint`, dan `npm run build`.

## Non-Goals

- Filter dashboard tidak mengubah mode form publik.
- Tidak membuat file thumbnail permanen.
- Tidak menambahkan navigasi prev/next pada preview.
- Tidak menghapus atau mengonversi submission lama saat mode berubah.
