
================================================================================
MODUL PANDUAN PENGGUNA (USER MANUAL)
SISTEM INFORMASI PENILAIAN AGUNAN (SIPA)
VERSI APLIKASI: 1.0 (PRODUCTION READY)
================================================================================

DOKUMEN INI ADALAH PANDUAN RESMI PENGGUNAAN APLIKASI
DISESUAIKAN DENGAN TAMPILAN ANTARMUKA (UI) TERBARU

--------------------------------------------------------------------------------

BAB 1: DASHBOARD & MANAJEMEN LAPORAN

Setelah Login, Anda akan masuk ke halaman "Manajemen Laporan".

1.1. NAVIGASI UTAMA
     -   Tab "Daftar Laporan": Tampilan tabel seluruh pekerjaan.
     -   Tab "Analytics Dashboard": Grafik kinerja dan tren penilaian.

1.2. MENCARI & MEMFILTER DATA
     Gunakan baris filter di bagian atas untuk menemukan laporan:
     -   Kolom "Pencarian": Ketik Nama Nasabah atau Nomor Laporan.
     -   Dropdown "Status Laporan": Pilih Draft, Menunggu Review, Disetujui, atau Ditolak.
     -   Input "Dari Tanggal" & "Sampai Tanggal": Filter rentang waktu.

1.3. TOMBOL AKSI CEPAT
     -   "Export Excel": Mengunduh rekapitulasi data ke format Spreadsheet (.xlsx).
     -   "Segarkan": Memuat ulang data terbaru.
     -   "Buat Laporan": Tombol Biru [+] untuk memulai penilaian baru.

--------------------------------------------------------------------------------

BAB 2: MEMBUAT LAPORAN BARU (THE WIZARD)

Klik tombol "+ Buat Laporan" untuk masuk ke Formulir 5 Langkah.

LANGKAH 1: INFORMASI UMUM
-   Isi Nama Nasabah, Plafond, dan Tujuan Kredit.
-   Pastikan "Nama Penilai" (Anda) dan "Nama Supervisor" sudah benar.

LANGKAH 2: OBJEK AGUNAN
-   Wajib input: Nama Aset, Jenis, dan Alamat.
-   FITUR LOKASI:
    1. Klik ikon Peta untuk set titik koordinat.
    2. Klik tombol "✓ Cek Sentuh Tanahku" (Warna Biru).
    3. Jika sukses, akan muncul teks hijau: "Terverifikasi: XX meter".
-   FITUR LEGALITAS (OCR):
    1. Pada bagian Dokumen Legalitas, klik icon Upload.
    2. Pilih foto sertifikat. AI akan membaca Nomor & Luas secara otomatis.

LANGKAH 3: TEKNIS & LINGKUNGAN
-   Isi detail bangunan (Pondasi, Dinding, Atap, dll).
-   Checklist Risiko: Centang jika ada risiko banjir/sutet. Wajib isi catatan jika risiko teridentifikasi 'High'.

LANGKAH 4: DATA PEMBANDING
-   Masukkan minimal 2 data pembanding pasar.
-   Isi bobot (Weight) hingga totalnya pas 100%.

LANGKAH 5: PENILAIAN & REVIEW
-   Halaman ini menampilkan kalkulasi otomatis Nilai Pasar.
-   Input "Faktor Likuidasi" (Default: 70%).

--------------------------------------------------------------------------------

BAB 3: QUALITY CHECK PANEL (PANEL SISI KANAN)

Selama Anda mengisi formulir, Panel di sebelah kanan akan terus memantau pekerjaan Anda.

3.1. ARTI INDIKATOR
     -   CRITICAL (Merah): Anda TIDAK BISA menyimpan/submit.
         Contoh: "Foto Depan Kosong", "Bobot Pembanding bukan 100%".
     -   WARNING (Kuning): Anda BISA submit, tapi perlu hati-hati.
         Contoh: "Nilai Pasar naik >20% dari NJOP".
     -   PASSED (Hijau): Data valid.

3.2. SYARAT SUBMIT
     Tombol "Ajukan Review" hanya akan aktif jika:
     1.  Tidak ada Error Critical.
     2.  Semua field wajib telah terisi.

--------------------------------------------------------------------------------

BAB 4: PROSES PERSETUJUAN (SUPERVISOR)

Sebagai Supervisor/Reviewer, tugas Anda adalah memvalidasi draft.

4.1. MENU REVIEW
     1.  Filter Status menjadi "Menunggu Review".
     2.  Klik tombol panah kanan (Detail) pada laporan.

4.2. HALAMAN DETAIL
     Anda akan melihat seluruh data yang diinput Appraiser.
     -   Lihat "Quality Summary" di bagian atas untuk cek skor kepatuhan.
     -   Periksa tab "Agunan" dan "Pembanding".

4.3. APPROVAL ACTION
     Di bagian bawah halaman detail:
     -   Tombol "APPPROVE": Laporan dikunci, Tanda Tangan Digital dibubuhkan, Status menjadi "Approved".
     -   Tombol "REJECT": Tulis alasan penolakan. Laporan kembali ke Appraiser untuk diperbaiki.

--------------------------------------------------------------------------------

BAB 5: FAQ & TROUBLESHOOTING

Q: Kenapa tombol "Simpan" tidak bisa diklik?
A: Cek Panel Quality Check di kanan. Pastikan tidak ada pesan error berwarna Merah.

Q: Bagaimana cara cetak PDF?
A: Buka laporan yang sudah status "Approved", scroll ke paling bawah, klik tombol "Download PDF".

Q: Apakah data bisa diedit setelah Approved?
A: Tidak. Dokumen terkunci permanen (Immutable) untuk audit.

--------------------------------------------------------------------------------

BAB 6: FITUR KHUSUS ARTIFICIAL INTELLIGENCE (AI)

Aplikasi SIPA dilengkapi dengan kecerdasan buatan untuk mempercepat pekerjaan Anda.

6.1. AI DOCUMENT SCANNER (OCR)
     Fitur ini membaca teks dari foto sertifikat (SHM/HGB) agar Anda tidak perlu mengetik ulang.
     CARA: Upload foto dokumen legalitas -> Tunggu notifikasi "Data Berhasil Diekstrak".

6.2. SMART VALUATION ASSISTANT (ASISTEN PENILAIAN - BETA)
     Sistem memberikan estimasi harga pasar sebagai pembanding.
     CARA: Klik tombol "Hitung Estimasi AI". Gunakan angka Min-Max yang muncul sebagai referensi (Second Opinion).

6.3. GENERATOR CATATAN OTOMATIS (AI REMARKS)
     Membuat narasi kesimpulan laporan secara otomatis.
     CARA: Klik "Generate with AI" di kolom Catatan Penilaian (Langkah 5).

6.4. SIPA COPILOT (CHATBOX)
     Asisten virtual untuk tanya jawab kebijakan atau teknis.
     CARA: Klik ikon Pesan/Chat di pojok kanan bawah. Tanyakan hal seperti "Berapa standar penyusutan bangunan?".

--------------------------------------------------------------------------------
DOKUMEN PANDUAN RESMI - VERSI UI 1.1 (UPDATED WITH AI)
