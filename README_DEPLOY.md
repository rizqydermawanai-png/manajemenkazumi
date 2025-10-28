# Panduan Deployment Kazumi ERP ke InfinityFree

## ✅ Yang Sudah Disiapkan

1. **Aplikasi Frontend**: Sudah di-build dan siap deploy di folder `deploy/`
2. **Database Service**: Sudah terintegrasi dengan MySQL InfinityFree
3. **Server API**: File `server.mjs` siap di-deploy ke hosting Node.js

## 🚀 Langkah Deployment

### 1. Upload Frontend ke InfinityFree

1. Buka **InfinityFree Control Panel**
2. Pergi ke **File Manager**
3. Masuk ke folder `htdocs/`
4. Upload semua file dari folder `deploy/` ke `htdocs/`
5. Pastikan `index.html` ada di root `htdocs/`

### 2. Setup Database MySQL

1. Buka **phpMyAdmin** di InfinityFree
2. Buat database baru dengan nama: `if0_40280057_kazumi_database`
3. Database akan dibuat otomatis saat pertama kali aplikasi mengaksesnya

### 3. Deploy Backend (Server) - PENTING!

Karena InfinityFree **TIDAK MENDUKUNG Node.js**, deploy server ke hosting lain:

#### Opsi A: Railway.app (Rekomendasi - Gratis)
1. Daftar di https://railway.app
2. Connect GitHub repository
3. Deploy `server.mjs` sebagai service
4. Dapatkan URL production (contoh: `https://kazumi-server.up.railway.app`)

#### Opsi B: Render.com (Gratis)
1. Daftar di https://render.com
2. Buat **Web Service**
3. Upload file `server.mjs`
4. Set build command: `npm install`
5. Set start command: `node server.mjs`

#### Opsi C: VPS/Hosting Lain
- Hostinger, DigitalOcean, dll.

### 4. Update Konfigurasi

Setelah server di-deploy, update `lib/database.ts`:

```typescript
const API_BASE_URL = 'https://YOUR_SERVER_URL/api';
```

### 5. Environment Variables

Pastikan server memiliki environment variables:
- `RAJAONGKIR_API_KEY`: API key untuk ongkir
- Database credentials sudah di-hardcode di `server.mjs`

## 🔗 URL Akses

- **Frontend**: `https://kazumi-app.infinityfreeapp.com/`
- **Backend**: URL dari hosting Node.js Anda

## 📋 Checklist Deployment

- [ ] Frontend uploaded ke InfinityFree
- [ ] Database MySQL dibuat
- [ ] Backend di-deploy ke hosting Node.js
- [ ] API_BASE_URL di-update
- [ ] Environment variables diset
- [ ] Test login dan fungsi utama

## 🐛 Troubleshooting

### Jika aplikasi tidak loading:
- Pastikan semua file ter-upload dengan benar
- Check console browser untuk error

### Jika database error:
- Pastikan nama database benar
- Check credentials di `server.mjs`

### Jika API tidak merespon:
- Pastikan server backend running
- Check URL di `lib/database.ts`

## 📞 Support

Jika ada masalah, check:
1. Console browser (F12)
2. Network tab untuk API calls
3. Logs di hosting backend
