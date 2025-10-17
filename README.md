# Kazumi - Dasbor ERP & E-commerce

Aplikasi web modern dan komprehensif yang berfungsi sebagai sistem ERP (Enterprise Resource Planning) internal dan platform E-commerce untuk pelanggan. Dibuat untuk bisnis pakaian, aplikasi ini mengintegrasikan semua aspek operasional mulai dari perhitungan HPP, manajemen produksi, gudang, penjualan, penggajian, hingga interaksi dengan pelanggan.

![App Screenshot Placeholder](https://placehold.co/1200x600/e2e8f0/64748b?text=Screenshot+Aplikasi+Kazumi)

## Fitur Utama

Aplikasi ini dibagi menjadi dua portal utama: Dasbor Internal untuk staf dan Katalog E-commerce untuk pelanggan, dengan fitur-fitur canggih di setiap bagian.

### Dasbor Internal (Staf & Admin)

-   **Otentikasi & Peran:** Sistem login terpisah untuk staf dengan kontrol akses berbasis peran (Super Admin, Admin, Anggota Departemen).
-   **Dasbor Rekapitulasi:** Visualisasi data real-time untuk total pendapatan, item terjual, nilai stok, tren penjualan, dan statistik produksi.
-   **Manajemen Produksi:**
    -   Kalkulator Harga Pokok Produksi (HPP) yang dinamis.
    -   Memproses permintaan produksi dari gudang.
    -   Pencatatan laporan produksi yang otomatis mengurangi stok bahan baku.
-   **Manajemen Gudang:**
    -   Manajemen stok untuk material mentah dan barang jadi.
    -   Penerimaan barang dari produksi.
    -   Alur kerja permintaan produksi ke departemen terkait saat stok menipis.
    -   Proses pesanan online: konfirmasi pembayaran, persiapan, hingga pengiriman.
    -   Fitur penyesuaian stok manual dengan alur persetujuan.
-   **Point of Sale (POS):** Antarmuka kasir untuk mencatat penjualan offline, lengkap dengan manajemen keranjang dan diskon.
-   **Manajemen Akun:**
    -   Persetujuan akun baru untuk staf dan pelanggan.
    -   Pengelolaan profil, peran, departemen, dan gaji pokok.
    -   Fitur sanksi (peringatan, skorsing) hingga proses pemberhentian (terminasi) dengan alur konfirmasi.
-   **Manajemen Kinerja Pegawai:**
    -   Sistem poin kinerja otomatis berdasarkan absensi, disiplin (laporan sholat), dan sanksi.
    -   Pemberian poin manual untuk inisiatif dan produktivitas.
    -   Dasbor visual untuk memantau skor dan riwayat kinerja.
-   **Penggajian (Payroll):**
    -   Memproses gaji bulanan dengan tunjangan dan potongan dinamis.
    -   Riwayat penggajian untuk admin dan pegawai.
    -   Alur konfirmasi penerimaan gaji oleh pegawai.
-   **Manajemen Promo & E-commerce:**
    -   Membuat kode promo (persentase/potongan tetap) dan diskon produk.
    -   Alur persetujuan promo oleh Super Admin.
    -   Memberikan voucher khusus untuk pelanggan setia.
-   **Keterlibatan Pegawai:**
    -   Papan pesan untuk pengumuman internal.
    -   Survei kepuasan pegawai dengan rekapitulasi hasil anonim.
-   **Laporan & Ekspor:**
    -   Laporan penjualan, produksi, dan riwayat stok dengan filter tanggal.
    -   Ekspor laporan penting ke format PDF.
-   **Absensi & Laporan Sholat:** Fitur absensi harian dengan bukti foto dan pelaporan sholat untuk poin disiplin.
-   **Panduan SOP:** Halaman khusus berisi Standar Operasional Prosedur untuk setiap departemen.

### Portal Pelanggan (E-commerce)

-   **Otentikasi Pelanggan:** Sistem pendaftaran dan login terpisah untuk pelanggan.
-   **Katalog Produk:** Galeri produk dengan filter, gambar, dan detail harga (termasuk harga diskon).
-   **Keranjang Belanja:** Fungsionalitas penuh untuk menambah, mengubah jumlah, dan menghapus item.
-   **Proses Checkout:**
    -   Formulir alamat pengiriman yang lengkap.
    -   Integrasi API backend untuk perhitungan ongkos kirim real-time (simulasi).
    -   Penerapan kode promo.
    -   Sistem pembayaran via transfer bank dengan unggah bukti pembayaran.
-   **Manajemen Pesanan:**
    -   Halaman riwayat pesanan untuk melacak status.
    -   Fitur pelacakan paket (simulasi) dengan nomor resi.
-   **Manajemen Profil:** Pelanggan dapat mengelola data pribadi dan alamat pengiriman utama.

## Menjalankan Aplikasi Secara Lokal

Aplikasi ini berjalan sebagai proyek full-stack dengan client (React) dan server (Node.js) yang terintegrasi. Server menangani semua penyimpanan data, unggah file, dan panggilan API yang aman.

### Prasyarat

-   **Node.js dan npm:** Pastikan Anda memiliki Node.js (versi 18 atau lebih baru direkomendasikan). Anda dapat mengunduhnya dari [nodejs.org](https://nodejs.org/).

### Langkah 1: Instal Dependensi

Buka terminal di direktori root proyek dan jalankan perintah berikut untuk menginstal dependensi backend (Express, CORS, Socket.IO).

```bash
npm install
```

### Langkah 2: Jalankan Server

Setelah dependensi terinstal, mulai server backend dengan perintah:

```bash
npm start
```

Perintah ini akan:
1.  Memulai server web lokal, biasanya di `http://localhost:3001`.
2.  Menyajikan file statis aplikasi React (`index.html`, `index.tsx`, dll.).
3.  Menyediakan endpoint API (misalnya, `/api/data`) yang digunakan aplikasi React untuk membaca dan menulis data ke `db.json`.

### Langkah 3: Akses Aplikasi

Buka browser web Anda dan navigasikan ke:

**http://localhost:3001**

Aplikasi akan dimuat, dan setiap perubahan yang Anda buat akan disimpan ke file `db.json`, membuat data Anda persisten antar sesi browser.

---

## Deployment di Fly.io

Aplikasi ini telah dikonfigurasi untuk di-deploy di Fly.io, yang mendukung aplikasi Node.js dan penyimpanan persisten.

### Prasyarat

-   Buat akun di [Fly.io](https://fly.io/docs/hands-on/start/).
-   Instal `flyctl` (CLI dari Fly.io). Ikuti panduan instalasi di [dokumentasi resmi](https://fly.io/docs/hands-on/install-flyctl/).
-   Login ke akun Fly Anda melalui terminal: `fly auth login`.

### Langkah 1: Launch Aplikasi

1.  Buka terminal di direktori root proyek Anda.
2.  Jalankan perintah `fly launch`. Perintah ini akan memindai proyek Anda dan menanyakan beberapa hal:
    *   **App Name:** Beri nama unik untuk aplikasi Anda (misalnya, `kazumi-dashboard-anda`).
    *   **Choose a region:** Pilih region yang paling dekat dengan Anda atau target audiens Anda (misalnya, `sin` untuk Singapore).
    *   **PostgreSQL Database?** Jawab `n` (No). Kita akan menggunakan file `db.json` dengan volume.
    *   **Deploy now?** Jawab `n` (No). Kita perlu membuat volume penyimpanan terlebih dahulu.

    Perintah ini akan membuat file `fly.toml` jika belum ada. File yang sudah ada di proyek ini sudah dikonfigurasi, jadi Anda bisa menimpanya atau memastikan konfigurasinya sesuai.

### Langkah 2: Buat Volume Penyimpanan (Sangat Penting!)

Agar data (`db.json`) dan gambar yang diunggah tidak hilang, kita perlu membuat volume penyimpanan persisten.

1.  Jalankan perintah berikut di terminal. Ganti `<region>` dengan region yang Anda pilih di langkah sebelumnya.

    ```bash
    fly volumes create kazumi_data --region <region> --size 1
    ```

    *   `kazumi_data` adalah nama volume. Nama ini **harus sama** dengan yang dikonfigurasi di `fly.toml`.
    *   `--size 1` berarti membuat volume sebesar 1 GB, yang sudah lebih dari cukup.

### Langkah 3: Deploy Aplikasi

Setelah volume berhasil dibuat, Anda siap untuk men-deploy aplikasi.

1.  Jalankan perintah:

    ```bash
    fly deploy
    ```

2.  `flyctl` akan membaca `Dockerfile` Anda, membangun image container, mendorongnya ke registry Fly.io, dan menjalankan aplikasi Anda. Proses ini mungkin memakan waktu beberapa menit pada deploy pertama.

### Langkah 4: Akses Aplikasi Anda

Setelah deployment selesai, `flyctl` akan memberikan URL publik untuk aplikasi Anda. Anda juga bisa menjalankan `fly status` untuk melihat detail dan URL aplikasi Anda.

Buka URL tersebut di browser, dan aplikasi Kazumi Anda kini sudah live!

**Catatan:** Pada paket gratis Fly.io, mesin virtual akan berhenti jika tidak ada traffic. Permintaan pertama setelah periode tidak aktif mungkin akan sedikit lebih lambat saat mesin dihidupkan kembali. Data Anda akan tetap aman di volume yang telah dibuat.