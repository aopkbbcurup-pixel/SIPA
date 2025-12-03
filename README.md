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
- `GOOGLE_MAPS_API_KEY` - Opsional, isi bila ingin menampilkan snapshot Google Maps statis pada detail laporan (digunakan juga oleh paket desktop).

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

Salin `.env.example` menjadi `.env` bila perlu mengubah URL API (`VITE_API_URL`). Aplikasi default akan mengarah ke `http://localhost:4000/api`. Gunakan `VITE_PUBLIC_API_URL` bila frontend harus memanggil domain berbeda (reverse proxy) dan `VITE_GOOGLE_MAPS_API_KEY` bila ingin mengambil snapshot peta langsung dari browser saat backend tidak menyuntikkan konfigurasi ini.

### Urutan sumber konfigurasi

1. **Desktop Settings ? Server** - Nilai disimpan di `sipa-config.json` Electron dan langsung disuntikkan saat runtime (tidak perlu rebuild).
2. **Backend `.env`** – Saat API menyajikan frontend statis (`SIPA_SERVE_FRONTEND=true`), variabel seperti `SIPA_PUBLIC_API_BASE_URL` dan `GOOGLE_MAPS_API_KEY` otomatis dikirim ke klien.
3. **Frontend `.env`** – Dipakai saat menjalankan Vite dev server / build statis mandiri (`VITE_API_URL`, `VITE_PUBLIC_API_URL`, `VITE_GOOGLE_MAPS_API_KEY`).

Jika layer dengan prioritas lebih tinggi tidak menyediakan nilai tertentu, frontend akan turun ke layer berikutnya atau fallback `http://localhost:4000/api`.

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
- `npm run dev` - Menjalankan Vite dev server.
- `npm run build` - Build produksi.
- `npm run preview` - Melihat build produksi secara lokal.

### Desktop
- `npm --prefix desktop run dev` - Menjalankan aplikasi desktop dalam mode dev (otomatis mem-boot backend & frontend dev server).
- `npm --prefix desktop run package` - Membuat installer Windows (*.exe*) di `desktop/dist/`.

## Akses Melalui Jaringan Wi-Fi

1. Pastikan backend berjalan dengan `HOST=0.0.0.0` (default baru). Jika perlu, ubah file `backend/.env` dan restart server.
2. Jalankan frontend (`npm run dev`). Vite sudah dikonfigurasi supaya menerima koneksi dari jaringan lokal.
3. Alamat IP lokal komputer ini saat dokumentasi dibuat: `192.168.0.110`. Jika berubah, perbarui sesuai hasil `ipconfig`.
4. Dari perangkat lain di jaringan yang sama, akses frontend lewat `http://192.168.0.110:5173` dan backend lewat `http://192.168.0.110:4000`.
5. Setel `.env` frontend (`VITE_API_URL`) menggunakan alamat IP tersebut agar frontend memanggil API yang sama.

## Paket Desktop Windows

1. Pastikan dependensi tiap bagian sudah terinstal:
   - `cd backend && npm install`
   - `cd frontend && npm install`
   - `cd desktop && npm install`
2. Untuk pengembangan desktop interaktif jalankan `npm --prefix desktop run dev`. Perintah ini otomatis menjalankan backend dev server, Vite, dan jendela Electron.
3. Untuk membuat installer Windows, jalankan `npm --prefix desktop run package`. Berkas `.exe` akan tersedia di `desktop/dist/`. Jalankan file tersebut untuk memasang aplikasi di Windows lain.
4. Backend lokal di dalam aplikasi desktop secara default berjalan dalam mode server dan bind ke `0.0.0.0:4000`, sehingga bisa diakses dari perangkat lain via `http://<alamat-ip-komputer>:4000/`. Semua file unggahan, PDF, dan database JSON disimpan di `%APPDATA%\SIPA\`.
5. Gunakan menu **Settings ? Server** pada aplikasi desktop untuk menyesuaikan mode operasi, host/port backend, `URL API Publik`, serta menyimpan `Google Maps API Key` bagi snapshot peta. Nilai kosong otomatis mengikuti alamat lokal.
6. Jika Anda melakukan perubahan kode, ulangi build dengan perintah di atas agar installer berisi versi terbaru.
7. Proses packaging Electron kini menjalankan verifikasi tambahan melalui `scripts/verify-assets.js`. Pastikan perintah lint/test backend serta build frontend sudah hijau sebelum menjalankan `npm --prefix desktop run package`. Aktifkan *Developer Mode* Windows atau jalankan terminal sebagai Administrator bila muncul error `Cannot create symbolic link`.

## Catatan

- Direktori `uploads/`, `generated-pdfs/`, dan `storage/database.json` dibuat otomatis.
- Puppeteer membutuhkan resource tambahan saat pertama kali dijalankan untuk mengunduh Chromium.
- Untuk pemakaian produksi, ganti `JWT_SECRET` dengan nilai rahasia dan siapkan penyimpanan terdedikasi (mis. database).

## Pengujian

- Backend: `npm --prefix backend run lint` untuk pengecekan TypeScript dan `npm --prefix backend run test` untuk menjalankan unit test (validasi checklist & analisis pembanding).
- Frontend: `npm --prefix frontend run lint` memastikan kode React bersih sebelum build/commit.
