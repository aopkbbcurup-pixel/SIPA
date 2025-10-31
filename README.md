# SIPA (Sistem Penilaian Agunan)

Aplikasi full-stack untuk mendigitalkan proses penilaian agunan properti. Solusi ini menggantikan alur manual berbasis dokumen Word dengan antarmuka web modern, API Node.js, penyimpanan JSON ringan, serta dukungan lampiran dan penyusunan laporan ke PDF.

## Struktur Proyek

- `backend/` – REST API Express + TypeScript dengan penyimpanan file JSON, autentikasi JWT, unggah lampiran, dan generasi PDF (Puppeteer).
- `frontend/` – Aplikasi React + Vite + Tailwind dengan wizard input multi-langkah, manajemen laporan, dan dashboard ringkasan.
- `storage/` – Lokasi database JSON yang dibuat otomatis saat server dijalankan.

## Persyaratan

- Node.js 20+
- npm 10+
- (Opsional) Google Chrome/Chromium untuk menjalankan Puppeteer headless (bundled secara otomatis).

## Menjalankan Backend

```bash
cd backend
npm install
npm run dev
```

Environment variables (lihat `.env.example`):

- `PORT` - Port server API (default 4000)
- `HOST` - Alamat binding server (default `0.0.0.0` agar bisa diakses dari jaringan lokal)
- `JWT_SECRET` - Rahasia token JWT
- `UPLOAD_DIR` - Folder penyimpanan lampiran (default `uploads`)
- `PDF_OUTPUT_DIR` - Folder output PDF (default `generated-pdfs`)

Endpoint utama tersedia di `http://localhost:4000/api`. Seeding default menyediakan tiga akun:

| Role        | Username     | Password     |
| ----------- | ------------ | ------------ |
| Penilai     | `appraiser`  | `password123`|
| Supervisor  | `supervisor` | `password123`|
| Administrator | `admin`    | `password123`|

## Menjalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

Salin `.env.example` menjadi `.env` bila perlu mengubah URL API (`VITE_API_URL`). Aplikasi default akan mengarah ke `http://localhost:4000/api`.

Jika ingin mengakses Vite dev server dari perangkat lain (misal mobile di Wi-Fi yang sama), buka URL `http://192.168.0.110:5173`. Pastikan `VITE_API_URL` pada `.env` diarahkan ke `http://192.168.0.110:4000/api`.

## Shortcut Menjalankan Backend & Frontend Sekaligus

Jalankan skrip PowerShell di akar proyek:

```powershell
.\run-all.ps1
```

Skrip ini akan membuka dua jendela terminal (backend & frontend). Tekan ENTER di jendela utama skrip untuk menghentikan keduanya. Opsi `-NoWait` tersedia bila Anda tidak ingin skrip menunggu input sebelum selesai.

## Fitur Utama

- Autentikasi JWT dan kontrol peran (penilai, supervisor, admin).
- Manajemen laporan: pencarian, filter status, detail, perubahan status, PDF.
- Form wizard multi-langkah: informasi umum, agunan, teknis, lingkungan, pembanding, penilaian.
- Unggah lampiran (foto, dokumen) dengan kategori terstruktur.
- Generasi laporan PDF server-side menggunakan template HTML.
- Penyimpanan data ringan berbasis JSON (tanpa DB eksternal) untuk prototyping cepat.

## Skrip Penting

### Backend
- `npm run dev` – Menjalankan API dengan ts-node-dev.
- `npm run build` – Compile TypeScript ke `dist/`.
- `npm run start` – Menjalankan hasil build.

### Frontend
- `npm run dev` – Menjalankan Vite dev server.
- `npm run build` - Build produksi.
- `npm run preview` - Melihat build produksi secara lokal.

## Akses Melalui Jaringan Wi-Fi

1. Pastikan backend berjalan dengan `HOST=0.0.0.0` (default baru). Jika perlu, ubah file `backend/.env` dan restart server.
2. Jalankan frontend (`npm run dev`). Vite sudah dikonfigurasi supaya menerima koneksi dari jaringan lokal.
3. Alamat IP lokal komputer ini saat dokumentasi dibuat: `192.168.0.110`. Jika berubah, perbarui sesuai hasil `ipconfig`.
4. Dari perangkat lain di jaringan yang sama, akses frontend lewat `http://192.168.0.110:5173` dan backend lewat `http://192.168.0.110:4000`.
5. Setel `.env` frontend (`VITE_API_URL`) menggunakan alamat IP tersebut agar frontend memanggil API yang sama.

## Catatan

- Direktori `uploads/`, `generated-pdfs/`, dan `storage/database.json` dibuat otomatis.
- Puppeteer membutuhkan resource tambahan saat pertama kali dijalankan untuk mengunduh Chromium.
- Untuk pemakaian produksi, ganti `JWT_SECRET` dengan nilai rahasia dan siapkan penyimpanan terdedikasi (mis. database).
