const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { MercadoPagoConfig, Preference } = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CONFIGURACIÓN DE MERCADO PAGO ---
// REEMPLAZA CON TU ACCESS TOKEN REAL
const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_TOKEN });


app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Sirve tus archivos index.html y script.js

// --- BASE DE DATOS TEMPORAL (EN MEMORIA) ---
// Nota: En producción, usa una base de datos real como MongoDB o PostgreSQL
let usuarios = [];

// --- RUTA: REGISTRO ---
app.post('/api/registrar', (req, res) => {
    const { username, password, plan } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ message: 'Usuario y contraseña requeridos' });
    }

    const usuarioExiste = usuarios.find(u => u.username === username);
    if (usuarioExiste) {
        return res.status(400).json({ message: 'El usuario ya existe' });
    }

    usuarios.push({ username, password, plan });
    console.log('Nuevo usuario registrado:', username);
    res.status(200).json({ message: 'Usuario creado con éxito' });
});

// --- RUTA: LOGIN ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const usuario = usuarios.find(u => u.username === username && u.password === password);

    if (usuario) {
        res.status(200).json({ message: 'Bienvenido ' + username });
    } else {
        res.status(401).json({ message: 'Credenciales incorrectas' });
    }
});

// --- RUTA: CREAR PAGO (MERCADO PAGO) ---
app.post('/api/crear-pago', async (req, res) => {
    try {
        const { id_guia, nombre_guia, precio, usuario } = req.body;

        const preference = new Preference(client);
        const result = await preference.create({
            body: {
                items: [
                    {
                        title: nombre_guia,
                        quantity: 1,
                        unit_price: Number(precio),
                        currency_id: 'MXN'
                    }
                ],
                back_urls: {
                    success: 'https://curatumaquina-com.onrender.com/success',
                    failure: 'https://curatumaquina-com.onrender.com/failure',
                    pending: 'https://curatumaquina-com.onrender.com/pending'
                },
                auto_return: 'approved',
                metadata: {
                    usuario: usuario,
                    id_guia: id_guia
                }
            }
        });

        res.json({ init_point: result.init_point });
    } catch (error) {
        console.error('Error al crear preferencia de Mercado Pago:', error);
        res.status(500).json({ message: 'Error al procesar el pago' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor ForgeMind corriendo en puerto ${PORT}`);
});
