# Kazumi ERP & E-commerce: Panduan Deployment dan Transformasi Real-Time

Dokumen ini adalah panduan lengkap untuk mendeploy aplikasi Kazumi secara online dan mengubah arsitekturnya dari **client-side (menggunakan localStorage)** menjadi **full-stack dengan data real-time**.

## 1. Memahami Arsitektur Aplikasi Saat Ini

Aplikasi Anda saat ini berjalan sepenuhnya di browser pengguna (client-side). Seluruh data (pengguna, produk, penjualan, dll.) disimpan di `localStorage`.

- **Kelebihan:** Sangat cepat dan bisa berjalan offline (di satu browser).
- **Kekurangan Fatal:** Data **terisolasi** di dalam browser masing-masing pengguna. Artinya, data tidak dapat dibagi atau disinkronkan antar perangkat atau antar pengguna. Ini bukanlah aplikasi "online real-time".

## 2. Target: Menjadi Aplikasi Online Real-Time

Untuk mencapai tujuan ini, kita perlu arsitektur client-server:

1.  **Frontend (Aplikasi React Anda):** Bertugas menampilkan antarmuka dan berkomunikasi dengan backend.
2.  **Backend (Server):** "Otak" aplikasi yang berjalan 24/7. Bertugas mengelola logika bisnis dan berinteraksi dengan database.
3.  **Database:** Pusat penyimpanan data. Semua pengguna akan mengakses data yang sama dari sini.

## 3. Deployment di InfinityFree (Sebagai Situs Statis)

InfinityFree adalah layanan hosting gratis yang bagus untuk situs statis (HTML, CSS, JS) dan PHP/MySQL. Namun, **hosting gratis InfinityFree TIDAK MENDUKUNG Node.js**, yang diperlukan untuk backend `server.mjs` Anda.

Oleh karena itu, langkah di bawah ini akan memandu Anda untuk mendeploy aplikasi sebagai **situs statis**. Aplikasi akan online dan bisa diakses, tetapi datanya tetap menggunakan `localStorage` (tidak real-time antar pengguna).

### Langkah 1: Build Aplikasi React Anda

Kita perlu meng-compile kode React (`.tsx`) menjadi file HTML, CSS, dan JavaScript statis. Kita akan menggunakan `Vite` untuk ini.

1.  **Install Vite:** Buka terminal di folder proyek Anda dan jalankan:
    ```bash
    npm install -D vite @vitejs/plugin-react
    ```

2.  **Buat File Konfigurasi Vite:** Buat file baru bernama `vite.config.js` di folder utama proyek Anda dan isi dengan kode berikut:
    ```javascript
    import { defineConfig } from 'vite';
    import react from '@vitejs/plugin-react';

    export default defineConfig({
      plugins: [react()],
      build: {
        outDir: 'dist' // Folder output hasil build
      }
    });
    ```
    
3.  **Update `package.json`**: Ganti bagian `"scripts"` pada file `package.json` Anda dengan ini:
    ```json
    "scripts": {
      "dev": "vite",
      "build": "vite build"
    },
    ```

4.  **Jalankan Proses Build:**
    ```bash
    npm run build
    ```
    Setelah selesai, akan muncul folder baru bernama `dist` yang berisi semua file yang siap diunggah.

### Langkah 2: Upload ke InfinityFree

1.  **Daftar & Buat Akun Hosting:** Buat akun di [InfinityFree](https://www.infinityfree.com/) dan buat akun hosting baru dengan subdomain gratis atau domain Anda sendiri.

2.  **Buka File Manager:** Dari Control Panel (cPanel) InfinityFree, buka **File Manager**.

3.  **Upload File:**
    -   Masuk ke dalam folder `htdocs`. **PENTING:** Jangan hapus file yang sudah ada di dalamnya.
    -   Klik tombol **"Upload"**.
    -   Pilih **"Upload Folder"** dan pilih folder `dist` yang dibuat pada langkah sebelumnya. InfinityFree akan mengunggah seluruh isinya.
    -   **Pindahkan File:** Setelah upload selesai, semua file Anda akan berada di dalam `htdocs/dist`. Pindahkan **semua isi** dari folder `dist` ke folder `htdocs`.
    -   Struktur akhir di `htdocs` akan terlihat seperti ini: `index.html`, `assets/`, dll.
    -   Hapus folder `dist` yang sekarang kosong.

4.  **Selesai!** Buka domain atau subdomain Anda. Aplikasi Anda sekarang sudah online.

**Penting:** Ingat, dengan metode ini, aplikasi masih menggunakan `localStorage`. Data tidak akan tersinkronisasi antar perangkat.

## 4. Cara Mencapai Aplikasi Real-Time (Rekomendasi)

Karena InfinityFree tidak mendukung Node.js, Anda memerlukan pendekatan atau penyedia hosting yang berbeda.

### Opsi 1: Gunakan Hosting yang Mendukung Node.js (Rekomendasi)

Ini adalah jalur paling profesional dan sesuai dengan file `server.mjs` yang sudah ada.

-   **Penyedia:**
    -   **Gratis/Freemium:** [Render](https://render.com/), [Railway](https://railway.app/), [Vercel](https://vercel.com/) (Vercel bagus untuk frontend, backend bisa di Render/Railway).
    -   **Berbayar (Seperti di README awal):** [Hostinger](https://www.hostinger.com/) (paket Business ke atas), DigitalOcean, dll.
-   **Proses Umum:**
    1.  Deploy **Frontend** (isi folder `dist`) sebagai "Static Site".
    2.  Deploy **Backend** (folder `backend` Anda) sebagai "Node.js Service".
    3.  Siapkan **Database** (misalnya PostgreSQL di Render atau MySQL di Hostinger).
    4.  Hubungkan ketiganya menggunakan *environment variables*.

### Opsi 2: Gunakan Backend-as-a-Service (BaaS) seperti Firebase

Ini adalah cara modern dan cepat untuk membuat aplikasi real-time tanpa mengelola server sendiri.

-   **Layanan:** [Google Firebase](https://firebase.google.com/) (memiliki paket gratis yang sangat memadai).
-   **Cara Kerja:**
    1.  Anda mendaftar di Firebase dan membuat proyek baru.
    2.  Gunakan **Firestore** atau **Realtime Database** untuk menyimpan data Anda.
    3.  Gunakan **Firebase Authentication** untuk mengelola login pengguna.
    4.  Aplikasi React Anda akan langsung terhubung ke Firebase menggunakan SDK resmi dari Google.
-   **Kelebihan:** Sangat cepat untuk dikembangkan, skalabel, dan memiliki fitur real-time bawaan. Anda tidak perlu pusing memikirkan hosting backend.

Dengan mengikuti salah satu dari dua opsi di atas, Anda dapat mengubah aplikasi Kazumi menjadi aplikasi online yang canggih dengan data yang tersinkronisasi secara real-time untuk semua pengguna.
