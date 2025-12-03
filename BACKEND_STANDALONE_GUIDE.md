# SIPA Backend Standalone - User Guide

## 📦 File yang Dibutuhkan untuk Distribusi

Untuk menjalankan SIPA di komputer lain, copy 2 file ini:

1. **`sipa-backend.exe`** (~50MB)
   - Lokasi: `d:\PROJECT\SIPA\backend\release\sipa-backend.exe`
   - Backend server standalone (tidak perlu Node.js!)

2. **`SIPA Setup 1.0.0.exe`** (~140MB)
   - Lokasi: `d:\PROJECT\SIPA\frontend\release\SIPA Setup 1.0.0.exe`
   - Desktop application installer

## 🚀 Cara Install di Komputer Lain

### Step 1: Setup Backend
1. Copy `sipa-backend.exe` ke komputer target (misal: `C:\SIPA\`)
2. (Optional) Copy file `.env` jika ada konfigurasi khusus
3. Double-click `sipa-backend.exe` atau jalankan via terminal:
   ```bash
   C:\SIPA\sipa-backend.exe
   ```
4. Backend akan jalan di `http://localhost:4000`
5. **Biarkan terminal tetap terbuka** (backend sedang jalan)

### Step 2: Install Desktop App
1. Double-click `SIPA Setup 1.0.0.exe`
2. Ikuti wizard instalasi
3. Setelah selesai, buka SIPA dari Start Menu atau Desktop shortcut

### Step 3: Login
1. Pastikan backend masih jalan (Step 1)
2. Buka aplikasi SIPA Desktop
3. Login dengan username/password yang sudah ada

## ⚠️ Catatan Penting

### Database
- **MongoDB**: Jika menggunakan MongoDB, komputer target harus install MongoDB atau connect ke MongoDB cloud
- **JSON**: Jika menggunakan JSON database, data akan tersimpan di folder `storage/` di samping `sipa-backend.exe`

### Environment Variables
Backend executable akan membaca `.env` file dari lokasi yang sama dengan `sipa-backend.exe`. 

Contoh `.env`:
```env
NODE_ENV=production
PORT=4000
JWT_SECRET=your-secret-key-here
DB_TYPE=json
MONGO_URI=mongodb://localhost:27017/sipa
```

### File Uploads
File yang diupload akan tersimpan di folder `uploads/` di lokasi yang sama dengan `sipa-backend.exe`.

## 🔧 Troubleshooting

### Backend tidak bisa dibuka
**Error**: "This app can't run on your PC"
**Solusi**: Download dan install [Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)

### Port sudah digunakan
**Error**: "Port 4000 is already in use"
**Solusi**: 
1. Tutup aplikasi yang menggunakan port 4000
2. Atau ubah port di file `.env`: `PORT=4001`

### Database connection error
**Solusi**:
- Jika pakai MongoDB: Pastikan MongoDB service running
- Jika pakai JSON: Pastikan folder `storage/` ada dan writable

## 📝 Running as Service (Opsional)

Untuk menjalankan backend sebagai Windows Service agar auto-start:

1. Install [NSSM](https://nssm.cc/download)
2. Jalankan sebagai admin:
   ```bash
   nssm install SIPABackend "C:\SIPA\sipa-backend.exe"
   nssm start SIPABackend
   ```

Sekarang backend akan auto-start setiap kali Windows boot!

## 🎯 Development vs Production

| Aspect | Development | Production (Standalone) |
|--------|-------------|------------------------|
| Node.js | Required | **Not Required** ✅ |
| Backend | `npm run dev` | `sipa-backend.exe` |
| Size | ~200MB (node_modules) | ~50MB |
| Installation | npm install | Copy .exe file |
