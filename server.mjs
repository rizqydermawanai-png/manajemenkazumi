// server.mjs
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import mysql from 'mysql2/promise';

const app = express();
const port = 3001; // Port untuk server proxy, jangan sama dengan port aplikasi utama

app.use(cors());
app.use(express.json());

// Konfigurasi database MySQL InfinityFree
const dbConfig = {
    host: 'sql312.infinityfree.com',
    user: 'if0_40280057',
    password: 'ikibrokol1',
    database: 'if0_40280057_kazumi_database',
    port: 3306
};

// Fungsi untuk membuat koneksi database
async function getConnection() {
    return await mysql.createConnection(dbConfig);
}

// --- KONFIGURASI PENTING ---
// Kunci API RajaOngkir Anda. Sebaiknya disimpan sebagai environment variable.
// Untuk sekarang, Anda bisa mengganti 'YOUR_RAJAONGKIR_API_KEY_HERE' dengan kunci API Anda.
const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY || 'YOUR_RAJAONGKIR_API_KEY_HERE';
const RAJAONGKIR_BASE_URL = 'https://api.rajaongkir.com/starter'; // Ganti ke 'pro' jika Anda menggunakan akun Pro

// ID kota asal pengiriman (Contoh: Bandung)
const ORIGIN_CITY_ID = '23';

// --- MOCKUP / SIMULASI PENCARIAN ID KOTA ---
// Dalam aplikasi nyata, Anda akan memiliki daftar lengkap dari API RajaOngkir atau database.
// Ini adalah simulasi sederhana untuk tujuan demo.
const cityNameToIdMap = {
    'bandung': '23',
    'jakarta': '151', // Ini adalah ID untuk "Kota Jakarta Pusat", Anda perlu lebih spesifik
    'jakarta pusat': '151',
    'jakarta barat': '150',
    'jakarta selatan': '152',
    'jakarta timur': '153',
    'jakarta utara': '154',
    'surabaya': '444',
    'medan': '222',
    'makassar': '211'
};

const findCityId = (cityName) => {
    const lowerCityName = cityName.toLowerCase();
    return cityNameToIdMap[lowerCityName] || null;
};


// Endpoint untuk menghitung ongkos kirim
app.post('/api/shipping-cost', async (req, res) => {
    const { destinationCity, weight } = req.body;

    if (!destinationCity || !weight) {
        return res.status(400).json({ error: 'Parameter "destinationCity" dan "weight" diperlukan.' });
    }

    const destinationCityId = findCityId(destinationCity);

    if (!destinationCityId) {
        return res.status(404).json({ error: `ID untuk kota "${destinationCity}" tidak ditemukan. Gunakan nama kota yang lebih spesifik.` });
    }

    try {
        const couriers = 'jne:jnt:pos'; // Kurir yang ingin dicek, dipisahkan oleh titik dua

        const response = await fetch(`${RAJAONGKIR_BASE_URL}/cost`, {
            method: 'POST',
            headers: {
                'key': RAJAONGKIR_API_KEY,
                'content-type': 'application/x-www-form-urlencoded',
            },
            body: `origin=${ORIGIN_CITY_ID}&destination=${destinationCityId}&weight=${weight}&courier=${couriers}`
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.rajaongkir.status.description);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('RajaOngkir API Error:', error);
        res.status(500).json({ error: `Gagal mengambil data ongkos kirim: ${error.message}` });
    }
});

// Endpoint untuk melacak paket
app.post('/api/track-package', async (req, res) => {
    const { trackingNumber, courier } = req.body;

    if (!trackingNumber || !courier) {
        return res.status(400).json({ error: 'Parameter "trackingNumber" dan "courier" diperlukan.' });
    }

    try {
        const response = await fetch(`${RAJAONGKIR_BASE_URL}/waybill`, {
            method: 'POST',
            headers: {
                'key': RAJAONGKIR_API_KEY,
                'content-type': 'application/x-www-form-urlencoded',
            },
            body: `waybill=${trackingNumber}&courier=${courier}`
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.rajaongkir.status.description);
        }

        const data = await response.json();
        res.json(data);

    } catch (error) {
        console.error('RajaOngkir Tracking API Error:', error);
        res.status(500).json({ error: `Gagal melacak paket: ${error.message}` });
    }
});


// Endpoint untuk menyimpan data ke database
app.post('/api/save-data', async (req, res) => {
    const { table, data } = req.body;

    if (!table || !data) {
        return res.status(400).json({ error: 'Parameter "table" dan "data" diperlukan.' });
    }

    try {
        const connection = await getConnection();

        // Buat tabel jika belum ada (untuk demo, kita buat tabel dinamis)
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS \`${table}\` (
                id INT AUTO_INCREMENT PRIMARY KEY,
                data JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        await connection.execute(createTableQuery);

        // Simpan data
        const insertQuery = `INSERT INTO \`${table}\` (data) VALUES (?)`;
        const [result] = await connection.execute(insertQuery, [JSON.stringify(data)]);

        await connection.end();

        res.json({ success: true, id: result.insertId, message: 'Data berhasil disimpan.' });

    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ error: `Gagal menyimpan data: ${error.message}` });
    }
});

// Endpoint untuk mengambil data dari database
app.get('/api/get-data/:table', async (req, res) => {
    const { table } = req.params;

    try {
        const connection = await getConnection();

        const selectQuery = `SELECT * FROM \`${table}\` ORDER BY created_at DESC`;
        const [rows] = await connection.execute(selectQuery);

        await connection.end();

        // Parse JSON data
        const parsedData = rows.map(row => ({
            id: row.id,
            ...JSON.parse(row.data),
            created_at: row.created_at
        }));

        res.json(parsedData);

    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ error: `Gagal mengambil data: ${error.message}` });
    }
});

// Endpoint untuk update data
app.put('/api/update-data/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const { data } = req.body;

    if (!data) {
        return res.status(400).json({ error: 'Parameter "data" diperlukan.' });
    }

    try {
        const connection = await getConnection();

        const updateQuery = `UPDATE \`${table}\` SET data = ? WHERE id = ?`;
        const [result] = await connection.execute(updateQuery, [JSON.stringify(data), id]);

        await connection.end();

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Data berhasil diupdate.' });
        } else {
            res.status(404).json({ error: 'Data tidak ditemukan.' });
        }

    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ error: `Gagal update data: ${error.message}` });
    }
});

// Endpoint untuk hapus data
app.delete('/api/delete-data/:table/:id', async (req, res) => {
    const { table, id } = req.params;

    try {
        const connection = await getConnection();

        const deleteQuery = `DELETE FROM \`${table}\` WHERE id = ?`;
        const [result] = await connection.execute(deleteQuery, [id]);

        await connection.end();

        if (result.affectedRows > 0) {
            res.json({ success: true, message: 'Data berhasil dihapus.' });
        } else {
            res.status(404).json({ error: 'Data tidak ditemukan.' });
        }

    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).json({ error: `Gagal hapus data: ${error.message}` });
    }
});

app.listen(port, () => {
    console.log(`================================================`);
    console.log(`  🚀 Server API dengan Database berjalan di http://localhost:${port}`);
    console.log(`================================================`);
    console.log(`  Database: MySQL di InfinityFree`);
    console.log(`  PENTING: Pastikan Anda telah memasukkan RAJAONGKIR_API_KEY di file server.mjs.`);
    console.log(`  Jalankan server ini dengan 'node server.mjs' dari terminal.`);
});
