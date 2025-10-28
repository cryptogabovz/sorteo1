// JavaScript para la página de subida de tickets

document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('ticketFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.querySelector('.file-name');
    const submitBtn = document.getElementById('submitBtn');
    const uploadForm = document.getElementById('uploadForm');

    let selectedFile = null;
    let lottieAnimation = null;

    // Inicializar Lottie animation
    function initLottie() {
        const container = document.getElementById('lottieContainer');
        if (!container) {
            console.error('Lottie container not found');
            return;
        }

        if (typeof lottie !== 'undefined') {
            console.log('Loading Lottie animation from /images/search.lottie');

            lottieAnimation = lottie.loadAnimation({
                container: container,
                renderer: 'svg',
                loop: true,
                autoplay: false,
                path: '/images/search.lottie'
            });

            // Event listeners para debugging
            lottieAnimation.addEventListener('data_ready', function() {
                console.log('Lottie data loaded successfully');
            });

            lottieAnimation.addEventListener('loaded_images', function() {
                console.log('Lottie images loaded');
            });

            lottieAnimation.addEventListener('DOMLoaded', function() {
                console.log('Lottie DOM loaded');
            });

            lottieAnimation.addEventListener('error', function(error) {
                console.error('Lottie loading error:', error);
            });

            // Asegurar que el contenedor sea visible
            container.style.display = 'block';
            container.style.opacity = '1';
            container.style.width = '300px';
            container.style.height = '300px';
            container.style.margin = '0 auto';
            container.style.background = 'transparent';

        } else {
            console.error('Lottie library not loaded - check if CDN is working');
            // Fallback: mostrar un spinner de Bootstrap
            container.innerHTML = `
                <div class="d-flex justify-content-center align-items-center h-100">
                    <div class="spinner-border text-primary" role="status" style="width: 4rem; height: 4rem;">
                        <span class="visually-hidden">Cargando...</span>
                    </div>
                </div>
            `;
        }
    }

    // Llamar a initLottie cuando el DOM esté listo
    initLottie();

    // Eventos del área de drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    // Evento de drop
    dropArea.addEventListener('drop', handleDrop, false);

    // Evento de selección de archivo
    fileInput.addEventListener('change', handleFileSelect);

    // Evento de envío del formulario
    uploadForm.addEventListener('submit', handleSubmit);

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight() {
        dropArea.classList.add('dragover');
    }

    function unhighlight() {
        dropArea.classList.remove('dragover');
    }

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;

        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    }

    function handleFile(file) {
        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            showMessage('Solo se permiten archivos de imagen', 'danger');
            return;
        }

        // Validar tamaño (5MB)
        if (file.size > 5 * 1024 * 1024) {
            showMessage('El archivo es demasiado grande. Máximo 5MB', 'danger');
            return;
        }

        selectedFile = file;
        fileInput.files = createFileList([file]);

        // Mostrar información del archivo
        fileName.textContent = file.name;
        fileInfo.style.display = 'flex';

        // Habilitar botón de envío
        submitBtn.disabled = false;

        showMessage('', ''); // Limpiar mensajes
    }

    function createFileList(files) {
        const dt = new DataTransfer();
        files.forEach(file => dt.items.add(file));
        return dt.files;
    }

    function removeFile() {
        selectedFile = null;
        fileInput.value = '';
        fileInfo.style.display = 'none';
        submitBtn.disabled = true;
        showMessage('', '');
    }

    // Hacer removeFile disponible globalmente
    window.removeFile = removeFile;

    async function handleSubmit(e) {
        e.preventDefault();

        if (!selectedFile) {
            showMessage('Por favor selecciona un archivo', 'warning');
            return;
        }

        // Ocultar contenedor de subida y mostrar pantalla de procesamiento
        document.getElementById('uploadContainer').style.display = 'none';
        document.getElementById('processingScreen').style.display = 'block';

        // Mostrar loading en el botón (aunque estará oculto)
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Validando...';

        try {
            const formData = new FormData();
            formData.append('ticket', selectedFile);

            const response = await fetch('/api/upload-ticket', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                if (result.nextStep === 'register') {
                    // Ticket válido, redirigir a registro
                    showMessage('¡Ticket válido! Redirigiendo...', 'success');
                    setTimeout(() => {
                        window.location.href = '/registro';
                    }, 1500);
                } else if (result.nextStep === 'wait') {
                    // Validación asíncrona - mostrar pantalla de espera
                    showProcessingScreen(result.correlationId);
                } else if (result.nextStep === 'retry') {
                    // Ticket inválido
                    showMessage(`Ticket rechazado: ${result.reason}`, 'danger');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Validar Ticket';
                } else {
                    // Ticket válido (síncrono)
                    showMessage('¡Ticket válido! Redirigiendo...', 'success');
                    setTimeout(() => {
                        window.location.href = '/registro';
                    }, 1500);
                }
            } else {
                showMessage(result.message || 'Error al procesar el ticket', 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Validar Ticket';
            }

        } catch (error) {
            console.error('Error:', error);
            showMessage('Error de conexión. Inténtalo nuevamente.', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Validar Ticket';
        }
    }

    function showProcessingScreen(correlationId) {
        // Ocultar contenedor de subida y mostrar pantalla de procesamiento
        document.getElementById('uploadContainer').style.display = 'none';
        document.getElementById('processingScreen').style.display = 'block';

        // Iniciar Lottie animation
        if (lottieAnimation) {
            lottieAnimation.play();
            console.log('Lottie animation started');
        } else {
            console.error('Lottie animation not initialized');
        }

        // Iniciar polling para verificar estado
        let pollCount = 0;
        const maxPolls = 60; // Máximo 60 segundos (1 poll por segundo)

        const pollInterval = setInterval(async () => {
            try {
                pollCount++;

                const response = await fetch(`/api/validation-status/${correlationId}`);
                const result = await response.json();

                if (result.success) {
                    if (result.status === 'approved') {
                        // Validación exitosa
                        clearInterval(pollInterval);
                        if (lottieAnimation) {
                            lottieAnimation.stop();
                        }
                        showMessage('¡Ticket válido! Redirigiendo...', 'success');
                        setTimeout(() => {
                            window.location.href = '/registro';
                        }, 1500);
                    } else if (result.status === 'rejected') {
                        // Validación rechazada - mostrar en pantalla de procesamiento
                        clearInterval(pollInterval);
                        if (lottieAnimation) {
                            lottieAnimation.stop();
                        }
                        showProcessingError(result.reason || 'Ticket no válido');
                    } else if (result.status === 'expired') {
                        // Validación expirada - mostrar en pantalla de procesamiento
                        clearInterval(pollInterval);
                        if (lottieAnimation) {
                            lottieAnimation.stop();
                        }
                        showProcessingError('La validación ha expirado. Intente nuevamente.');
                    } else if (pollCount >= maxPolls) {
                        // Timeout - mostrar en pantalla de procesamiento
                        clearInterval(pollInterval);
                        if (lottieAnimation) {
                            lottieAnimation.stop();
                        }
                        showProcessingError('Tiempo de espera agotado. Intente nuevamente.');
                    }
                    // Si aún está pendiente, continuar polling
                } else {
                    console.error('Error en polling:', result.message);
                }
            } catch (error) {
                console.error('Error en polling:', error);
                if (pollCount >= maxPolls) {
                    clearInterval(pollInterval);
                    hideProcessingScreen();
                    showMessage('Error de conexión. Intente nuevamente.', 'danger');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Validar Ticket';
                }
            }
        }, 1000); // Poll cada segundo
    }

    function hideProcessingScreen() {
        document.getElementById('uploadContainer').style.display = 'block';
        document.getElementById('processingScreen').style.display = 'none';
        // Ocultar también el error si estaba visible
        document.getElementById('processingError').style.display = 'none';
    }

    function showProcessingError(reason) {
        // Ocultar spinner y progreso
        document.querySelector('.processing-animation').style.display = 'none';
        document.querySelector('.progress').style.display = 'none';

        // Cambiar título y mensaje
        document.getElementById('processingTitle').textContent = 'Validación Completada';
        document.getElementById('processingMessage').textContent = 'Hemos revisado tu ticket y encontramos un problema.';

        // Mostrar error
        document.getElementById('errorReason').textContent = reason;
        document.getElementById('processingError').style.display = 'block';
    }

    function resetUpload() {
        // Limpiar archivo seleccionado
        selectedFile = null;
        fileInput.value = '';
        fileInfo.style.display = 'none';

        // Resetear pantalla de procesamiento
        document.querySelector('.processing-animation').style.display = 'block';
        document.querySelector('.progress').style.display = 'block';
        document.getElementById('processingTitle').textContent = 'Procesando tu imagen...';
        document.getElementById('processingMessage').textContent = 'Estamos validando tu ticket automáticamente. Esto puede tomar unos segundos.';
        document.getElementById('processingError').style.display = 'none';

        // Ocultar pantalla de procesamiento y mostrar formulario
        hideProcessingScreen();

        // Resetear botón
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Validar Ticket';

        // Limpiar mensajes
        showMessage('', '');
    }

    // Hacer resetUpload disponible globalmente
    window.resetUpload = resetUpload;

    function showMessage(message, type) {
        const messageDiv = document.getElementById('message');

        if (!message) {
            messageDiv.style.display = 'none';
            return;
        }

        messageDiv.className = `alert alert-${type}`;
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';

        // Auto-ocultar mensajes de éxito después de 5 segundos
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }
});