# ForgeMind

Panel de control para análisis de video e imágenes enfocado en el mantenimiento preventivo y análisis de maquinaria.

## Características
- Registro e inicio de sesión de usuarios.
- Integración con Mercado Pago para la compra de guías técnicas.
- Interfaz moderna y funcional.
- Flujo completo de compra: registro → seleccionar plan → pagar → acceso a recursos.

## Tecnologías
- HTML5 / CSS3
- JavaScript (Vanilla)
- Node.js + Express (Backend)
- Integración con API REST y Mercado Pago

## Ejecutar localmente

### 1. Instalar dependencias:
```bash
npm install
```

### 2. Configurar variables de entorno:
Copia `.env.example` a `.env` y rellena tus datos:
```bash
cp .env.example .env
```

Edita `.env`:
```
PORT=10000
MERCADOPAGO_TOKEN=tu_token_aqui
FRONTEND_URL=http://localhost:10000
```

**Cómo obtener el token de Mercado Pago:**
1. Crea una cuenta en https://www.mercadopago.com
2. Ve a https://www.mercadopago.com/developers/panel
3. Copia tu "Access Token" (producción o desarrollo)
4. Pegalo en `.env` como `MERCADOPAGO_TOKEN=...`

### 3. Iniciar el servidor:
```bash
npm start
```

El servidor arranca en el puerto `10000` por defecto. Abre en el navegador:
```
http://localhost:10000/
```

## Flujo de Usuario

### Registro:
1. Haz clic en "Registrarse"
2. Elige un usuario y contraseña
3. Selecciona un plan (Básico o Premium)
4. Haz clic en "Registrarse"

### Inicio de Sesión:
1. Haz clic en "Iniciar Sesión"
2. Escribe tus credenciales
3. Haz clic en "Ingresar"

### Compra de Guías/Kits:
1. **Una vez logueado**, haz clic en "Comprar Guía" o "Adquirir Kit"
2. Se redirige a Mercado Pago (si está configurado)
3. Completa el pago
4. Serás redirigido de vuelta al sitio

## Probar endpoints (curl)

### Diagnóstico:
```bash
curl -i http://localhost:10000/api/diagnostico
```

### Registrar usuario de prueba:
```bash
curl -i -X POST http://localhost:10000/api/registrar \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass","plan":"basico"}'
```

### Login con usuario de prueba:
```bash
curl -i -X POST http://localhost:10000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

### Crear pago (requiere token MP):
```bash
curl -i -X POST http://localhost:10000/api/crear-pago \
  -H "Content-Type: application/json" \
  -d '{"id_guia":"guia_video","nombre_guia":"Guía de Análisis de Video","precio":20,"usuario":"testuser"}'
```

## Productos disponibles

- **Guía de Análisis de Video**: $20 MXN - Detección de anomalías visuales
- **Guía de Mantenimiento Avanzado**: $80 MXN - Algoritmos predictivos y planificación
- **Kit Completo Premium**: $150 MXN - Todas las guías + soporte prioritario

## Notas y solución de problemas

- El backend guarda usuarios en `usuarios.json` en la raíz del proyecto.
- Si el frontend no se comunica con el backend, asegúrate de que la variable `API_URL` use `window.location.origin` o apunta a la URL correcta del servidor.
- **Para pagos reales**: Configura `MERCADOPAGO_TOKEN` en `.env` con un token válido.
- **Fallback de pago**: Si Mercado Pago no está configurado, el frontend redirige a enlaces manual es de pago configurados en `index.html`.
- CORS está habilitado y restringido a orígenes comunes; ajusta `allowedOrigins` en `server.js` si sirves desde otro dominio.

## Estructura de archivos

```
.
├── server.js              # Backend Express
├── index.html             # Frontend + modales y lógica de pago
├── script.js              # Lógica adicional (no usado actualmente)
├── package.json           # Dependencias
├── .env                   # Variables de entorno (privado)
├── .env.example           # Plantilla de variables
├── usuarios.json          # Base de datos local de usuarios
└── README.md              # Este archivo
```

## Desplegar a producción

### Railway / Render:
1. Push a GitHub
2. Crea un proyecto en Railway o Render
3. Conecta tu repo
4. Configura las variables de entorno (MERCADOPAGO_TOKEN, etc.)
5. Deploy automático

¡Listo para vender! 🚀

