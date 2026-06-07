const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 10000; 

const mpAccessToken = process.env.MERCADOPAGO_TOKEN;
const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
const FRONTEND_URL = process.env.FRONTEND_URL || "https://onrender.com";

const allowedOrigins = [
    FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
];

const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const allowed = allowedOrigins.some(allowedOrigin => allowedOrigin === origin);
        const railway = /^https:\/\/[a-z0-9-]+\.railway\.app$/i.test(origin);
        const render = /^https:\/\/[a-z0-9-]+\.onrender\.com$/i.test(origin);
        callback(null, allowed || railway || render);
    },
    credentials: true,
    methods: ['GET', 'POST']
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

const USERS_FILE = path.join(__dirname, 'usuarios.json');
let usuarios = [];

if (fs.existsSync(USERS_FILE)) {
    try { usuarios = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } 
    catch (e) { usuarios = []; }
}

function guardarUsuarios() {
    try { fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2)); } 
    catch (e) { console.error('Guardado seguro en memoria:', e); }
}

app.get('/api/diagnostico', (req, res) => {
    res.status(200).json({ status: 'OK', mpTokenConfigurado: !!mpAccessToken, usuariosRegistrados: usuarios.length });
});

app.post('/api/registrar', async (req, res) => {
    try {
        const { username, password, plan } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, message: 'Campos requeridos' });
        if (usuarios.find(u => u.username === username)) return res.status(400).json({ success: false, message: 'El usuario ya existe' });
        const hashedPassword = await bcrypt.hash(password, 10);
        usuarios.push({ username, password: hashedPassword, plan: plan || 'basico', fecha: new Date().toISOString() });
        guardarUsuarios();
        res.status(201).json({ success: true, message: 'Usuario registrado con éxito' });
    } catch (error) { res.status(500).json({ success: false, message: 'Error interno' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuario = usuarios.find(u => u.username === username);
        if (!usuario) return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
        const match = await bcrypt.compare(password, usuario.password);
        if (!match) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });
        res.status(200).json({ success: true, message: 'Bienvenido', user: { username: usuario.username, plan: usuario.plan } });
    } catch (error) { res.status(500).json({ success: false, message: 'Error interno' }); }
});

app.post('/api/crear-pago', async (req, res) => {
    try {
        const { id_guia, nombre_guia, precio, usuario } = req.body;
        if (!mpAccessToken) return res.status(500).json({ success: false, message: 'Token MP faltante' });
        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{ title: nombre_guia, quantity: 1, unit_price: Number(precio), currency_id: 'MXN' }],
                back_urls: { success: FRONTEND_URL, failure: FRONTEND_URL, pending: FRONTEND_URL },
                auto_return: 'approved',
                metadata: { usuario, id_guia }
            }
        });
        res.json({ success: true, init_point: result.init_point });
    } catch (error) { res.status(500).json({ success: false, message: 'Error en pago', details: error.message }); }
});

app.listen(PORT, '0.0.0.0', () => { console.log(`Backend listo en puerto ${PORT}`); });
