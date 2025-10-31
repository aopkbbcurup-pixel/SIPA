1. Ringkasan Konsep Aplikasi (App Summary)

Nama Aplikasi (Saran): "Sistem Penilaian Agunan" (SIPA) Babe

Tujuan Utama:
Untuk mendigitalkan, menstandardisasi, dan mengelola seluruh proses penilaian agunan (properti) untuk keperluan penjaminan utang/kredit. Aplikasi ini akan menggantikan proses manual pengisian dokumen Word.

Pengguna Utama (User Persona):

Penilai Internal (Appraiser): Petugas yang melakukan survei (OTS), mengumpulkan data, meng-input data ke sistem, dan mengajukan laporan.

Supervisi (Supervisor/Reviewer): Atasan yang me-review data yang di-input oleh Penilai, melakukan verifikasi, dan memberikan persetujuan (approval) pada laporan.

Administrator (Admin): Mengelola data master (seperti nama penilai, unit kerja, parameter safety margin) dan hak akses pengguna.

Fitur Utama (Core Features):

Manajemen Laporan Penilaian:

Membuat, melihat, mengedit, dan menghapus (CRUD) laporan penilaian.

Setiap laporan memiliki status (Draft, For Review, Approved, Rejected).

Pencarian dan filter laporan berdasarkan Nama Nasabah, No. Laporan, atau Tanggal.

Formulir Input Data Dinamis (Wizard):

Formulir multi-langkah yang memandu Penilai untuk mengisi data sesuai template dokumen:

Data Umum: Input data Nasabah, Plafond, Tujuan Kredit, Unit Kerja, info permohonan, dan jadwal OTS.

Data Objek Agunan: Input jenis agunan (rumah, ruko, tanah), alamat, dan detail legalitas (SHM, IMB). Harus bisa menambah lebih dari satu sertifikat atau IMB.

Spesifikasi Teknis: Input detail kondisi tanah (bentuk, topografi), kondisi bangunan (spesifikasi lantai, dinding, atap), dan fasilitas lingkungan (listrik, air).

Checklist Lingkungan: Formulir checklist (Ya/Tidak) untuk "Informasi Penting Lainnya" (rawan banjir, SUTET, dekat TPU, dll.).

Data Pembanding (Market Comps): Fitur untuk menambah beberapa data pembanding (lokasi, luas, harga) sebagai dasar penentuan Nilai Pasar.

Modul Kalkulasi Penilaian:

Formulir khusus untuk memasukkan variabel penilaian (Luas Tanah, Luas Bangunan, Harga Satuan/m2, Nilai NJOP).

Input untuk parameter penilaian (misal: Safety Margin %, Faktor Likuidasi %).

Kalkulasi Otomatis: Sistem akan menghitung:

Nilai Pasar (Luas * Harga Satuan)

Nilai Sebelum Safety Margin (Total Nilai Pasar)

Nilai Agunan Setelah Safety Margin

Nilai Likuidasi Agunan

Manajemen Lampiran (Attachments):

Fitur untuk mengunggah (upload) file pendukung:

Foto Agunan (Foto Tampak Depan, Kanan, Kiri, Dalam).

Peta/Sketsa Lokasi.

Scan dokumen legalitas.

Cetak Laporan ke PDF (Report Generation):

Fitur wajib: Setelah data diisi dan disetujui, sistem harus bisa menghasilkan (generate) file PDF yang formatnya rapi dan sesuai dengan template laporan di dokumen Word.

2. Rekomendasi Tumpukan Teknologi (Tech Stack)

Ini adalah tumpukan teknologi modern yang sangat populer, serba JavaScript (JavaScript-fullstack), dan didukung penuh oleh VS Code.

a. Lingkungan Pengembangan

Code Editor: Visual Studio Code

Versi Kontrol: Git (dengan repositori di GitHub atau GitLab)

b. Frontend (Antarmuka Pengguna / Client-Side)

Framework: React.js (atau Next.js untuk fitur SSR dan routing yang lebih mudah)

Mengapa? Sangat baik untuk membangun UI berbasis komponen (component-based). Anda bisa membuat komponen terpisah untuk <FormNasabah />, <FormLegalitas />, <TabelKalkulasi />, dll.

Styling: Tailwind CSS

Mengapa? Mempercepat pembuatan UI yang modern dan responsif tanpa menulis CSS manual. Sangat cocok untuk membangun form dan layout dashboard.

Manajemen State: Zustand atau React Context

Mengapa? Untuk mengelola data formulir yang kompleks di seluruh aplikasi.

c. Backend (Server & Logika Bisnis / Server-Side)

Runtime: Node.js

Framework API: Express.js

Mengapa? Cepat, minimalis, dan standar industri untuk membangun REST API dengan Node.js. Anda akan membuat endpoint seperti POST /api/laporan, GET /api/laporan/:id, PUT /api/laporan/:id/approve.

Tumpukan (Stack) yang disarankan: MERN Stack (MongoDB, Express, React, Node)

d. Database (Penyimpanan Data)

Database: MongoDB (NoSQL)

Mengapa? Struktur laporan penilaian adalah "dokumen" yang kompleks dengan data bersarang (nested) dan array (cth: daftar legalitas, daftar pembanding). MongoDB menyimpan data sebagai dokumen BSON (mirip JSON), yang sangat cocok secara alami dengan struktur data laporan Anda dan mudah diintegrasikan dengan Node.js (via Mongoose).

Alternatif (SQL): PostgreSQL

Jika Anda lebih suka SQL, PostgreSQL sangat kuat dan bisa menangani data relasional (misalnya, memisahkan tabel Users, Nasabah, dan Laporan).

e. Fitur Khusus & Layanan

Otentikasi (Login): JWT (JSON Web Tokens)

Token akan disimpan di sisi klien (frontend) dan dikirim di setiap request API untuk memverifikasi siapa Penilai atau Supervisor yang sedang login.

Penyimpanan File (Upload Foto):

Opsi 1 (Mudah): Simpan di filesystem server backend Anda.


Pembuatan Laporan PDF (PDF Generation):

Library (Node.js): Puppeteer

Mengapa? Anda bisa membuat template laporan dalam format HTML + CSS, lalu Puppeteer akan "mencetaknya" menjadi PDF yang sempurna dari sisi server. Ini jauh lebih mudah daripada membangun PDF baris per baris.