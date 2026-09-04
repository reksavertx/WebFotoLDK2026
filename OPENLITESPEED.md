# Deploy WebFoto di OpenLiteSpeed dengan Custom Path

Panduan ini membuat WebFoto dapat diakses melalui subpath seperti:

```text
https://example.test/webfoto/
https://example.test/foto-sekolah/
```

## Konsep

```text
Browser -> OpenLiteSpeed :80/:443 -> Next.js :3000 -> MySQL
```

OpenLiteSpeed menjadi reverse proxy. Next.js tetap berjalan sebagai production server di port 3000.

## 1. Environment Custom Path

Contoh path `/webfoto`. Edit `/WebFoto/app/.env`:

```env
DATABASE_URL=mysql://webfoto:webfoto@127.0.0.1:3306/webfoto
APP_URL=https://example.test/webfoto
NEXT_PUBLIC_BASE_PATH=/webfoto
COOKIE_SECURE=true
SESSION_SECRET=ganti-dengan-secret-acak-minimal-32-karakter
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ganti-password-kuat
UPLOAD_MAX_SIZE=5242880
UPLOAD_DIR=/WebFoto/data/uploads
GENERATED_DIR=/WebFoto/data/generated
```

Aturan `NEXT_PUBLIC_BASE_PATH`:

- Harus diawali `/`.
- Tidak boleh diakhiri `/`.
- Nilainya harus sama dengan URI Proxy Context OpenLiteSpeed.
- Contoh benar: `/webfoto`, `/foto-sekolah`, `/ldk2026`.

Nilai ini dibaca saat build. Setiap perubahan path membutuhkan build ulang.

## 2. Build dan Jalankan

```bash
cd /WebFoto/app
npm install
npm run db:migrate
npm run seed
npm run build
npm start
```

Tes backend langsung sebelum memasang proxy:

```bash
curl -I http://127.0.0.1:3000/webfoto/
```

Jika menggunakan path lain, ganti `/webfoto` pada perintah di atas.

## 3. Systemd Service

Buat service:

```bash
sudo tee /etc/systemd/system/webfoto.service > /dev/null <<'EOF'
[Unit]
Description=WebFoto Next.js production
After=network.target mysqld.service

[Service]
Type=simple
WorkingDirectory=/WebFoto/app
EnvironmentFile=/WebFoto/app/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5
User=webfoto

[Install]
WantedBy=multi-user.target
EOF
```

Sesuaikan `User=webfoto` dengan user yang dapat menulis storage foto:

```bash
sudo chown -R webfoto:webfoto /WebFoto/data/uploads /WebFoto/data/generated
sudo systemctl daemon-reload
sudo systemctl enable --now webfoto
sudo systemctl status webfoto --no-pager
```

Log aplikasi:

```bash
journalctl -u webfoto -f
```

## 4. Konfigurasi OpenLiteSpeed

Dokumentasi resmi reverse proxy: <https://docs.openlitespeed.org/config/reverseproxy/>.

### 4.1 External Application

Buka WebAdmin, biasanya `https://server:7080`, lalu pilih:

```text
Server Configuration > External App > Add > Web Server
```

Isi:

```text
Name: webfoto-node
Address: 127.0.0.1:3000
Max Connections: 100
Initial Request Timeout: 60
Retry Timeout: 0
Response Buffering: No
```

### 4.2 Proxy Context

Pada virtual host yang dipakai, pilih:

```text
Virtual Hosts > <nama-vhost> > Context > Add
```

Isi:

```text
Type: Proxy
URI: /webfoto/
Web Server: [Server Level]: webfoto-node
```

Simpan. Jika memakai `/foto-sekolah`, maka semua bagian harus konsisten:

```text
NEXT_PUBLIC_BASE_PATH=/foto-sekolah
Proxy Context URI=/foto-sekolah/
APP_URL=https://example.test/foto-sekolah
```

Jangan menghapus prefix dari request yang diteruskan ke Next.js ketika aplikasi dibuild dengan `basePath` tersebut. Setelah perubahan, lakukan graceful restart OpenLiteSpeed.

### 4.3 Mapping Listener

Pastikan virtual host terhubung ke listener HTTP/HTTPS melalui:

```text
Listeners > HTTP/HTTPS > Virtual Host Mappings > Add
```

Tambahkan domain/IP yang digunakan, lalu lakukan **Graceful Restart**.

## 5. Verifikasi

```bash
curl -I https://example.test/webfoto/
curl -I https://example.test/webfoto/admin/login
```

Di browser, buka DevTools > Network dan pastikan:

- CSS/logo meminta URL dengan prefix `/webfoto`.
- API meminta `/webfoto/api/...`, bukan `/api/...`.
- Login admin tetap berada di `/webfoto/admin/login`.
- Preview thumbnail, preview besar, dan download ZIP memakai prefix yang sama.

## 6. HTTPS dan Cookie

Untuk HTTPS:

```env
APP_URL=https://example.test/webfoto
NEXT_PUBLIC_BASE_PATH=/webfoto
COOKIE_SECURE=true
```

Untuk HTTP lokal/IP:

```env
APP_URL=http://192.168.1.20/webfoto
NEXT_PUBLIC_BASE_PATH=/webfoto
COOKIE_SECURE=false
```

Setelah mengubah `COOKIE_SECURE`, hapus cookie lama atau gunakan private window, lalu login kembali.

## 7. Mengganti Custom Path

Contoh mengganti `/webfoto` menjadi `/event-foto`:

```env
APP_URL=https://example.test/event-foto
NEXT_PUBLIC_BASE_PATH=/event-foto
```

Kemudian ubah Proxy Context ke `/event-foto/` dan jalankan:

```bash
cd /WebFoto/app
npm run build
sudo systemctl restart webfoto
```

## 8. Troubleshooting

### 404 pada API/CSS/logo

Pastikan `NEXT_PUBLIC_BASE_PATH`, URI Proxy Context, dan `APP_URL` memakai prefix yang sama. Setelah mengubah `.env`, wajib `npm run build` ulang.

### Login selalu kembali ke halaman login

Untuk HTTP gunakan `COOKIE_SECURE=false`. Untuk HTTPS gunakan `COOKIE_SECURE=true`. Hapus cookie lama setelah perubahan.

### OpenLiteSpeed 503

```bash
sudo systemctl status webfoto
curl -I http://127.0.0.1:3000/webfoto/
```

Pastikan External App memakai `127.0.0.1:3000`, service Node hidup, dan OpenLiteSpeed sudah graceful restart.

### Backup

```bash
mysqldump -uwebfoto -p webfoto > /WebFoto/backups/webfoto-$(date +%F).sql
```
