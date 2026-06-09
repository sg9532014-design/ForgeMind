const API_URL = window.location.origin;

function abrirModal(modalId) {
    if (modalId === 'modal-historial') abrirHistorial();
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
}

function cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

window.addEventListener('click', (event) => {
    const loginModal = document.getElementById('modal-login');
    const registerModal = document.getElementById('modal-registro');
    const historialModal = document.getElementById('modal-historial');

    if (event.target === loginModal) cerrarModal('modal-login');
    if (event.target === registerModal) cerrarModal('modal-registro');
    if (event.target === historialModal) cerrarModal('modal-historial');
});

document.addEventListener('DOMContentLoaded', () => {
    const usuarioData = localStorage.getItem('usuario');
    if (usuarioData) {
        const u = JSON.parse(usuarioData);
        const authButtons = document.getElementById('auth-buttons');
        if (authButtons) {
            const isAdmin = u.username && u.username.toLowerCase() === 'admin';
            authButtons.innerHTML = `
                <button class="secondary" onclick="abrirModal('modal-historial')">📋 Mi Historial</button>
                ${isAdmin ? `<button class="secondary" onclick="location.href='admin.html'">🔒 Admin</button>` : ''}
                <span style="margin-right:1rem; color:#10b981; font-weight:bold; align-self:center;">👋 Hola, ${u.username}</span>
                <button class="danger" onclick="cerrarSesion()">Cerrar Sesión</button>
            `;
        }
    }
});

async function registrarUsuario() {
    const uEl = document.getElementById('reg-username');
    const pEl = document.getElementById('reg-password');
    const plEl = document.getElementById('reg-plan');
    if (!uEl || !pEl || !plEl) return;

    const username = uEl.value.trim();
    const password = pEl.value;
    const plan = plEl.value;

    if (!username || !password) return alert('Por favor, completa todos los campos');

    try {
        const response = await fetch(`${API_URL}/api/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, plan })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            alert('¡Registro exitoso! Ahora inicia sesión.');
            cerrarModal('modal-registro');
            abrirModal('modal-login');
        } else {
            alert('Error: ' + (data.message || 'No se pudo registrar.'));
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor backend');
    }
}

async function iniciarSesion() {
    const uEl = document.getElementById('log-username');
    const pEl = document.getElementById('log-password');
    if (!uEl || !pEl) return;

    const username = uEl.value.trim();
    const password = pEl.value;
    if (!username || !password) return alert('Por favor, completa todos los campos');

    try {
        const response = await fetch(`${API_URL}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (response.ok && data.success) {
            alert('¡Bienvenido a ForgeMind!');
            localStorage.setItem('usuario', JSON.stringify(data.user));
            location.reload();
        } else {
            alert('Error: ' + (data.message || 'Credenciales incorrectas.'));
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión con el servidor backend');
    }
}

async function procesarPago(idGuia, nombreGuia, precio) {
    const enlacesManuales = {
        'guia_video': 'https://mercadopago.com/checkout/v1/redirect?pref_id=TU_PREFERENCE_ID_GUIA_VIDEO',
        'guia_mant': 'https://mercadopago.com/checkout/v1/redirect?pref_id=TU_PREFERENCE_ID_GUIA_MANT',
        'kit_premium': 'https://mercadopago.com/checkout/v1/redirect?pref_id=TU_PREFERENCE_ID_KIT'
    };

    const uData = localStorage.getItem('usuario');
    if (!uData) {
        alert('Debes iniciar sesión para realizar una compra');
        abrirModal('modal-login');
        return;
    }

    const user = JSON.parse(uData);
    try {
        const response = await fetch(`${API_URL}/api/crear-pago`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_guia: idGuia, nombre_guia: nombreGuia, precio, usuario: user.username })
        });
        const data = await response.json();
        if (data.init_point) {
            window.location.href = data.init_point;
            return;
        }
        if (data.preferenceId) {
            window.location.href = `https://mercadopago.com/${data.preferenceId}`;
            return;
        }
        console.warn('El backend no generó init_point, usando enlace de respaldo...');
        if (enlacesManuales[idGuia]) {
            window.location.href = enlacesManuales[idGuia];
        } else {
            alert('⚠️ No se pudo generar el enlace de pago automático y no hay enlace manual configurado.');
        }
    } catch (error) {
        console.error('Error al procesar pago:', error);
        if (enlacesManuales[idGuia]) {
            window.location.href = enlacesManuales[idGuia];
        } else {
            alert('❌ Error de conexión con la pasarela de cobros.');
        }
    }
}

function cerrarSesion() {
    localStorage.removeItem('usuario');
    location.reload();
}

async function abrirHistorial() {
    const uData = localStorage.getItem('usuario');
    if (!uData) return;

    const user = JSON.parse(uData);
    try {
        const response = await fetch(`${API_URL}/api/historial-compras`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: user.username })
        });
        const data = await response.json();
        const historialContenido = document.getElementById('historial-contenido');

        if (data.success && data.compras && data.compras.length > 0) {
            historialContenido.innerHTML = data.compras.map(c => `
                <div style="padding: 1rem; border: 1px solid #334155; border-radius: 6px; margin-bottom: 0.5rem; background-color: #0f172a;">
                    <p><strong>${c.nombre_guia}</strong></p>
                    <p style="color: #94a3b8; font-size: 0.9rem;">Precio: $${c.precio} MXN</p>
                    <p style="color: #94a3b8; font-size: 0.9rem;">Fecha: ${new Date(c.fecha).toLocaleDateString()}</p>
                    <p style="color: #10b981; font-size: 0.9rem;">Estado: ${c.estado}</p>
                </div>
            `).join('');
        } else {
            historialContenido.innerHTML = '<p style="text-align: center; color: #94a3b8;">Aún no tienes compras</p>';
        }
    } catch (error) {
        console.error('Error al cargar historial:', error);
        document.getElementById('historial-contenido').innerHTML = '<p style="color: #ef4444;">Error al cargar historial</p>';
    }
}
