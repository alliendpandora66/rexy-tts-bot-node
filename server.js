const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { WebcastPushConnection } = require('tiktok-live-connector');
const tmi = require('tmi.js');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use(express.json());

// Configurar multer para subida de archivos
const soundsDir = path.join(__dirname, 'sounds');
if (!fs.existsSync(soundsDir)) fs.mkdirSync(soundsDir);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, soundsDir),
    filename: (req, file, cb) => {
        const sanitized = file.originalname.replace(/[^a-z0-9._-]/gi, '_').toLowerCase();
        cb(null, Date.now() + '_' + sanitized);
    }
});
const upload = multer({ 
    storage: storage, 
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.mp3', '.wav', '.ogg', '.webm'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de audio (.mp3, .wav, .ogg, .webm)'));
        }
    }
});

// ALMACÉN DE SESIONES
// Cada socket tiene su propia conexión a TikTok/Twitch
const sessions = new Map();

// API para subir sonidos
app.post('/api/upload-sound', upload.single('sound'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });
    
    const soundName = path.basename(req.file.filename, path.extname(req.file.filename));
    res.json({ 
        success: true, 
        filename: req.file.filename,
        name: soundName,
        url: `/sounds/${req.file.filename}`
    });
});

// API para listar sonidos
app.get('/api/sounds', (req, res) => {
    fs.readdir(soundsDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Error al leer carpeta' });
        const sounds = files.map(f => ({ filename: f, url: `/sounds/${f}` }));
        res.json(sounds);
    });
});

// API para eliminar sonido
app.delete('/api/sounds/:filename', (req, res) => {
    const filepath = path.join(soundsDir, req.params.filename);
    if (!filepath.startsWith(soundsDir)) return res.status(400).json({ error: 'Acceso denegado' });
    
    fs.unlink(filepath, (err) => {
        if (err) return res.status(500).json({ error: 'Error al eliminar' });
        res.json({ success: true });
    });
});

console.clear();
console.log("========================================");
console.log("   Rexy | VOX TTS - Server MultiSession");
console.log("========================================");

function cleanUsername(input) {
    if (!input) return "";
    let clean = input.trim();
    try {
        if (clean.includes('tiktok.com')) {
            const match = clean.match(/@([a-zA-Z0-9_.]+)/);
            if (match && match[1]) return match[1];
        }
        if (clean.includes('twitch.tv')) return clean.split('/').pop();
    } catch (e) {}
    return clean.replace('https://', '').replace('http://', '').replace('www.', '').replace('@', '').replace('/live', '').replace('/', '');
}

io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    // Inicializar sesión vacía
    sessions.set(socket.id, { client: null, platform: null });

    socket.on('start-connection', async (data) => {
        const platform = data.platform;
        const username = cleanUsername(data.url);
        const session = sessions.get(socket.id);

        // 1. Limpiar conexión previa DE ESTE USUARIO
        if (session.client) {
            try { session.client.disconnect(); } catch (e) {}
            session.client = null;
        }

        session.platform = platform;
        console.log(`[${socket.id}] Conectando a ${platform}: ${username}`);

        // --- TIKTOK ---
        if (platform === 'tiktok') {
            const client = new WebcastPushConnection(username, {
                processInitialData: false,
                enableExtendedGiftInfo: true,
                enableWebsocketUpgrade: true,
                requestPollingIntervalMs: 2000,
                clientParams: { app_language: 'es-MX', device_platform: 'web' }
            });

            client.connect().then(state => {
                socket.emit('status', { msg: `✅ Conectado a ${username}`, connected: true });
            }).catch(err => {
                socket.emit('status', { msg: `❌ Error: ${err.message || 'Desconocido'}`, connected: false });
            });

            client.on('chat', data => {
                socket.emit('chat-message', {
                    user: data.uniqueId,
                    nickname: data.nickname,
                    comment: data.comment,
                    platform: 'tiktok',
                    isMod: data.isModerator,
                    isSub: data.isSubscriber
                });
            });

            client.on('streamEnd', () => socket.emit('status', { msg: '⚠️ Live terminado.', connected: false }));
            
            // Guardamos el cliente en la sesión del usuario
            session.client = client;
        }

        // --- TWITCH ---
        else if (platform === 'twitch') {
            const client = new tmi.Client({ channels: [username] });

            client.connect().then(() => {
                socket.emit('status', { msg: `✅ Twitch: ${username}`, connected: true });
            }).catch(err => {
                socket.emit('status', { msg: `❌ Error Twitch`, connected: false });
            });

            client.on('message', (channel, tags, message, self) => {
                socket.emit('chat-message', {
                    user: tags['display-name'] || tags['username'],
                    nickname: tags['display-name'],
                    comment: message,
                    platform: 'twitch',
                    isMod: tags.mod,
                    isSub: tags.subscriber
                });
            });

            session.client = client;
        }
    });

    socket.on('stop-connection', () => {
        const session = sessions.get(socket.id);
        if (session && session.client) {
            try { session.client.disconnect(); } catch (e) {}
            session.client = null;
        }
        socket.emit('status', { msg: '⏹️ Desconectado.', connected: false });
    });

    socket.on('disconnect', () => {
        // Limpieza automática cuando se cierra la pestaña
        const session = sessions.get(socket.id);
        if (session && session.client) {
            console.log(`Limpiando sesión de ${socket.id}`);
            try { session.client.disconnect(); } catch (e) {}
        }
        sessions.delete(socket.id);
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`> Servidor Multisesión listo en: http://localhost:${PORT}`);
});