# WebFoto

WebFoto adalah sistem pengumpulan dan validasi foto siswa. Siswa tidak perlu membuat akun: mereka memilih kelas, memilih nama dari daftar sekolah, lalu mengunggah foto. Admin dapat memantau status, menandai foto blur, menyalin daftar nama, import siswa, dan mengunduh ZIP.

## Fitur

- Form siswa mobile-friendly tanpa login.
- Identitas siswa berasal dari database, bukan input nama bebas.
- Upload JPEG, PNG, atau WEBP maksimal 5 MB.
- Foto diputar sesuai orientasi, diperkecil, dan disimpan sebagai JPEG (.jpg).
- Upload ulang menggantikan foto aktif sebelumnya.
- Dashboard admin dengan status `pending`, `uploaded`, dan `blur`.
- Filter kelas/status/search, statistik, mark blur/valid, dan copy daftar nama.
- Export ZIP per kelas atau seluruh kelas (folder per kelas) dengan nama `Kelas - Absen - Nama.jpg`.
- Preview foto langsung dari dashboard dengan mengklik nama siswa.
- Export JSON/CSV untuk sistem design automation.
- Import CSV dengan mode preview dan commit.
- MySQL 8.4 LTS dan storage foto persisten.

## Kebutuhan Sistem

- Linux/macOS/Windows dengan Docker Engine dan Docker Compose.
- Node.js 22+ dan npm jika menjalankan aplikasi di luar container.
- Domain dan sertifikat TLS untuk deployment HTTPS publik.

## Struktur Penting

```text
app/                         # Source Next.js
data/daftar_siswa_kelas_x.csv # Data siswa awal
data/uploads/                # Foto siswa, wajib dibackup
data/generated/              # ZIP hasil export, wajib dibackup bila diperlukan
database/                   # Data MySQL, wajib dibackup
nginx/nginx.conf             # Reverse proxy
docker-compose.yml            # MySQL, app, Nginx
```

## Development Lokal

1. Buat environment file:

```bash
cp .env.example .env
```

Ganti `SESSION_SECRET` dan `ADMIN_PASSWORD` dengan nilai acak/kuat. Jangan commit `.env`.

2. Jalankan MySQL:

```bash
docker compose up -d mysql
```

3. Install dependency dan siapkan database:

```bash
cd app
npm install
npm run db:generate
npm run db:migrate
npm run seed
```

Seed membaca `data/daftar_siswa_kelas_x.csv`, membuat kelas dan siswa, lalu membuat atau memperbarui admin dari `ADMIN_USERNAME` dan `ADMIN_PASSWORD`.

4. Jalankan aplikasi:

```bash
npm run dev
```

Buka `http://localhost:3000`. Dashboard admin berada di `http://localhost:3000/admin/login`.

## Production dengan Docker Compose

1. Siapkan file environment di root project:

```bash
cp .env.example .env
```

Pastikan `DATABASE_URL` memakai nama service Docker:

```env
DATABASE_URL=mysql://webfoto:webfoto@mysql:3306/webfoto
APP_URL=https://foto.sekolah.sch.id
SESSION_SECRET=ganti-dengan-rahasia-acak-minimal-32-karakter
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ganti-password-kuat
UPLOAD_MAX_SIZE=5242880
UPLOAD_DIR=/data/uploads
GENERATED_DIR=/data/generated
```

2. Jalankan database terlebih dahulu:

```bash
docker compose up -d mysql
```

3. Jalankan migration dan seed dari host. Port MySQL hanya bind ke `127.0.0.1`:

```bash
cd app
DATABASE_URL=mysql://webfoto:webfoto@localhost:3306/webfoto npm run db:migrate
DATABASE_URL=mysql://webfoto:webfoto@localhost:3306/webfoto npm run seed
cd ..
```

4. Build dan jalankan semua service:

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f app
```

Aplikasi diakses melalui Nginx pada port 80/443. MySQL tidak diekspos ke internet.

## HTTPS dengan Nginx

Konfigurasi Nginx saat ini menyediakan HTTP reverse proxy dan blok HTTPS yang siap diaktifkan. Untuk produksi, gunakan sertifikat resmi dari Let's Encrypt atau certificate authority sekolah.

1. Buat folder sertifikat dan letakkan file berikut:

```text
nginx/certs/fullchain.pem
nginx/certs/privkey.pem
```

2. Edit `nginx/nginx.conf`:

- Ganti `foto.sekolah.sch.id` dengan domain sebenarnya.
- Aktifkan server block port 443.
- Tambahkan redirect HTTP ke HTTPS jika sertifikat sudah aktif.

Alternatifnya, salin template siap pakai lalu sesuaikan domain:

```bash
cp nginx/nginx.https.conf.example nginx/nginx.conf
```

Contoh redirect:

```nginx
server {
  listen 80;
  server_name foto.sekolah.sch.id;
  return 301 https://$host$request_uri;
}
```

3. Reload Nginx:

```bash
docker compose up -d nginx
docker compose exec nginx nginx -t
docker compose restart nginx
```

Jangan commit private key ke Git. Batasi permission file:

```bash
chmod 600 nginx/certs/privkey.pem
```

## Import CSV

Format CSV yang diterima:

```csv
NO,NIS,NISN,NAMA,KELAS
1,13100,0108041576,ABDILLAH HANAN AL AQSHO,X TJKT
```

Endpoint admin:

```text
POST /api/admin/import
```

Kirim multipart field `file`. Tanpa field `commit=true`, endpoint mengembalikan preview. Dengan `commit=true`, data disimpan menggunakan upsert berdasarkan NIS.

## Endpoint Utama

```text
GET    /api/classes
GET    /api/classes/:id/students
POST   /api/photos/upload
POST   /api/admin/login
POST   /api/admin/logout
GET    /api/admin/students
PATCH  /api/admin/photos/:id/status
GET    /api/admin/names?status=pending|blur
GET    /api/admin/export/:classId
GET    /api/export/class/:classId?format=json|csv
```

Endpoint admin membutuhkan cookie session. Foto tidak disimpan di `public/` dan endpoint preview dilindungi autentikasi admin.

## Backup dan Restore

Backup minimal mencakup MySQL dan foto:

```bash
mkdir -p backups
docker compose exec -T mysql sh -c 'exec mysqldump -uwebfoto -pwebfoto webfoto' > backups/webfoto-$(date +%F).sql
tar -czf backups/webfoto-files-$(date +%F).tar.gz data/uploads data/generated
```

Restore database:

```bash
cat backups/webfoto-YYYY-MM-DD.sql | docker compose exec -T mysql sh -c 'exec mysql -uwebfoto -pwebfoto webfoto'
tar -xzf backups/webfoto-files-YYYY-MM-DD.tar.gz
```

Uji restore secara berkala di server/database terpisah. Jangan menghapus folder `database`, `data/uploads`, atau `data/generated` saat melakukan upgrade container.

## Pengujian dan Build

```bash
cd app
npm test
npm run typecheck
npm run lint
npm run build
```

## Troubleshooting

**`DATABASE_URL is required` atau database connection refused**

- Pastikan MySQL hidup: `docker compose ps`.
- Saat dari host gunakan `localhost`.
- Saat dari container gunakan hostname `mysql`.

**Seed gagal karena data duplicate**

- Periksa `NIS` yang duplicate.
- Periksa nomor `NO` duplicate di kelas yang sama.
- Pastikan header tepat `NO,NIS,NISN,NAMA,KELAS`.

**Upload ditolak**

- File harus JPEG, PNG, atau WEBP.
- Ukuran maksimal default 5 MB.
- File yang rusak atau hanya mengganti extension akan ditolak.

**Nginx menampilkan 502 Bad Gateway**

- Pastikan service app hidup: `docker compose logs app`.
- Pastikan Nginx memakai upstream `app:3000`.
- Jalankan `docker compose exec nginx nginx -t`.

**Context7 tidak bisa digunakan**

Jika MCP Context7 menampilkan `Invalid API key`, lanjutkan dengan dokumentasi resmi library dan versi yang dikunci di `app/package.json`. Jangan mengubah dependency production hanya karena versi terbaru belum terverifikasi.
