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

        // Ocultar área de drop y mostrar vista previa grande
        document.getElementById('dropArea').style.display = 'none';
        showImagePreview(file);

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
        hideImagePreview(); // Ocultar vista previa grande
        document.getElementById('dropArea').style.display = 'block'; // Mostrar área de drop nuevamente
        submitBtn.disabled = true;
        showMessage('', '');
    }

    // Hacer removeFile disponible globalmente
    window.removeFile = removeFile;

    function showImagePreview(file) {
        const previewContainer = document.getElementById('imagePreview');
        const previewImage = document.getElementById('previewImage');

        if (!previewContainer || !previewImage) {
            console.error('Elementos de vista previa no encontrados');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            // Guardar la imagen en cache del navegador para uso posterior
            const imageUrl = e.target.result;
            localStorage.setItem('ticketPreview', imageUrl);
            localStorage.setItem('ticketFilename', file.name);

            previewImage.src = imageUrl;
            previewContainer.style.display = 'block';
            console.log('Vista previa de imagen mostrada y guardada en cache');
        };
        reader.onerror = function(error) {
            console.error('Error cargando vista previa:', error);
        };
        reader.readAsDataURL(file);
    }

    function hideImagePreview() {
        const previewContainer = document.getElementById('imagePreview');
        if (previewContainer) {
            previewContainer.style.display = 'none';
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!selectedFile) {
            showMessage('Por favor selecciona un archivo', 'warning');
            return;
        }

        console.log('🚀 Iniciando envío del formulario...');

        // Ocultar contenedor de subida y mostrar pantalla de procesamiento
        document.getElementById('unifiedContainer').style.display = 'none';
        document.getElementById('processingScreen').style.display = 'block';

        // Mostrar loading en el botón (aunque estará oculto)
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Validando...';

        try {
            const formData = new FormData();
            formData.append('ticket', selectedFile);

            console.log('📤 Enviando FormData a /api/upload-ticket...');

            const response = await fetch('/api/upload-ticket', {
                method: 'POST',
                body: formData
            });

            console.log('📥 Respuesta recibida:', response.status);

            const result = await response.json();
            console.log('📄 Resultado JSON:', result);

            if (result.success) {
                if (result.nextStep === 'register') {
                    // Ticket válido, redirigir a registro
                    console.log('✅ Ticket válido - Redirigiendo a registro');
                    showMessage('¡Ticket válido! Redirigiendo...', 'success');
                    setTimeout(() => {
                        window.location.href = '/registro';
                    }, 1500);
                } else if (result.nextStep === 'wait') {
                    // Validación asíncrona - mostrar pantalla de espera
                    console.log('⏳ Validación asíncrona - Iniciando polling con correlationId:', result.correlationId);
                    showProcessingScreen(result.correlationId);
                } else if (result.nextStep === 'retry') {
                    // Ticket inválido
                    console.log('❌ Ticket rechazado:', result.reason);
                    showMessage(`Ticket rechazado: ${result.reason}`, 'danger');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = 'Validar Ticket';
                } else {
                    // Ticket válido (síncrono)
                    console.log('✅ Ticket válido (síncrono) - Redirigiendo a registro');
                    showMessage('¡Ticket válido! Redirigiendo...', 'success');
                    setTimeout(() => {
                        window.location.href = '/registro';
                    }, 1500);
                }
            } else {
                console.log('❌ Error en respuesta:', result.message);
                showMessage(result.message || 'Error al procesar el ticket', 'danger');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Validar Ticket';
            }

        } catch (error) {
            console.error('❌ Error en handleSubmit:', error);
            showMessage('Error de conexión. Inténtalo nuevamente.', 'danger');
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Validar Ticket';
        }
    }

    function showProcessingScreen(correlationId) {
        console.log('🚀 Iniciando modo escaneo en el mismo cuadro...');

        // Cambiar el marco a modo escaneo
        const unifiedFrame = document.querySelector('.unified-frame');
        const scannerLine = document.getElementById('scannerLine');
        const unifiedInfo = document.getElementById('unifiedInfo');
        const unifiedText = document.getElementById('unifiedText');
        const previewImage = document.getElementById('previewImage');

        if (unifiedFrame && scannerLine && unifiedInfo && unifiedText) {
            // Agregar clase de escaneo
            unifiedFrame.classList.add('scanning');

            // Mostrar barra de escaneo
            scannerLine.style.display = 'block';

            // Cambiar texto y ocultar botón
            unifiedText.textContent = 'Escaneando imagen...';
            document.getElementById('changeBtn').style.display = 'none';

            // Atenuar información pero mantener imagen visible
            unifiedInfo.style.opacity = '0.7';

            // Asegurar que la imagen siga visible durante el escaneo
            if (previewImage && localStorage.getItem('ticketPreview')) {
                previewImage.src = localStorage.getItem('ticketPreview');
                console.log('✅ Imagen mantenida visible durante escaneo usando cache');
            }

            console.log('✅ Modo escaneo activado - barra visible, controles ocultos, imagen visible');
        } else {
            console.error('❌ Elementos del modo escaneo no encontrados');
        }

        // Iniciar Lottie animation (si existe)
        if (lottieAnimation) {
            lottieAnimation.play();
            console.log('Lottie animation started');
        } else {
            console.error('Lottie animation not initialized');
        }

        // Iniciar polling para verificar estado
        let pollCount = 0;
        const maxPolls = 120; // Máximo 120 segundos (2 minutos) para dar tiempo a n8n

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

                        // Restaurar apariencia del marco
                        const unifiedFrame = document.querySelector('.unified-frame');
                        const scannerLine = document.getElementById('scannerLine');
                        const unifiedInfo = document.getElementById('unifiedInfo');
                        const unifiedText = document.getElementById('unifiedText');

                        if (unifiedFrame && scannerLine && unifiedInfo && unifiedText) {
                            unifiedFrame.classList.remove('scanning');
                            scannerLine.style.display = 'none';
                            unifiedText.textContent = '¡Ticket válido!';
                            unifiedInfo.style.opacity = '1';
                        }

                        console.log('✅ Validación exitosa - Redirigiendo a registro');
                        console.log('Sesión actual:', result);
                        showMessage('¡Ticket válido! Redirigiendo...', 'success');
                        setTimeout(() => {
                            window.location.href = '/registro';
                        }, 1500);
                    } else if (result.status === 'rejected') {
                        // Validación rechazada
                        clearInterval(pollInterval);
                        if (lottieAnimation) {
                            lottieAnimation.stop();
                        }

                        // Restaurar apariencia del marco
                        const unifiedFrame = document.querySelector('.unified-frame');
                        const scannerLine = document.getElementById('scannerLine');
                        const unifiedInfo = document.getElementById('unifiedInfo');
                        const unifiedText = document.getElementById('unifiedText');
                        const changeBtn = document.getElementById('changeBtn');

                        if (unifiedFrame && scannerLine && unifiedInfo && unifiedText && changeBtn) {
                            unifiedFrame.classList.remove('scanning');
                            scannerLine.style.display = 'none';
                            unifiedText.textContent = 'Ticket rechazado - Intente con otra imagen';
                            unifiedInfo.style.opacity = '1';
                            changeBtn.style.display = 'inline-block';
                        }

                        console.log('❌ Validación rechazada:', result.reason);
                        showMessage(`Ticket rechazado: ${result.reason || 'Imagen no válida'}`, 'danger');
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
        document.getElementById('unifiedContainer').style.display = 'block';
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