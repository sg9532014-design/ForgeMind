const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const bcrypt = require('bcryptjs'); // Usamos bcryptjs para evitar errores de compilación en Render

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Mercado Pago
const mpAccessToken = process.env.MERCADOPAGO_TOKEN;
const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
const FRONTEND_URL = process.env.FRONTEND_URL || "https://forgemind-lf3.onrender.com";

// Middlewares
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Base de datos en archivo JSON (Persistencia simple)
const USERS_FILE = path.join(__dirname, 'usuarios.json');
let usuarios = [];

if (fs.existsSync(USERS_FILE)) {
    try { usuarios = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8')); } 
    catch (e) { usuarios = []; }
}

function guardarUsuarios() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
}

// 1. REGISTRO
app.post('/api/registrar', async (req, res) => {
    try {
        const { username, password, plan } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, message: 'Usuario y contraseña son requeridos' });
        if (usuarios.find(u => u.username === username)) return res.status(400).json({ success: false, message: 'El usuario ya existe' });

        const hashedPassword = await bcrypt.hash(password, 10);
        usuarios.push({ username, password: hashedPassword, plan: plan || 'basico', fecha: new Date().toISOString() });
        guardarUsuarios();

        res.status(201).json({ success: true, message: 'Usuario registrado con éxito' });
    } catch (error) {
        console.error('Error registro:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// 2. LOGIN
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuario = usuarios.find(u => u.username === username);
        if (!usuario) return res.status(401).json({ success: false, message: 'Usuario no encontrado' });

        const match = await bcrypt.compare(password, usuario.password);
        if (!match) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

        res.status(200).json({ success: true, message: 'Bienvenido', user: { username: usuario.username, plan: usuario.plan } });
    } catch (error) {
        console.error('Error login:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
});

// 3. CREAR PAGO (Mercado Pago)
app.post('/api/crear-pago', async (req, res) => {
    try {
        const { id_guia, nombre_guia, precio, usuario } = req.body;
        if (!mpAccessToken) return res.status(500).json({ success: false, message: 'Token de MP no configurado en el servidor' });

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{ title: nombre_guia || 'Guía ForgeMind', quantity: 1, unit_price: Number(precio) || 100, currency_id: 'MXN' }],
                back_urls: { success: FRONTEND_URL, failure: FRONTEND_URL, pending: FRONTEND_URL },
                auto_return: 'approved',
                metadata: { usuario, id_guia }
            }
        });
        res.json({ success: true, init_point: result.init_point });
    } catch (error) {
        console.error("Error Mercado Pago:", error);
        const errorMsg = error.cause ? error.cause.message : error.message;
        res.status(500).json({ success: false, message: 'Error al procesar el pago', details: errorMsg });
    }
});

// 4. DIAGNÓSTICO (Para verificar que todo está bien)
app.get('/api/diagnostico', (req, res) => {
    res.json({
        status: 'OK',
        mpTokenConfigurado: !!mpAccessToken,
        mpTokenEmpiezaCon: mpAccessToken ? mpAccessToken.substring(0, 8) + '...' : 'Ninguno',
        usuariosRegistrados: usuarios.length,
        frontendUrl: FRONTEND_URL
    });
});

app.listen(PORT, () => {
    console.log(`Servidor ForgeMind corriendo en puerto ${PORT}`);
});
