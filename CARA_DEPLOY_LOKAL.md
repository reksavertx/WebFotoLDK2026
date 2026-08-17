# Cara Deploy Lokal Tanpa Docker

Panduan menjalankan WebFoto langsung di mesin tanpa Docker Engine, menggunakan MySQL yang terinstall di sistem dan Node.js. Contoh memakai **Fedora**, tapi langkah serupa berlaku untuk distro Linux lain (sesuaikan perintah package manager).

## Kebutuhan Sistem

- Fedora (atau distro Linux lain) dengan akses `sudo`.
- Node.js 22+ dan npm (cek: `node -v`, `npm -v`).
- MySQL 8.x terinstall di sistem.
- Ruang disk untuk foto siswa (`data/uploads`).

---

## 1. Install dan Jalankan MySQL

```bash
sudo dnf install mysql-server
sudo systemctl enable --now mysqld
```

Cek status:

```bash
sudo systemctl status mysqld --no-pager
```

Sesuaikan nama service bila distro memakai nama lain (`mysql`, `mysqld`, atau `mysql-server`):

```bash
sudo systemctl list-units --type=service | grep -i -E "mysql|maria"
```

## 2. Buat Database dan User

```bash
sudo mysql -e "
CREATE DATABASE webfoto CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'webfoto'@'localhost' IDENTIFIED BY 'webfoto';
GRANT ALL PRIVILEGES ON webfoto.* TO 'webfoto'@'localhost';
FLUSH PRIVILEGES;"
```

Verifikasi koneksi:

```bash
mysql -uwebfoto -pwebfoto -h127.0.0.1 -e "SELECT 1"
```

> Ganti password `webfoto` dengan yang lebih kuat untuk deployment sungguhan, lalu sesuaikan di `DATABASE_URL` pada langkah 3.

## 3. Siapkan File Environment

Salin contoh environment ke `.env` di folder `app`:

```bash
cd /WebFoto/app
cp .env.example .env
```

Edit `.env` dan sesuaikan. Karena MySQL berjalan langsung di sistem (bukan container), gunakan host `localhost`:

```env
DATABASE_URL=mysql://webfoto:webfoto@localhost:3306/webfoto
APP_URL=http://localhost:3000
COOKIE_SECURE=false
SESSION_SECRET=ganti-dengan-rahasia-acak-minimal-32-karakter
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ganti-password-kuat
UPLOAD_MAX_SIZE=5242880
UPLOAD_DIR=/data/uploads
GENERATED_DIR=/data/generated
```

Buat folder upload/generated bila belum ada:

```bash
mkdir -p /data/uploads /data/generated
```

> Jangan commit `.env` ke Git.

## 4. Install Dependency

```bash
cd /WebFoto/app
npm install
```

## 5. Migration dan Seed Database

```bash
npm run db:migrate
npm run seed
```

Seed membaca `data/daftar_siswa_kelas_x.csv`, membuat kelas dan siswa, lalu membuat/memperbarui admin dari `ADMIN_USERNAME` dan `ADMIN_PASSWORD`. Output yang diharapkan:

```text
Seeded 359 students in 10 classes.
```

## 6. Jalankan Aplikasi

### Mode Development

```bash
npm run dev
```

Buka `http://localhost:3000`. Dashboard admin di `http://localhost:3000/admin/login`.

### Mode Production

```bash
npm run build
npm start
```

Aplikasi berjalan di `http://localhost:3000` sebagai production server.

---

## 7. (Opsional) Menjalankan sebagai Service Systemd

Agar app tetap hidup dan otomatis menyala saat reboot:

```bash
sudo tee /etc/systemd/system/webfoto.service > /dev/null <<'EOF'
[Unit]
Description=WebFoto Next.js
After=network.target mysqld.service

[Service]
Type=simple
WorkingDirectory=/WebFoto/app
EnvironmentFile=/WebFoto/app/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=YOUR_USER

[Install]
WantedBy=multi-user.target
EOF
```

Ganti `YOUR_USER` dengan user yang menjalankan aplikasi. Aktifkan:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now webfoto
sudo systemctl status webfoto --no-pager
```

## 8. (Opsional) Reverse Proxy dengan Nginx

Jika ingin diakses lewat domain/port 80, install Nginx sistem:

```bash
sudo dnf install nginx
sudo cp /WebFoto/nginx/nginx.conf /etc/nginx/conf.d/webfoto.conf
```

Sesuaikan `upstream` dan `server_name` di file tersebut agar mengarah ke `127.0.0.1:3000` dan domain Anda, lalu:

```bash
sudo nginx -t
sudo systemctl enable --now nginx
```

> Konfigurasi Nginx di repo dibuat untuk container (`app:3000`). Untuk tanpa Docker, ganti upstream menjadi `127.0.0.1:3000`.

---

## Backup dan Restore Tanpa Docker

### Backup

```bash
mkdir -p /WebFoto/backups
mysqldump -uwebfoto -pwebfoto webfoto > /WebFoto/backups/webfoto-$(date +%F).sql
tar -czf /WebFoto/backups/webfoto-files-$(date +%F).tar.gz /WebFoto/data/uploads /WebFoto/data/generated
```

### Restore

```bash
mysql -uwebfoto -pwebfoto webfoto < /WebFoto/backups/webfoto-YYYY-MM-DD.sql
tar -xzf /WebFoto/backups/webfoto-files-YYYY-MM-DD.tar.gz
```

Uji restore secara berkala di database/server terpisah.

---

## Troubleshooting

**`database connection refused`**

- Pastikan MySQL hidup: `sudo systemctl status mysqld`.
- Pastikan `DATABASE_URL` memakai `localhost` (bukan `mysql`).
- Uji koneksi: `mysql -uwebfoto -pwebfoto -h127.0.0.1 -e "SELECT 1"`.

**`Access denied for user 'webfoto'`**

- Ulangi langkah 2 untuk memastikan user dan grant sudah benar.
- Periksa karakter/host di `DATABASE_URL` benar-benar `localhost`.

**`npm start` tidak terdaftar di PATH systemd**

- Gunakan path penuh: `ExecStart=/usr/bin/npm start`, atau lebih baik `ExecStart=/usr/local/bin/node /WebFoto/app/node_modules/next/dist/bin/next start`.
- Cek lokasi node: `which node npm`.

**Upload ditolak**

- File harus JPEG, PNG, atau WEBP.
- Ukuran maksimal default 5 MB.
- File rusak atau hanya ganti extension akan ditolak.

**Port 3000 sudah dipakai**

- Ganti port di `.env` (`APP_URL`) atau jalankan dengan `npm start -- -p 3001`.
