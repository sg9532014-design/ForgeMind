const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const { MercadoPagoConfig, Preference } = require('mercadopago');
const bcrypt = require('bcrypt');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de Mercado Pago
const client = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADOPAGO_TOKEN 
});

// URLs de tu proyecto
const FRONTEND_URL = "https://forgemind-lf3.onrender.com";

app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(express.json());
app.use(express.static(path.join(__dirname, '.')));

// Archivo para persistencia de usuarios
const USERS_FILE = path.join(__dirname, 'usuarios.json');

// Cargar usuarios desde archivo
let usuarios = [];
if (fs.existsSync(USERS_FILE)) {
    usuarios = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}

// Guardar usuarios en archivo
function guardarUsuarios() {
    fs.writeFileSync(USERS_FILE, JSON.stringify(usuarios, null, 2));
}

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// REGISTRO - CON HASH DE CONTRASEÑA
app.post('/api/registrar', async (req, res) => {
    try {
        const { username, password, plan } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                message: 'Usuario y contraseña requeridos' 
            });
        }

        const usuarioExiste = usuarios.find(u => u.username === username);
        if (usuarioExiste) {
            return res.status(400).json({ 
                success: false,
                message: 'El usuario ya existe' 
            });
        }

        // Hashear contraseña
        const hashedPassword = await bcrypt.hash(password, 10);
        
        usuarios.push({ 
            username, 
            password: hashedPassword, 
            plan: plan || 'gratis',
            fechaRegistro: new Date().toISOString()
        });
        
        guardarUsuarios();
        
        res.status(200).json({ 
            success: true,
            message: 'Usuario creado con éxito' 
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al registrar usuario',
            error: error.message 
        });
    }
});

// LOGIN - CON VERIFICACIÓN DE HASH
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const usuario = usuarios.find(u => u.username === username);
        
        if (!usuario) {
            return res.status(401).json({ 
                success: false,
                message: 'Usuario no encontrado' 
            });
        }

        const passwordValida = await bcrypt.compare(password, usuario.password);
        
        if (passwordValida) {
            res.status(200).json({ 
                success: true,
                message: 'Bienvenido ' + username,
                user: {
                    username: usuario.username,
                    plan: usuario.plan
                }
            });
        } else {
            res.status(401).json({ 
                success: false,
                message: 'Credenciales incorrectas' 
            });
        }
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error al iniciar sesión',
            error: error.message 
        });
    }
});

// PAGOS
app.post('/api/crear-pago', async (req, res) => {
    try {
        const { id_guia, nombre_guia, precio, usuario } = req.body;
        
        if (!process.env.MERCADOPAGO_TOKEN) {
            return res.status(500).json({ 
                success: false,
                message: 'Falta el token de Mercado Pago en las variables de entorno' 
            });
        }

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [{ 
                    title: nombre_guia || 'Guía ForgeMind', 
                    quantity: 1, 
                    unit_price: Number(precio), 
                    currency_id: 'MXN' 
                }],
                back_urls: {
                    success: FRONTEND_URL,
                    failure: FRONTEND_URL,
                    pending: FRONTEND_URL
                },
                auto_return: 'approved',
                metadata: { 
                    usuario: usuario, 
                    id_guia: id_guia 
                }
            }
        });
        
        res.json({ 
            success: true,
            init_point: result.init_point 
        });
    } catch (error) {
        console.error("Error Mercado Pago:", error);
        res.status(500).json({ 
            success: false,
            message: 'Error al procesar el pago', 
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ForgeMind corriendo en puerto ${PORT}`);
});
