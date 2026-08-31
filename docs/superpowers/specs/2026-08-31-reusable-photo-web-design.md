# Design: Admin Sidebar, Form Modes, and Reusable Photo Events

Tanggal: 2026-08-31

## Tujuan

Mengubah dashboard admin WebFoto menjadi area admin dengan sidebar, menambahkan mode form sesuai daftar atau nama bebas, dan menyediakan alur aman untuk memakai kembali aplikasi pada event/angkatan berikutnya.

## Keputusan Produk

- Admin memiliki tiga menu: Dashboard Data Foto, Pengaturan Form, dan Gunakan Kembali Web.
- Sidebar desktop berada di kiri; pada mobile sidebar menjadi drawer buka/tutup.
- Setiap menu memiliki URL terpisah: `/admin`, `/admin/form`, dan `/admin/reuse`.
- Mode awal database baru adalah `Sesuai daftar`.
- Pengaturan form menggunakan draft dan konfigurasi aktif. Form publik hanya membaca konfigurasi aktif.
- Judul event, tahun, dan deskripsi dapat diubah. Judul dan tahun wajib; deskripsi opsional.
- Mode `Sesuai daftar` menampilkan pilihan kelas dan nama dari CSV; nama tidak dapat diketik.
- Mode `Nama bebas` hanya menampilkan input nama; kelas tidak ditampilkan.
- Nama bebas wajib, di-trim, dan panjangnya 3-160 karakter. Nama duplikat diperbolehkan; setiap submit menjadi submission baru.
- Dashboard dan preview tetap tersedia untuk mode bebas. ZIP mode bebas menggunakan ID submission dan nama.
- Penggantian mode diperbolehkan walaupun sudah ada foto.
- Dashboard memiliki tombol Refresh manual, ringkasan statistik, chart keseluruhan, chart per kelas, filter, pencarian, preview, dan export ZIP.
- Chart per kelas membandingkan jumlah sudah upload dan belum upload. Saat mode bebas aktif, chart per kelas disembunyikan.
- Filter `Belum upload` harus benar-benar mencari siswa tanpa submission foto.
- `Hapus Semua Data Foto` menghapus record submission, file `data/uploads`, dan file `data/generated`; roster, admin, dan pengaturan tetap dipertahankan.
- Penghapusan membutuhkan konfirmasi modal dan input tepat `HAPUS`; backup otomatis tidak dibuat.
- Penggantian CSV memakai format `NO,NIS,NISN,NAMA,KELAS`, preview, dan konfirmasi tepat `GANTI DATA`.
- Penggantian CSV ditolak jika masih ada submission foto. Admin harus menghapus foto terlebih dahulu.
- Penggantian CSV menghapus roster kelas/siswa lama secara total, menerapkan CSV baru, dan otomatis mengaktifkan mode `Sesuai daftar`.
- Semua endpoint admin memerlukan session. Operasi reset dan penggantian roster menggunakan POST dan validasi server-side.

## Model Data

### `event_settings`

Singleton dengan `id=1`, menyimpan draft dan konfigurasi aktif:

- `draftMode`, `activeMode`: `list` atau `free`
- `draftTitle`, `activeTitle`
- `draftYear`, `activeYear`
- `draftDescription`, `activeDescription`
- timestamps

Seed membuat nilai default dari konfigurasi event LDK saat ini. Endpoint publik hanya mengembalikan konfigurasi aktif.

### `photo_submissions`

Menggantikan konsep tabel `photos` lama dengan satu model generik:

- `id` auto-increment
- `submissionKey` unik untuk nama file dan preview
- `sourceMode`: `list` atau `free`
- `studentId` nullable, hanya untuk mode daftar
- `name` wajib sebagai snapshot nama saat submit
- `className`, `attendanceNumber`, dan `nis` nullable sebagai snapshot data daftar
- `storagePath`, `originalFilename`, `mimeType`, `fileSize`
- `status`: `uploaded` atau `blur`
- `uploadedAt`, `updatedAt`

Mode daftar memiliki satu submission per siswa melalui unique nullable `studentId`. Mode bebas selalu insert row baru dengan `studentId=NULL`.

Karena aplikasi masih tahap build dan reset diperbolehkan, migration mengganti tabel `photos` lama ke model baru tanpa kewajiban memindahkan data lama. File lama dapat dibersihkan melalui menu Gunakan Kembali Web.

## Alur Upload

1. Halaman publik mengambil konfigurasi aktif.
2. Mode daftar mengambil kelas dan siswa dari master CSV.
3. Mode bebas hanya menampilkan input nama.
4. API upload memvalidasi mode aktif di server, bukan mempercayai pilihan client.
5. File divalidasi, diputar, di-resize maksimal 1600px, dan dikonversi JPEG quality 82.
6. Mode daftar melakukan upsert berdasarkan siswa; mode bebas membuat submission baru.
7. Pesan sukses tetap menampilkan ucapan terima kasih.

## Dashboard

Dashboard `/admin` menggunakan layout sidebar dan konten utama.

Mode daftar:

- Statistik total, sudah upload, belum upload, dan blur.
- Persentase keseluruhan.
- Chart dua warna per kelas: sudah upload vs belum upload.
- Tabel siswa dengan filter kelas/status, pencarian, preview nama, dan status.

Mode bebas:

- Statistik total submission dan status blur.
- Tabel submission dengan ID, nama, status, waktu upload, dan preview.
- Chart per kelas disembunyikan karena submission tidak memiliki kelas.

Refresh memuat ulang konfigurasi aktif dan data dashboard. Loading, unauthorized, dan error API ditampilkan secara jelas.

Preview hanya tersedia untuk submission yang memiliki file, memakai endpoint admin terlindungi, dan ditutup melalui tombol, backdrop, atau Escape.

## Pengaturan Form

Halaman `/admin/form` memuat draft konfigurasi dan konfigurasi aktif. Admin dapat:

- Memilih mode `Sesuai daftar` atau `Nama bebas`.
- Mengubah judul, tahun, dan deskripsi.
- Menyimpan draft.
- Mengaktifkan draft dengan konfirmasi.

Perubahan konfigurasi aktif berlaku langsung ke form publik setelah tombol Aktifkan ditekan.

## Gunakan Kembali Web

Halaman `/admin/reuse` memiliki dua panel terpisah.

### Hapus Data Foto

- Menampilkan jumlah submission dan estimasi file yang akan dihapus.
- Meminta input `HAPUS`.
- POST ke endpoint reset yang menghapus record submission, file upload, dan ZIP generated.
- Mengembalikan jumlah record/file berhasil dan gagal.
- Tidak menghapus master siswa, kelas, admin, atau konfigurasi event.

### Ganti Data Siswa

- Upload CSV format standar.
- Preview jumlah baris, kelas, dan validasi.
- Setelah preview, admin mengetik `GANTI DATA`.
- Server memeriksa tidak ada submission foto.
- Transaction menghapus master siswa/kelas lama dan memasukkan CSV baru.
- Mode aktif otomatis menjadi `list`.
- Kegagalan validasi atau database tidak boleh meninggalkan roster setengah terpasang.

## Export ZIP

- Mode daftar per kelas memakai nama `Kelas - Absen - Nama.jpg`.
- Export semua kelas memakai folder kelas dan nama file yang sama.
- Mode bebas memakai `submissionKey - Nama.jpg`.
- Semua submission yang memiliki file, termasuk status blur, ikut diexport.
- Submission tanpa file dilewati.
- File ZIP tidak di-buffer seluruhnya bila implementasi streaming dapat dilakukan tanpa kompleksitas berlebihan; error archive ditangani dengan aman.

## Keamanan dan Validasi

- Semua route admin memakai `requireAdmin()`.
- Mode aktif dibaca server-side saat upload.
- Nama bebas di-trim dan dibatasi 3-160 karakter.
- Token `HAPUS` dan `GANTI DATA` wajib cocok persis.
- Reset dan penggantian roster tidak menerima GET.
- Path file tetap melalui traversal guard.
- Pesan error tidak membocorkan secret atau query database.

## Testing

- Unit test mode dan validasi nama bebas.
- Unit test statistik submission dan pengelompokan chart.
- Unit test format nama export mode daftar/bebas.
- Test endpoint konfigurasi aktif.
- Test upload mode list dan free.
- Test reset menolak token salah dan menghapus record/file dengan token benar.
- Test CSV preview/commit, penolakan jika foto masih ada, dan penggantian roster atomik.
- Test akses admin untuk endpoint dashboard, settings, reset, dan roster.
- Jalankan `npm test`, `npm run typecheck`, `npm run lint`, dan `npm run build`.

## Non-Goals

- Tidak ada login siswa.
- Tidak ada backup otomatis sebelum reset.
- Tidak ada audit log admin pada fase ini.
- Tidak ada dukungan pemetaan CSV arbitrer; format CSV tetap standar.
- Tidak ada navigasi prev/next pada modal preview.
