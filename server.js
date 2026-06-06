// ENDPOINT DE DIAGNÓSTICO - ELIMINAR EN PRODUCCIÓN
app.get('/api/diagnostico-mp', async (req, res) => {
    try {
        if (!process.env.MERCADOPAGO_TOKEN) {
            return res.json({ 
                success: false,
                message: 'Token no configurado en variables de entorno'
            });
        }

        // Verificar el formato del token
        const token = process.env.MERCADOPAGO_TOKEN;
        const esPrueba = token.startsWith('TEST-');
        const esProduccion = token.startsWith('APP_USR-');
        
        // Intentar crear una preferencia de prueba
        const client = new MercadoPagoConfig({ accessToken: token });
        const preference = new Preference(client);
        
        const result = await preference.create({
            body: {
                items: [{
                    title: 'Producto de prueba',
                    quantity: 1,
                    unit_price: 10,
                    currency_id: 'MXN'
                }],
                metadata: { test: true }
            }
        });

        res.json({
            success: true,
            message: 'Token válido y funcionando',
            tipo: esPrueba ? 'PRUEBA' : esProduccion ? 'PRODUCCIÓN' : 'DESCONOCIDO',
            token_inicio: token.substring(0, 10) + '...',
            init_point: result.init_point
        });
    } catch (error) {
        res.json({
            success: false,
            message: 'Error con el token',
            error: error.message,
            codigo: error.status || error.statusCode || 'N/A'
        });
    }
});
