// JavaScript para la página de subida de tickets

document.addEventListener('DOMContentLoaded', function() {
    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('ticketFile');
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.querySelector('.file-name');
    const submitBtn = document.getElementById('submitBtn');
    const uploadForm = document.getElementById('uploadForm');

    let selectedFile = null;

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

        // Mostrar loading
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
        // Ocultar formulario y mostrar pantalla de procesamiento
        document.getElementById('uploadForm').style.display = 'none';
        document.getElementById('processingScreen').style.display = 'block';

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
                        showMessage('¡Ticket válido! Redirigiendo...', 'success');
                        setTimeout(() => {
                            window.location.href = '/registro';
                        }, 1500);
                    } else if (result.status === 'rejected') {
                        // Validación rechazada
                        clearInterval(pollInterval);
                        hideProcessingScreen();
                        showMessage(`Ticket rechazado: ${result.reason}`, 'danger');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Validar Ticket';
                    } else if (result.status === 'expired') {
                        // Validación expirada
                        clearInterval(pollInterval);
                        hideProcessingScreen();
                        showMessage('La validación ha expirado. Intente nuevamente.', 'warning');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Validar Ticket';
                    } else if (pollCount >= maxPolls) {
                        // Timeout
                        clearInterval(pollInterval);
                        hideProcessingScreen();
                        showMessage('Tiempo de espera agotado. Intente nuevamente.', 'warning');
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Validar Ticket';
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
        document.getElementById('uploadForm').style.display = 'block';
        document.getElementById('processingScreen').style.display = 'none';
    }

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