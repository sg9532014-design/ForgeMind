# Vision Studio

Panel de control para análisis de video e imágenes enfocado en el mantenimiento preventivo y análisis de maquinaria.

## Características
- Registro e inicio de sesión de usuarios.
- Integración con Mercado Pago para la compra de guías técnicas.
- Interfaz moderna y funcional.

## Tecnologías
- HTML5 / CSS3
- JavaScript (Vanilla)
- Integración con API REST

## Ejecutar localmente
1. Instala dependencias:

```bash
npm install
```

2. Inicia el servidor:

```bash
npm start
```

El servidor arranca en el puerto `10000` por defecto. Abre en el navegador:

http://localhost:10000/

## Probar endpoints (curl)
- Diagnóstico:

```bash
curl -i http://localhost:10000/api/diagnostico
```

- Registrar usuario de prueba:

```bash
curl -i -X POST http://localhost:10000/api/registrar -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpass","plan":"basico"}'
```

- Login con usuario de prueba:

```bash
curl -i -X POST http://localhost:10000/api/login -H "Content-Type: application/json" -d '{"username":"testuser","password":"testpass"}'
```

## Notas y solución de problemas
- Si el frontend no se comunica con el backend, asegúrate de que la variable `API_URL` en el cliente use `window.location.origin` o apunta a la URL correcta del servidor.
- El backend guarda usuarios en `usuarios.json` en la raíz del proyecto.
- Para pagos con Mercado Pago, define la variable de entorno `MERCADOPAGO_TOKEN` antes de ejecutar el servidor. Si no está configurada, la ruta de creación de pagos devolverá un mensaje indicando que falta el token.
- CORS está habilitado y restringido a orígenes comunes; ajusta `allowedOrigins` en `server.js` si sirves desde otro dominio.

Si quieres que haga un commit y push de estos cambios, dime y lo hago.
