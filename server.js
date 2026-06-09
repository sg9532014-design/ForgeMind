const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000; 

// CONFIGURACIÓN DE MERCADO PAGO (CORREGIDA)
const mpAccessToken = process.env.MERCADOPAGO_TOKEN;

const client = new MercadoPagoConfig({ 
    accessToken: mpAccessToken 
});

const BACKEND_URL = process.env.BACKEND_URL || process.env.FRONTEND_URL || 'http://localhost:10000';
const FRONTEND_URL = process.env.FRONTEND_URL || BACKEND_URL;

const allowedOrigins = [
    FRONTEND_URL,
    BACKEND_URL,
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

const USERS_FILE = path.join(__dirname, 'usuarios.json');
const SALES_FILE = path.join(__dirname, 'ventas.json');
let usuarios = [];
let ventas = [];

if (fs.existsSync(USERS_FILE)) {
    try { usuarios = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } 
    catch (e) { usuarios = []; }
}

if (fs.existsSync(SALES_FILE)) {
    try { ventas = JSON.parse(fs.readFileSync(SALES_FILE, 'utf8')); } 
    catch (e) { ventas = []; }
}

function guardarUsuarios() {
    try { fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2)); } 
    catch (e) { console.error('Error guardando usuarios:', e); }
}

function guardarVentas() {
    try { fs.writeFileSync(SALES_FILE, JSON.stringify(ventas, null, 2)); } 
    catch (e) { console.error('Error guardando ventas:', e); }
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
        if (!mpAccessToken) return res.status(500).json({ success: false, message: 'Token MP faltante en servidor' });
        
        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{ title: nombre_guia, quantity: 1, unit_price: Number(precio), currency_id: 'ARS' }],
                back_urls: { success: FRONTEND_URL, failure: FRONTEND_URL, pending: FRONTEND_URL },
                redirect_urls: { success: FRONTEND_URL, failure: FRONTEND_URL, pending: FRONTEND_URL },
                notification_url: `${BACKEND_URL}/api/webhook/mp`,
                auto_return: 'approved',
                metadata: { usuario, id_guia }
            }
        });
        
        // Guardar la venta
        ventas.push({
            id: `venta_${Date.now()}`,
            usuario,
            id_guia,
            nombre_guia,
            precio,
            preference_id: result.id,
            fecha: new Date().toISOString(),
            estado: 'pendiente'
        });
        guardarVentas();
        
        res.json({ success: true, init_point: result.init_point });
    } catch (error) { res.status(500).json({ success: false, message: 'Error en pago', details: error.message }); }
});

// Endpoint para obtener historial de compras del usuario
app.post('/api/historial-compras', (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ success: false, message: 'Usuario requerido' });
        
        const comprasUsuario = ventas.filter(v => v.usuario === username);
        res.json({ success: true, compras: comprasUsuario });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener historial' }); }
});

// Endpoint para admin: obtener todas las ventas
app.get('/api/admin/ventas', (req, res) => {
    try {
        const token = req.headers['x-admin-token'];
        const adminToken = process.env.ADMIN_TOKEN || 'admin123';
        if (token !== adminToken) return res.status(401).json({ success: false, message: 'No autorizado' });
        
        res.json({ 
            success: true, 
            totalVentas: ventas.length,
            totalIngresos: ventas.reduce((sum, v) => sum + Number(v.precio), 0),
            ventas: ventas.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
        });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener ventas' }); }
});

// Endpoint para admin: obtener lista de usuarios
app.get('/api/admin/usuarios', (req, res) => {
    try {
        const token = req.headers['x-admin-token'];
        const adminToken = process.env.ADMIN_TOKEN || 'admin123';
        if (token !== adminToken) return res.status(401).json({ success: false, message: 'No autorizado' });
        
        const usuariosInfo = usuarios.map(u => ({
            username: u.username,
            plan: u.plan,
            fecha_registro: u.fecha,
            compras: ventas.filter(v => v.usuario === u.username).length
        }));
        
        res.json({ success: true, total: usuarios.length, usuarios: usuariosInfo });
    } catch (error) { res.status(500).json({ success: false, message: 'Error al obtener usuarios' }); }
});

// Webhook para notificaciones de MercadoPago
app.post('/api/webhook/mp', async (req, res) => {
    try {
        if (!mpAccessToken) return res.status(500).json({ success: false, message: 'Token MP no configurado' });

        const id = req.query.id || req.body.id || (req.body.data && req.body.data.id);
        if (!id) return res.status(400).json({ success: false, message: 'id de notificación requerido' });

        // Consultar el pago en la API de MercadoPago
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
            headers: { Authorization: `Bearer ${mpAccessToken}`, 'Content-Type': 'application/json' }
        });

        if (!mpRes.ok) return res.status(502).json({ success: false, message: 'Error consultando MercadoPago', status: mpRes.status });

        const payment = await mpRes.json();

        // Intentar obtener preference_id desde la respuesta
        const preferenceId = payment.preference_id || (payment.order && payment.order.id) || payment.external_reference || (payment.metadata && payment.metadata.preference_id);

        if (!preferenceId) {
            // No encontramos preference_id; respondemos OK para no provocar reenvíos indefinidos
            console.warn('Webhook MP: preference_id no encontrada en pago', payment);
            return res.status(200).json({ success: true, message: 'OK - sin preference_id' });
        }

        // Buscar la venta y actualizar su estado
        const venta = ventas.find(v => v.preference_id === preferenceId || v.preference_id === String(preferenceId));
        if (!venta) {
            console.warn('Webhook MP: venta no encontrada para preference_id', preferenceId);
            return res.status(200).json({ success: true, message: 'OK - venta no registrada localmente' });
        }

        venta.estado = 'pagado';
        venta.estado_pago = payment.status || payment.collection_status || payment.status_detail || 'approved';
        venta.fecha_pago = new Date().toISOString();
        venta.metodo_pago = payment.payment_method_id || payment.payment_type_id || 'mercadopago';
        guardarVentas();

        return res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error webhook MP:', error);
        return res.status(500).json({ success: false, message: 'Error interno en webhook' });
    }
});

// ARCHIVOS ESTÁTICOS: Después de todas las rutas API
app.use(express.static(path.join(__dirname, '.')));

app.listen(PORT, '0.0.0.0', () => { console.log(`Backend listo en puerto ${PORT}`); });
