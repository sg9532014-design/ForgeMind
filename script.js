// Manejo de Modales
const registerModal = document.getElementById("registerModal");
const loginModal = document.getElementById("loginModal");
const showRegisterModalBtn = document.getElementById("showRegisterModal");
const showLoginModalBtn = document.getElementById("showLoginModal");
const showLoginFromRegisterLink = document.getElementById("showLoginFromRegister");
const showRegisterFromLoginLink = document.getElementById("showRegisterFromLogin");

// URL de tu Backend en Render
const API_BASE_URL = 'TU_URL_DE_RENDER_AQUI'; // <- Pega aquí la misma dirección de Render del Paso 1


function closeModal(modal) { if (modal) modal.style.display = "none"; }
function openModal(modal) { if (modal) modal.style.display = "flex"; }

if (showRegisterModalBtn) showRegisterModalBtn.onclick = () => openModal(registerModal);
if (showLoginModalBtn) showLoginModalBtn.onclick = () => openModal(loginModal);

document.querySelectorAll(".close-button").forEach(button => {
    button.onclick = (event) => closeModal(event.target.closest(".modal"));
});

window.onclick = (event) => {
    if (event.target == registerModal) closeModal(registerModal);
    if (event.target == loginModal) closeModal(loginModal);
};

if (showLoginFromRegisterLink) {
    showLoginFromRegisterLink.onclick = (e) => {
        e.preventDefault(); closeModal(registerModal); openModal(loginModal);
    };
}

if (showRegisterFromLoginLink) {
    showRegisterFromLoginLink.onclick = (e) => {
        e.preventDefault(); closeModal(loginModal); openModal(registerModal);
    };
}

// Registro de Usuarios
const registerForm = document.getElementById("registerForm");
if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("regUsername").value;
        const password = document.getElementById("regPassword").value;
        const plan = document.getElementById("regPlan").value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/registrar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password, plan })
            });

            const data = await response.json();
            if (response.ok) {
                alert("Registro exitoso: " + data.message);
                localStorage.setItem("usuario_forgemind", username);
                closeModal(registerModal);
            } else {
                alert("Error en el registro: " + (data.message || "Hubo un problema."));
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error de conexión con el servidor. Asegúrate de que el backend esté activo.");
        }
    });
}

// Inicio de Sesión
const loginForm = document.getElementById("loginForm");
if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = document.getElementById("logUsername").value;
        const password = document.getElementById("logPassword").value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            if (response.ok) {
                alert("Ingreso exitoso: " + data.message);
                localStorage.setItem("usuario_forgemind", username);
                closeModal(loginModal);
            } else {
                alert("Error en el ingreso: " + (data.message || "Credenciales incorrectas."));
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error de conexión con el servidor.");
        }
    });
}

async function comprarGuia(idGuia, nombreGuia, precioGuia) {
    // 1. ENLACES DE RESPALDO MANUALES (Sustituye con tus links reales de Mercado Pago/Stripe si los tienes)
    const enlacesManuales = {
        'guia_video': 'TU_LINK_DE_PAGO_MANUAL_GUIA_VIDEO', 
        'guia_mant': 'TU_LINK_DE_PAGO_MANUAL_GUIA_MANTENIMIENTO'
    };

    try {
        const usuarioLogueado = localStorage.getItem("usuario_forgemind") || "Invitado";
        const respuesta = await fetch(`${API_BASE_URL}/api/crear-pago`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_guia: idGuia,
                nombre_guia: nombreGuia,
                precio: precioGuia,
                usuario: usuarioLogueado
            })
        });

        const datos = await respuesta.json();
        
        // Si el backend responde con el link de Mercado Pago, redirige de inmediato
        if (datos.init_point) {
            window.location.href = datos.init_point;
            return;
        } else if (datos.preferenceId) {
            // Si regresa el ID en lugar del link completo
            window.location.href = `https://mercadopago.com{datos.preferenceId}`;
            return;
        }
        
        // 2. PLAN DE EMERGENCIA: Si el backend no generó el link, usa el manual
        console.warn("El backend no generó init_point, usando enlace de respaldo...");
        if (enlacesManuales[idGuia]) {
            window.location.href = enlacesManuales[idGuia];
        } else {
            alert("⚠️ No se pudo generar el enlace de pago automático y no hay enlace manual configurado.");
        }

    } catch (error) {
        console.error("Error:", error);
        // Si el backend da error de conexión del todo, nos vamos al enlace manual para no perder la venta
        if (enlacesManuales[idGuia]) {
            window.location.href = enlacesManuales[idGuia];
        } else {
            alert("❌ Error de conexión con la pasarela de cobros.");
        }
    }
}
