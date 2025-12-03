# SIPA Desktop - User Guide

## 🖥️ Running the Desktop Application

### ⚠️ PENTING: Backend Server Harus Jalan Dulu!

Sebelum menjalankan aplikasi desktop, **Anda harus menjalankan backend server terlebih dahulu**:

```bash
cd backend
npm run dev
```

Server akan berjalan di `http://localhost:4000`

### Production Mode (Installer)
Setelah install menggunakan `SIPA Setup 1.0.0.exe`:

1. **Jalankan backend server** di terminal:
   ```bash
   cd d:\PROJECT\SIPA\backend
   npm run dev
   ```
2. **Buka aplikasi SIPA** dari Start Menu atau Desktop shortcut
3. Login dengan akun yang sudah terdaftar

### Development Mode
To run SIPA as a desktop application in development mode:

```bash
# Terminal 1: Backend (WAJIB!)
cd backend
npm run dev

# Terminal 2: Desktop App
cd frontend
npm run electron:dev
```

This will:
1. Start the Vite development server
2. Wait for it to be ready
3. Compile the Electron main process
4. Launch the desktop window

### Building for Production
To create a distributable desktop application:

```bash
cd frontend
npm run electron:build
```

The installer will be available in `frontend/release/` directory.

## 🔧 Troubleshooting

### Error: "Failed to load resource: net::ERR_CONNECTION_REFUSED"
**Penyebab**: Backend server belum jalan.

**Solusi**: 
1. Buka terminal baru
2. Jalankan `cd d:\PROJECT\SIPA\backend`
3. Jalankan `npm run dev`
4. Tunggu sampai muncul "Server running on port 4000"
5. Refresh aplikasi desktop atau login ulang

### Mengubah Backend URL
Jika backend berjalan di port lain, edit file:
`d:\PROJECT\SIPA\frontend\src\lib\api.ts` line 44:
```typescript
return "http://localhost:XXXX/api";  // Ganti XXXX dengan port backend
```

## 📦 What Gets Built
- **Windows**: `.exe` installer (NSIS)
- **Output**: `frontend/release/SIPA Setup 1.0.0.exe`

## ⚙️ Configuration
- **Electron Config**: `electron-builder.json`
- **Main Process**: `electron/main.ts`
- **Preload Script**: `electron/preload.ts`
- **API Config**: `frontend/src/lib/api.ts`

## 🔧 Architecture
The desktop app wraps the React frontend in an Electron window:
- In **development**: Loads from `http://localhost:5173` (Vite dev server)
- In **production**: Loads from local `dist/index.html` files
- **Backend**: Separate Node.js server on `http://localhost:4000`

## 📝 Notes
- The app requires the backend to be running on `http://localhost:4000`
- Backend server harus jalan sendiri (tidak bundled dalam installer)
- Window size: 1400x900 (minimum: 1024x768)
