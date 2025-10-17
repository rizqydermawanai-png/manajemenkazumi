import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { Buffer } from 'buffer';
import http from 'http';
import { Server } from 'socket.io';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH"]
    }
});

// --- Deployment-aware Configuration ---
// Check if running in a Fly.io environment
const isFly = !!process.env.FLY_APP_NAME;
// Use /data for persistent storage on Fly.io, otherwise use the local directory
const dataDir = isFly ? '/data' : __dirname;
// Use the port provided by the environment, or 3001 for local development
const port = process.env.PORT || 3001;

const dbPath = path.join(dataDir, 'db.json');
const uploadDir = path.join(dataDir, 'uploads');

console.log(`[Config] Running in ${isFly ? 'Fly.io' : 'Local'} environment.`);
console.log(`[Config] Database path: ${dbPath}`);
console.log(`[Config] Uploads directory: ${uploadDir}`);
console.log(`[Config] Listening on port: ${port}`);


// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// --- API Routes ---
const apiRouter = express.Router();

apiRouter.get('/data', async (req, res) => {
    try {
        const data = await fs.readFile(dbPath, 'utf-8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading database file:', error);
        res.status(500).json({ error: 'Could not read data from the server.' });
    }
});

apiRouter.patch('/data', async (req, res) => {
    try {
        const currentData = JSON.parse(await fs.readFile(dbPath, 'utf-8'));
        const updatedData = { ...currentData, ...req.body };
        await fs.writeFile(dbPath, JSON.stringify(updatedData, null, 2), 'utf-8');
        
        io.emit('data_updated', req.body);
        
        res.json({ success: true, message: 'Data updated and broadcasted.' });
    } catch (error) {
        console.error('Error writing partial data to database file:', error);
        res.status(500).json({ error: 'Could not save data to the server.' });
    }
});

apiRouter.post('/upload', async (req, res) => {
    try {
        const { image } = req.body;
        if (!image || !image.startsWith('data:image')) {
            return res.status(400).json({ error: 'Invalid image data' });
        }

        const matches = image.match(/^data:(image\/(\w+));base64,(.+)$/);
        if (!matches || matches.length !== 4) {
            return res.status(400).json({ error: 'Invalid image format' });
        }
        
        const extension = matches[2];
        const base64Data = matches[3];
        
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const filePath = path.join(uploadDir, filename);

        await fs.writeFile(filePath, buffer);

        const url = `/uploads/${filename}`;
        res.status(201).json({ url });

    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Server error during image upload.' });
    }
});

apiRouter.post('/shipping-cost', async (req, res) => {
    const { destination, weightInGrams } = req.body;
    if (!destination || !destination.city || !weightInGrams) {
        return res.status(400).json({ error: 'Missing destination city or weight' });
    }
    
    const randomBaseCost = 9000 + Math.random() * 25000;
    const simulatedResponse = [
        { code: 'jne', service: 'REG', description: 'JNE Reguler', cost: Math.round(randomBaseCost / 1000) * 1000, etd: '2-3 HARI' },
        { code: 'jnt', service: 'EZ', description: 'J&T Regular', cost: Math.round((randomBaseCost * 0.95) / 1000) * 1000, etd: '1-3 HARI' },
        { code: 'pos', service: 'Paket Kilat Khusus', description: 'POS Kilat Khusus', cost: Math.round((randomBaseCost * 1.1) / 1000) * 1000, etd: '2-4 HARI' },
    ];
    
    res.json(simulatedResponse);
});

apiRouter.post('/track-package', async (req, res) => {
    const { trackingNumber, courier } = req.body;
    if (!trackingNumber || !courier) {
        return res.status(400).json({ error: 'Missing tracking number or courier' });
    }
    
    const now = new Date();
    const simulatedResponse = [
        { timestamp: new Date(now.setDate(now.getDate() - 2)).toISOString(), status: 'Paket telah di-pickup oleh kurir', location: 'Bandung' },
        { timestamp: new Date(now.setDate(now.getDate() + 1)).toISOString(), status: 'Paket sedang diproses di gudang sortir', location: 'Bandung' },
        { timestamp: new Date(now.setDate(now.getDate() + 1)).toISOString(), status: 'Paket dalam perjalanan menuju kota tujuan', location: 'Jakarta' },
        { timestamp: new Date().toISOString(), status: 'Paket sedang diantar oleh kurir ke alamat Anda', location: 'Jakarta' },
    ].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(simulatedResponse);
});

app.use('/api', apiRouter);

// --- Static File Serving ---
// Serve uploaded files from the correct directory (local or /data)
app.use('/uploads', express.static(uploadDir));
// Serve the main application files from the project directory
app.use(express.static(__dirname));

// Fallback for Single Page Application (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start Server ---
const startServer = async () => {
    try {
        // Ensure the upload directory exists in the correct location
        await fs.mkdir(uploadDir, { recursive: true });

        // On Fly.io, check if the database exists in the persistent volume.
        // If not, copy the initial db.json from the app's build context.
        // This is crucial for the very first deployment.
        if (isFly) {
            try {
                await fs.access(dbPath);
                console.log('Database file found in persistent volume.');
            } catch (error) {
                console.log('Database file not found in volume. Copying initial database...');
                const initialDbPath = path.join(__dirname, 'db.json');
                await fs.copyFile(initialDbPath, dbPath);
                console.log('Initial database copied successfully.');
            }
        } else {
            // For local development, ensure db.json exists
             try {
                await fs.access(dbPath);
            } catch (error) {
                console.log('Local db.json not found. Creating one...');
                const localDbContent = await fs.readFile(path.join(__dirname, 'db.json'), 'utf-8').catch(() => '{}');
                await fs.writeFile(dbPath, localDbContent);
                console.log('Local db.json initialized.');
            }
        }
        
        server.listen(port, () => {
            console.log(`Kazumi server running at http://localhost:${port}`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};

startServer();