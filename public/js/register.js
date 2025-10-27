// JavaScript para la página de registro de participantes

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const submitBtn = document.getElementById('submitBtn');

    // Máscaras y validaciones
    setupFormValidation();

    // Evento de envío del formulario
    registerForm.addEventListener('submit', handleSubmit);

    function setupFormValidation() {
        // Validación de cédula (solo números)
        const cedulaInput = document.getElementById('cedula');
        cedulaInput.addEventListener('input', function() {
            this.value = this.value.replace(/\D/g, '');
        });

        // Validación de teléfono
        const phoneInput = document.getElementById('phone');
        phoneInput.addEventListener('input', function() {
            this.value = this.value.replace(/[^\d+\-\s()]/g, '');
        });

        // Validación de nombre y apellido (solo letras y espacios)
        const nameInput = document.getElementById('name');
        const lastNameInput = document.getElementById('lastName');

        [nameInput, lastNameInput].forEach(input => {
            input.addEventListener('input', function() {
                this.value = this.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
            });
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        // Validar formulario
        if (!validateForm()) {
            return;
        }

        // Mostrar loading
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Registrando...';

        try {
            const formData = new FormData(registerForm);
            const data = Object.fromEntries(formData.entries());

            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                // Registro exitoso, redirigir a página de éxito
                showMessage('¡Registro exitoso! Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = '/exito';
                }, 1500);
            } else {
                showMessage(result.message || 'Error en el registro', 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Registrarme y Obtener Número';
            }

        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión. Inténtalo nuevamente.', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Registrarme y Obtener Número';
        }
    }

    function validateForm() {
        const name = document.getElementById('name').value.trim();
        const lastName = document.getElementById('lastName').value.trim();
        const cedula = document.getElementById('cedula').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const province = document.getElementById('province').value;

        // Validar campos requeridos
        if (!name || !lastName || !cedula || !phone || !province) {
            showMessage('Todos los campos son obligatorios', 'warning');
            return false;
        }

        // Validar longitud mínima
        if (name.length < 2 || lastName.length < 2) {
            showMessage('Nombre y apellido deben tener al menos 2 caracteres', 'warning');
            return false;
        }

        // Validar cédula
        if (cedula.length < 5 || cedula.length > 20) {
            showMessage('La cédula debe tener entre 5 y 20 dígitos', 'warning');
            return false;
        }

        // Validar teléfono
        if (phone.length < 7) {
            showMessage('El teléfono debe tener al menos 7 caracteres', 'warning');
            return false;
        }

        return true;
    }

    function showMessage(message, type) {
        const messageDiv = document.getElementById('message');

        if (!message) {
            messageDiv.style.display = 'none';
            return;
        }

        messageDiv.className = `alert alert-${type}`;
        messageDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'danger' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>${message}`;
        messageDiv.style.display = 'block';

        // Auto-ocultar mensajes después de 5 segundos
        setTimeout(() => {
            messageDiv.style.display = 'none';
        }, 5000);
    }

    // Función para capitalizar primera letra
    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    // Aplicar capitalización automática
    [document.getElementById('name'), document.getElementById('lastName')].forEach(input => {
        input.addEventListener('blur', function() {
            this.value = this.value.split(' ').map(word => capitalizeFirst(word)).join(' ');
        });
    });

    // Prevención de envío múltiple
    let isSubmitting = false;
    registerForm.addEventListener('submit', function(e) {
        if (isSubmitting) {
            e.preventDefault();
            return false;
        }
        isSubmitting = true;
    });
});