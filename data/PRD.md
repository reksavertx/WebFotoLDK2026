# PRD — Sistem Pengumpulan dan Manajemen Foto Siswa

**Versi:** 1.0
**Status:** Draft untuk implementasi
**Target:** Website internal/eksternal sekolah untuk pengumpulan, validasi, dan pengelolaan foto siswa
**Target pengguna:** Siswa dan Admin/Petugas Sekolah

---

# 1. Ringkasan Produk

Sistem ini adalah website untuk mengotomatisasi proses pengumpulan foto siswa dalam satu sekolah.

Siswa tidak diperbolehkan mengetik nama secara manual. Siswa memilih identitasnya dari daftar siswa yang telah disediakan sekolah, kemudian mengunggah foto.

Admin dapat melihat seluruh status pengumpulan foto, mengetahui siswa yang belum mengunggah foto, menandai foto yang blur/tidak sesuai, serta menyalin daftar nama siswa berdasarkan status tersebut.

Sistem juga menyediakan export foto dalam bentuk ZIP berdasarkan kelas dengan nama file yang mengikuti format:

`Kelas - Nomor Absen - Nama Siswa.ext`

Sistem ini **tidak menangani proses desain grafis**. Design automation seperti Canva, Figma, atau custom renderer merupakan sistem terpisah yang nantinya dapat mengambil output dari sistem ini melalui API/export.

---

# 2. Tujuan Produk

## 2.1 Tujuan utama

Menghilangkan proses manual yang dilakukan guru/admin dalam:

* Mengumpulkan foto siswa.
* Mencocokkan foto dengan siswa.
* Mengetahui siapa yang belum mengumpulkan foto.
* Mengetahui foto mana yang perlu diperbaiki.
* Mengumpulkan foto berdasarkan kelas.
* Memberi nama file foto satu per satu.
* Menyiapkan data yang nantinya digunakan oleh sistem design automation.

## 2.2 Tujuan teknis

Sistem harus:

* Mudah digunakan oleh siswa.
* Mudah digunakan oleh admin.
* Mampu menangani sekitar 1.000 siswa dalam satu hari.
* Mampu menangani upload foto dalam jumlah besar.
* Memiliki penyimpanan foto yang persistent.
* Dapat dijalankan pada server sekolah.
* Mudah dikembangkan menggunakan AI coding agent seperti OpenCode.
* Memiliki struktur yang mudah dipisahkan dari sistem design automation.
* Menyediakan API/export yang dapat digunakan sistem lain.

---

# 3. Non-Goals

Fitur berikut **tidak termasuk dalam versi pertama**:

* Editor foto profesional.
* Sistem desain grafis.
* Canva integration langsung.
* Figma integration langsung.
* AI face recognition.
* AI otomatis menentukan apakah foto blur.
* Sistem akademik sekolah lengkap.
* Sistem absensi harian.
* Sistem nilai.
* Pembayaran.
* Chat antara siswa dan admin.

Design automation akan dibuat sebagai sistem terpisah.

---

# 4. Aktor Sistem

## 4.1 Siswa

Siswa dapat:

* Melihat form pengumpulan foto.
* Memilih kelas.
* Memilih nama dari daftar siswa.
* Mengunggah foto.
* Mengganti foto yang sebelumnya telah diunggah.
* Melihat hasil/status pengiriman.

Siswa tidak dapat:

* Membuat nama siswa baru.
* Mengubah nama.
* Mengubah kelas.
* Mengubah nomor absen.
* Melihat foto siswa lain.
* Mengakses dashboard admin.

## 4.2 Admin

Admin dapat:

* Login ke dashboard.
* Melihat seluruh siswa.
* Filter berdasarkan kelas.
* Melihat status upload.
* Preview foto.
* Menandai foto sebagai blur/tidak sesuai.
* Mengembalikan status foto menjadi valid.
* Melihat siswa yang belum upload.
* Melihat siswa yang fotonya blur.
* Copy daftar nama.
* Mengganti atau menghapus foto jika diperlukan.
* Export foto berdasarkan kelas.
* Download ZIP.
* Import/update daftar siswa.
* Melihat statistik pengumpulan.
* Mengakses endpoint/export data untuk sistem lain.

---

# 5. User Flow Siswa

## 5.1 Upload pertama

Flow:

1. Siswa membuka halaman upload.
2. Siswa memilih kelas.
3. Sistem menampilkan daftar siswa dalam kelas tersebut.
4. Siswa memilih namanya.
5. Siswa memilih file foto.
6. Sistem melakukan validasi.
7. Sistem menampilkan preview foto.
8. Siswa menekan Submit.
9. Backend menyimpan foto.
10. Database diperbarui.
11. Sistem menampilkan status berhasil.

Contoh UI:

```text
Kelas
[ XI TJKT 1 ▼ ]

Nama
[ Ahmad Fauzan ▼ ]

Foto
[ Pilih Foto ]

Preview
┌────────────────┐
│                │
│      FOTO      │
│                │
└────────────────┘

[ SUBMIT ]
```

---

# 6. User Flow Upload Ulang

Siswa diperbolehkan mengunggah foto lagi.

Ketika siswa mengunggah foto baru:

1. Sistem menemukan record siswa berdasarkan student ID.
2. Foto lama dihapus/digantikan.
3. Foto baru disimpan.
4. `photo_status` diperbarui menjadi `uploaded`.
5. Jika sebelumnya berstatus `blur`, status otomatis kembali menjadi `uploaded`.
6. Timestamp upload diperbarui.

Sistem tidak boleh membuat record siswa baru hanya karena upload ulang.

Satu siswa memiliki maksimal satu foto aktif.

---

# 7. Identitas Siswa

Identitas siswa harus berasal dari database.

Jangan menggunakan nama yang diketik bebas oleh siswa.

Minimal data siswa:

```text
student_id
name
class
attendance_number
```

Contoh:

```json
{
  "student_id": "STU-001",
  "name": "Ahmad Fauzan",
  "class": "XI TJKT 1",
  "attendance_number": 7
}
```

`student_id` harus menjadi identifier utama dan bersifat unik.

Nama, kelas, dan nomor absen tidak boleh dijadikan primary key.

---

# 8. Status Foto

Setiap siswa memiliki status foto.

Gunakan status:

```text
pending
uploaded
blur
```

Makna:

### pending

Siswa belum mengunggah foto aktif.

### uploaded

Siswa memiliki foto yang diterima dan belum ditandai sebagai blur.

### blur

Admin menandai foto sebagai blur/tidak sesuai sehingga siswa harus mengunggah ulang.

---

# 9. Aturan Foto

Sistem harus memvalidasi:

* File benar-benar merupakan image.
* MIME type sesuai.
* File extension sesuai.
* Ukuran file tidak melebihi batas.
* File kosong ditolak.
* File rusak ditolak.

Format yang diperbolehkan minimal:

```text
JPEG / JPG
PNG
WEBP
```

Batas ukuran default:

```text
5 MB per foto
```

Ukuran maksimum harus mudah dikonfigurasi.

Server dapat melakukan image processing seperti:

* Resize.
* Compression.
* Orientation correction.
* Normalisasi image format.

Jangan menyimpan file hasil upload dengan nama asli siswa.

Gunakan nama internal berdasarkan `student_id` atau UUID.

Contoh:

```text
/data/uploads/STU-001.jpg
```

Bukan:

```text
/data/uploads/Ahmad Fauzan.jpg
```

---

# 10. Penyimpanan File

Struktur storage yang direkomendasikan:

```text
/data/
├── uploads/
│   ├── STU-001.jpg
│   ├── STU-002.jpg
│   └── ...
│
└── generated/
    ├── job-001/
    └── job-002/
```

Database menyimpan metadata/path:

```text
photo_path
```

Database tidak menyimpan binary image sebagai BLOB kecuali terdapat alasan teknis yang kuat.

---

# 11. Dashboard Admin

Dashboard harus menyediakan ringkasan statistik.

Contoh:

```text
Total Siswa       1,000
Sudah Upload        920
Belum Upload         55
Foto Blur            25
```

Statistik harus dapat difilter berdasarkan kelas.

Contoh:

```text
Filter Kelas
[ XI TJKT 1 ▼ ]
```

---

# 12. Tabel Admin

Kolom minimum:

```text
No
Nomor Absen
Nama
Kelas
Foto
Status
Upload Time
Action
```

Contoh:

```text
| No | Absen | Nama          | Kelas       | Foto     | Status   | Action |
|----|-------|---------------|-------------|----------|----------|--------|
| 1  | 01    | Ahmad Fauzan  | XI TJKT 1   | Preview  | Uploaded | Blur   |
| 2  | 02    | Budi Santoso  | XI TJKT 1   | Preview  | Blur     | Valid  |
| 3  | 03    | Citra         | XI TJKT 1   | -        | Pending  | -      |
```

---

# 13. Filter Admin

Admin minimal dapat filter:

* Kelas.
* Status.
* Search nama.
* Nomor absen.

Status filter:

```text
All
Uploaded
Pending
Blur
```

---

# 14. Copy Nama Siswa

Admin membutuhkan tombol:

```text
Copy Belum Upload
```

dan:

```text
Copy Foto Blur
```

Hasil copy harus berupa daftar nama yang mudah dikirim melalui WhatsApp/Telegram.

Contoh:

```text
Ahmad Fauzan
Budi Santoso
Citra
Dimas
```

Urutkan berdasarkan nomor absen.

Sistem juga boleh menyediakan mode:

```text
01. Ahmad Fauzan
02. Budi Santoso
03. Citra
```

---

# 15. Preview Foto

Admin dapat membuka foto dalam ukuran lebih besar.

Preview tidak boleh mengubah status foto secara otomatis.

Status hanya berubah jika admin secara eksplisit menekan action yang sesuai.

---

# 16. Penandaan Blur

Admin dapat menekan:

```text
Mark as Blur
```

Kemudian:

```text
photo_status = blur
```

Siswa akan terlihat sebagai foto bermasalah.

Admin juga dapat:

```text
Mark as Valid
```

yang mengubah:

```text
blur → uploaded
```

Jika siswa upload ulang, status otomatis:

```text
blur → uploaded
```

---

# 17. Export ZIP

Admin dapat memilih kelas:

```text
XI TJKT 1
```

kemudian:

```text
[ Download ZIP ]
```

Sistem membuat ZIP yang hanya berisi foto siswa yang tersedia.

Nama file hasil export:

```text
<Kelas> - <Absen> - <Nama>.<ext>
```

Contoh:

```text
XI TJKT 1 - 01 - Ahmad Fauzan.jpg
XI TJKT 1 - 02 - Budi Santoso.jpg
XI TJKT 1 - 03 - Citra.jpg
```

Nama ZIP:

```text
XI TJKT 1.zip
```

Urutan file di ZIP berdasarkan nomor absen.

---

# 18. Export dengan Siswa Belum Upload

Jika terdapat siswa yang belum upload, sistem tidak boleh gagal.

Admin harus mendapatkan warning:

```text
5 siswa belum memiliki foto.
```

Contoh:

```text
Belum upload:
01 - Ahmad Fauzan
07 - Budi Santoso
12 - Citra
```

Sistem tetap dapat membuat ZIP berisi siswa yang tersedia.

Alternatif yang lebih baik: tampilkan confirmation sebelum generate:

```text
31 dari 36 siswa memiliki foto.

5 siswa belum upload.

[Cancel]
[Generate 31 Foto]
```

---

# 19. Export Data untuk Sistem Lain

Sistem harus memiliki kemampuan export data yang dapat digunakan oleh design automation.

Format minimal:

CSV dan JSON.

Contoh JSON:

```json
{
  "class": "XI TJKT 1",
  "students": [
    {
      "student_id": "STU-001",
      "name": "Ahmad Fauzan",
      "attendance": 1,
      "class": "XI TJKT 1",
      "photo_url": "/api/photos/STU-001"
    }
  ]
}
```

Endpoint dapat berupa konsep:

```text
GET /api/export/class/:classId
```

API tidak boleh mengekspos data lebih banyak dari yang dibutuhkan.

---

# 20. Design Automation Integration

Design automation sengaja dipisahkan dari sistem ini.

Arsitektur:

```text
Student Photo System
        │
        │ API / JSON / CSV / ZIP
        ▼
Design Automation System
        │
        ├── Canva
        ├── Figma
        └── Custom Renderer
```

Sistem design automation tidak boleh mengubah database utama secara langsung.

Sistem eksternal sebaiknya mengambil data melalui API/export resmi.

Tujuannya:

* Memisahkan tanggung jawab.
* Memudahkan pengembangan.
* Menghindari ketergantungan terhadap Canva/Figma.
* Memungkinkan penggantian design engine tanpa mengubah website pengumpulan foto.

---

# 21. Import Daftar Siswa

Admin harus dapat memasukkan daftar siswa.

Versi pertama dapat menggunakan CSV.

Contoh:

```csv
student_id,name,class,attendance_number
STU-001,Ahmad Fauzan,XI TJKT 1,1
STU-002,Budi Santoso,XI TJKT 1,2
STU-003,Citra,XI TJKT 1,3
```

Admin dapat:

```text
Upload CSV
```

Sistem harus melakukan validation:

* Header valid.
* Tidak ada student ID duplicate.
* Nomor absen valid.
* Nama tidak kosong.
* Kelas tidak kosong.
* Nomor absen tidak duplicate dalam kelas.

Import sebaiknya memiliki preview sebelum data benar-benar disimpan.

---

# 22. Database

Gunakan PostgreSQL.

Minimal tabel:

## students

```text
id
student_id
name
class_id
attendance_number
created_at
updated_at
```

## classes

```text
id
name
created_at
updated_at
```

## photos

```text
id
student_id
storage_path
original_filename
mime_type
file_size
status
uploaded_at
updated_at
```

## admin_users

```text
id
username/email
password_hash
created_at
updated_at
```

Jika diperlukan:

## export_jobs

```text
id
class_id
status
total_items
completed_items
failed_items
output_path
created_at
completed_at
```

---

# 23. Relasi Database

Konsep:

```text
classes
   │
   └── students
          │
          └── photos
```

Satu `class` memiliki banyak `students`.

Satu `student` memiliki maksimal satu `active photo`.

Gunakan foreign key.

Gunakan unique constraint untuk:

```text
student_id
```

dan:

```text
(class_id, attendance_number)
```

---

# 24. Authentication

Admin dashboard wajib menggunakan authentication.

Siswa tidak membutuhkan akun pada versi pertama.

Sistem harus memastikan endpoint admin tidak dapat diakses oleh user biasa.

Contoh:

```text
/public
/admin
/api/admin/*
```

Endpoint admin harus protected.

Password admin harus disimpan menggunakan password hashing yang aman.

Jangan menyimpan plaintext password.

---

# 25. Security Requirements

Security adalah requirement wajib.

Minimal:

* HTTPS.
* Authentication untuk admin.
* Authorization untuk endpoint admin.
* Rate limiting.
* Upload size limit.
* MIME type validation.
* Extension validation.
* File signature/magic byte validation jika memungkinkan.
* Filename tidak berasal langsung dari user.
* SQL injection prevention menggunakan ORM/parameterized queries.
* XSS prevention.
* CSRF protection jika relevan dengan authentication architecture.
* Jangan expose PostgreSQL ke internet.
* Jangan expose private filesystem secara langsung.
* Jangan menggunakan nama file user sebagai path storage.
* Validasi semua input dari client.
* Jangan menyimpan secret di source code.
* Gunakan environment variables untuk credentials.

---

# 26. Privacy

Foto siswa merupakan data yang harus diperlakukan sebagai data privat.

Maka:

* Foto tidak boleh dapat di-list secara publik.
* URL foto harus diproteksi atau menggunakan mekanisme akses yang sesuai.
* Foto hanya dapat diakses oleh siswa sesuai kebutuhan dan admin yang berwenang.
* Jangan expose directory `/uploads`.
* Jangan menaruh foto siswa dalam folder public static secara langsung kecuali memang sudah dipertimbangkan secara keamanan.

---

# 27. Performance

Target operasional:

* Sekitar 1.000 siswa/hari.
* Mendukung burst upload.
* UI tetap responsif saat upload berlangsung.
* Upload besar tidak boleh membuat database overload.
* Foto tidak disimpan sebagai database BLOB.
* Gunakan pagination pada dashboard.
* Jangan mengambil seluruh foto sekaligus.
* Gunakan thumbnail untuk tabel admin bila memungkinkan.
* Gunakan original image hanya saat preview besar.

Admin table harus menggunakan pagination atau virtualisation jika diperlukan.

---

# 28. Deployment

Target deployment adalah server sekolah.

Environment:

```text
Linux Server
Docker
Docker Compose
```

Arsitektur minimal:

```text
Internet
   │
   ▼
Nginx
   │
   ▼
Next.js / Application
   │
   ├── PostgreSQL
   └── Persistent Storage
```

Docker services minimal:

```text
app
postgres
nginx
```

Application source code berada pada host project directory.

Project directory:

```text
/home/projectSchool
```

Recommended structure:

```text
/home/projectSchool/
├── app/
├── students/
├── data/
├── database/
├── nginx/
├── docker-compose.yml
├── .env
└── README.md
```

---

# 29. Docker Storage

Bind mount/persistent volume harus digunakan.

Concept:

```text
/home/projectSchool/app
        ↕
container:/app
```

```text
/home/projectSchool/data
        ↕
container:/data
```

```text
/home/projectSchool/students
        ↕
container:/students
```

PostgreSQL harus memiliki persistent volume.

Container recreation tidak boleh menghapus:

* Database.
* Foto siswa.
* Generated files.

---

# 30. OpenCode Development Environment

Project harus mudah dikerjakan oleh AI coding agent seperti OpenCode.

Repository/project root:

```text
/home/projectSchool
```

OpenCode harus dapat membaca:

* PRD.
* Source code.
* Configuration.
* Database schema.
* Documentation.

Buat file:

```text
/home/projectSchool/PRD.md
```

File tersebut merupakan specification utama.

OpenCode harus membaca PRD sebelum melakukan implementasi.

AI coding agent boleh membuat/ubah source code yang diperlukan, tetapi harus mempertahankan struktur project dan requirement yang ditulis di PRD.

---

# 31. Environment Variables

Secret harus berada di `.env` atau secret management.

Contoh:

```env
DATABASE_URL=
ADMIN_SECRET=
APP_URL=
UPLOAD_MAX_SIZE=
```

`.env` production tidak boleh dimasukkan ke Git repository.

Sediakan:

```text
.env.example
```

untuk dokumentasi.

---

# 32. Observability

Minimal sistem memiliki logging:

* Login admin.
* Upload foto.
* Upload ulang.
* Foto ditandai blur.
* Foto dihapus.
* Import siswa.
* Export ZIP.
* Error upload.
* Error database.

Jangan log password atau secret.

---

# 33. Backup

Backup harus mencakup:

1. PostgreSQL.
2. `/data/uploads`.
3. `/data/generated` jika hasil masih diperlukan.

Source code tidak harus dibackup menggunakan metode yang sama jika sudah berada di Git.

Backup database harus dapat direstore.

---

# 34. UI/UX Requirements

UI harus sederhana karena target pengguna adalah siswa dan guru.

Prioritas:

1. Mobile friendly.
2. Tombol jelas.
3. Form sesingkat mungkin.
4. Informasi status mudah dipahami.
5. Error message jelas.
6. Jangan menggunakan istilah teknis kepada siswa.

Contoh pesan:

```text
Foto berhasil diunggah.
```

bukan:

```text
HTTP 201 Created.
```

Error:

```text
Ukuran foto terlalu besar.
Maksimal ukuran file adalah 5 MB.
```

---

# 35. Student Page

Halaman siswa minimal terdiri dari:

```text
Logo sekolah
Judul
Instruksi

Kelas
Nama

Upload foto

Preview

Submit
```

Setelah upload:

```text
✓ Foto berhasil disimpan.

Anda masih dapat mengganti foto jika diperlukan.
```

Jika siswa sudah pernah upload dan mengakses form lagi:

```text
Anda sudah memiliki foto.
Upload foto baru untuk mengganti foto sebelumnya.
```

---

# 36. Admin Page

Admin dashboard minimal terdiri dari:

### Header

```text
Student Photo Management
Admin
Logout
```

### Statistic

```text
Total
Uploaded
Pending
Blur
```

### Filter

```text
Class
Status
Search
```

### Actions

```text
Copy Pending Names
Copy Blur Names
Export ZIP
Import Students
```

### Table

Data siswa.

---

# 37. Accessibility

Gunakan:

* Label yang jelas.
* Keyboard accessibility.
* Kontras warna yang baik.
* Jangan menjadikan warna satu-satunya indikator status.

Contoh:

```text
✓ Uploaded
⚠ Blur
○ Pending
```

bukan hanya warna hijau/kuning/merah.

---

# 38. Error Handling

Semua error harus ditangani dengan baik.

Kasus minimal:

* File terlalu besar.
* File bukan image.
* File rusak.
* Student tidak ditemukan.
* Database error.
* Storage error.
* Unauthorized.
* Rate limited.
* Export gagal.

Jangan menampilkan stack trace server kepada user.

---

# 39. API Design

Gunakan REST API atau route handler yang jelas.

Contoh:

```text
GET    /api/classes
GET    /api/classes/:id/students

POST   /api/photos/upload
PUT    /api/photos/:studentId
DELETE /api/photos/:studentId

GET    /api/admin/students
PATCH  /api/admin/photos/:id/status

GET    /api/admin/export/:classId
GET    /api/export/class/:classId
```

Endpoint boleh disesuaikan dengan framework, tetapi prinsip separation of concerns harus dipertahankan.

---

# 40. Idempotency Upload

Upload ulang siswa yang sama harus menghasilkan satu foto aktif.

Jangan menghasilkan:

```text
student A
photo 1
photo 2
photo 3
photo 4
```

Jika hanya satu foto aktif yang dibutuhkan.

Gunakan replacement/upsert logic.

---

# 41. File Naming

Internal storage:

```text
STU-001.jpg
```

atau UUID.

Export:

```text
XI TJKT 1 - 01 - Ahmad Fauzan.jpg
```

Jika terdapat karakter yang tidak valid dalam filename, lakukan sanitization.

---

# 42. Testing Requirements

AI harus membuat testing minimal untuk:

### Unit test

* Student validation.
* File validation.
* Status transition.
* Filename generation.

### Integration test

* Upload foto.
* Replace photo.
* Mark blur.
* Import CSV.
* Generate ZIP.

### Security test

* Unauthorized admin endpoint.
* Oversized upload.
* Invalid file type.
* Path traversal attempt.
* Invalid student ID.

---

# 43. Acceptance Criteria

Project dianggap MVP selesai jika:

### Student

* [ ] Siswa dapat memilih kelas.
* [ ] Siswa dapat memilih nama.
* [ ] Siswa tidak dapat mengetik identitas secara bebas.
* [ ] Siswa dapat upload foto.
* [ ] Foto tervalidasi.
* [ ] Siswa dapat upload ulang.
* [ ] Foto lama tergantikan.
* [ ] Status otomatis berubah menjadi uploaded.

### Admin

* [ ] Admin dapat login.
* [ ] Admin dapat melihat jumlah total siswa.
* [ ] Admin dapat melihat siswa pending.
* [ ] Admin dapat melihat siswa blur.
* [ ] Admin dapat melihat preview foto.
* [ ] Admin dapat menandai blur.
* [ ] Admin dapat mengembalikan blur menjadi valid.
* [ ] Admin dapat copy nama pending.
* [ ] Admin dapat copy nama blur.
* [ ] Admin dapat filter berdasarkan kelas/status/search.

### Export

* [ ] Admin dapat memilih kelas.
* [ ] Sistem membuat ZIP.
* [ ] File menggunakan format kelas + absen + nama.
* [ ] File diurutkan berdasarkan absen.
* [ ] Missing photo tidak menyebabkan seluruh export gagal.
* [ ] Sistem memberikan warning untuk siswa yang belum upload.

### Data

* [ ] Daftar siswa dapat diimport.
* [ ] Student ID unik.
* [ ] Nomor absen unik dalam kelas.
* [ ] Database persistent.
* [ ] Foto persistent.

### Deployment

* [ ] Aplikasi berjalan dengan Docker Compose.
* [ ] Database persistent.
* [ ] Foto persistent.
* [ ] Nginx reverse proxy.
* [ ] HTTPS.
* [ ] PostgreSQL tidak exposed ke internet.
* [ ] Environment secrets tidak hardcoded.

---

# 44. Future Features

Fitur berikut tidak wajib untuk MVP tetapi desain sistem harus memungkinkan pengembangan:

* Bulk upload.
* Import Excel `.xlsx`.
* Login siswa.
* OTP.
* QR code untuk membuka form upload.
* QR code per siswa.
* Automatic photo quality detection.
* Face detection.
* Background removal.
* Photo cropping.
* Design automation.
* Canva integration.
* Figma integration.
* Automatic generation kartu siswa.
* Automatic notification via WhatsApp/Telegram.
* Audit log.
* Multiple admin roles.
* Multiple academic years.
* Archive data per tahun.

---

# 45. Prinsip Arsitektur

Implementasi harus mengikuti prinsip:

### Separation of Concerns

Pisahkan:

```text
UI
Business Logic
Database
Storage
Authentication
Export
```

### Design Automation Separation

Design automation bukan bagian dari MVP website.

Sistem harus menyediakan API/export yang dapat digunakan sistem design automation.

### Security by Default

Jangan membuka akses file/database secara publik hanya demi kemudahan development.

### Persistent Data

Container dapat dihancurkan dan dibuat kembali tanpa kehilangan database atau foto.

### Maintainability

Kode harus mudah dipahami developer manusia maupun AI coding agent.

### Simplicity

Jangan menambahkan dependency atau infrastructure yang belum diperlukan.

Hindari overengineering.

---

# 46. Rekomendasi Struktur Project

Implementasi boleh berbeda, tetapi target struktur konseptual:

```text
/home/projectFotoLDK/
│
├── PRD.md
├── README.md
├── docker-compose.yml
├── .env.example
│
├── app/
│   ├── package.json
│   ├── src/
│   ├── public/
│   ├── tests/
│   └── ...
│
├── students/
│   └── students.csv
│
├── data/
│   ├── uploads/
│   └── generated/
│
├── database/
│
└── nginx/
    └── nginx.conf
```

Framework/library dapat dipilih oleh AI berdasarkan requirement, tetapi implementasi harus mempertahankan konsep dan acceptance criteria dalam PRD.

---

# 47. Instruksi untuk AI Coding Agent

Sebelum melakukan coding:

1. Baca seluruh `PRD.md`.
2. Analisis requirement.
3. Identifikasi requirement yang ambigu.
4. Jangan menghapus requirement tanpa alasan.
5. Buat implementation plan.
6. Implementasikan MVP secara bertahap.
7. Jalankan linting dan testing.
8. Perbaiki error sebelum melanjutkan.
9. Update README dengan cara menjalankan project.
10. Jangan hardcode secret.
11. Jangan menggunakan fake/mock data sebagai pengganti implementation production kecuali untuk testing.
12. Jangan membuat architecture yang jauh lebih kompleks daripada requirement.
13. Pastikan Docker deployment reproducible.
14. Pastikan persistent storage bekerja.
15. Pastikan database migration dapat dijalankan dari environment baru.

Ketika memilih library atau framework, prioritaskan:

* Mature.
* Aktif dipelihara.
* Dokumentasi baik.
* Stabil.
* Cocok untuk deployment Docker.
* Tidak menambahkan kompleksitas yang tidak diperlukan.

---

# 48. Definition of Done

MVP dinyatakan selesai apabila seorang admin sekolah dapat melakukan workflow berikut tanpa bantuan developer:

```text
Import daftar siswa
        ↓
Siswa membuka website
        ↓
Siswa memilih kelas
        ↓
Siswa memilih nama
        ↓
Upload foto
        ↓
Admin membuka dashboard
        ↓
Melihat siswa yang belum upload
        ↓
Melihat foto blur
        ↓
Menandai foto blur
        ↓
Siswa upload ulang
        ↓
Status berubah menjadi uploaded
        ↓
Admin memilih kelas
        ↓
Download ZIP
        ↓
ZIP berisi foto dengan nama:
Kelas - Absen - Nama.jpg
```

Selain itu, sistem harus dapat menyediakan data terstruktur untuk digunakan oleh project **Design Automation** yang terpisah.

---

# 49. Prioritas Implementasi

Prioritas:

**P0 — Wajib MVP**

* Student data.
* Student upload.
* Photo replacement.
* Admin authentication.
* Admin dashboard.
* Status management.
* Blur marking.
* Pending list.
* Copy names.
* ZIP export.
* PostgreSQL.
* Persistent storage.
* Docker deployment.
* HTTPS.

**P1 — Setelah MVP**

* CSV import UI.
* Thumbnail.
* Better search/filter.
* Export JSON/CSV.
* Audit log.
* Better monitoring.

**P2 — Future**

* Canva.
* Figma.
* Design automation.
* Bulk upload.
* AI image validation.
* Notification integration.

---

# 50. Final Product Principle

Website ini harus diperlakukan sebagai:

> **Central Student Photo Collection and Data Source**

bukan sebagai design application.

Sistem ini bertanggung jawab atas:

```text
Student Identity
      +
Photo
      +
Class
      +
Attendance
      +
Photo Status
      ↓
Structured Output
```

Kemudian sistem lain dapat menggunakan structured output tersebut untuk melakukan:

```text
Design Automation
      ↓
Canva / Figma / Custom Renderer
      ↓
Final School Design
```

Dengan prinsip tersebut, website tetap berguna meskipun design automation berubah platform di kemudian hari.

