#!/bin/bash

# Script untuk deploy aplikasi Kazumi ke InfinityFree

echo "🚀 Memulai proses deployment Kazumi ke InfinityFree..."

# 1. Build aplikasi
echo "📦 Building aplikasi..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build gagal!"
    exit 1
fi

echo "✅ Build berhasil!"

# 2. Setup folder untuk upload
echo "📁 Menyiapkan file untuk upload..."

# Buat folder deploy jika belum ada
mkdir -p deploy

# Copy file build ke folder deploy
cp -r dist/* deploy/

# Buat file .htaccess untuk SPA routing (opsional)
cat > deploy/.htaccess << 'EOF'
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
EOF

echo "✅ File siap untuk upload!"

echo ""
echo "📋 Instruksi Upload Manual ke InfinityFree:"
echo "=========================================="
echo "1. Buka File Manager di InfinityFree Control Panel"
echo "2. Masuk ke folder htdocs/"
echo "3. Upload semua file dari folder 'deploy/' ke htdocs/"
echo "4. Pastikan index.html ada di root htdocs/"
echo "5. Akses aplikasi di: https://kazumi-app.infinityfreeapp.com/"
echo ""
echo "📋 Instruksi Setup Database:"
echo "============================"
echo "1. Buka phpMyAdmin di InfinityFree"
echo "2. Buat database baru: if0_40280057_kazumi_database"
echo "3. Import struktur tabel jika diperlukan"
echo ""
echo "📋 Instruksi Setup Server (Node.js):"
echo "===================================="
echo "Karena InfinityFree tidak support Node.js, gunakan:"
echo "- Railway.app (gratis)"
echo "- Render.com (gratis)"
echo "- Atau hosting lain yang support Node.js"
echo ""
echo "Deploy folder tersedia di: $(pwd)/deploy"
echo "Server file (server.mjs) perlu di-deploy terpisah"
