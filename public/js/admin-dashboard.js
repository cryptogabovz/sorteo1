// JavaScript para el dashboard de administración

document.addEventListener('DOMContentLoaded', function() {
    // Actualizar métricas cada 30 segundos
    updateMetrics();
    setInterval(updateMetrics, 30000);

    async function updateMetrics() {
        try {
            const response = await fetch('/admin/api/metrics');
            const result = await response.json();

            if (result.success) {
                updateMetricDisplays(result.data);
            }
        } catch (error) {
            console.error('Error actualizando métricas:', error);
        }
    }

    function updateMetricDisplays(data) {
        // Actualizar contadores con animación
        animateCounter('totalParticipants', data.total_participants);
        animateCounter('validatedTickets', data.validated_tickets);
        animateCounter('rejectedTickets', data.rejected_tickets);
        animateCounter('provinces', data.provinces_count);

        // Agregar indicador de actualización
        showUpdateIndicator();
    }

    function animateCounter(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;

        const currentValue = parseInt(element.textContent) || 0;
        const difference = targetValue - currentValue;

        if (difference === 0) return;

        const duration = 1000; // 1 segundo
        const steps = 20;
        const stepValue = difference / steps;
        let currentStep = 0;

        const timer = setInterval(() => {
            currentStep++;
            const newValue = Math.round(currentValue + (stepValue * currentStep));
            element.textContent = newValue;

            if (currentStep >= steps) {
                clearInterval(timer);
                element.textContent = targetValue;
            }
        }, duration / steps);
    }

    function showUpdateIndicator() {
        // Crear indicador visual de actualización
        const indicator = document.createElement('div');
        indicator.className = 'update-indicator';
        indicator.innerHTML = '✓ Actualizado';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.875rem;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(indicator);

        // Animar entrada
        setTimeout(() => {
            indicator.style.opacity = '1';
        }, 100);

        // Remover después de 3 segundos
        setTimeout(() => {
            indicator.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(indicator);
            }, 300);
        }, 3000);
    }

    // Auto-refresh de la página cada 5 minutos para mantener datos actualizados
    setTimeout(() => {
        if (confirm('¿Recargar página para actualizar datos?')) {
            window.location.reload();
        }
    }, 5 * 60 * 1000); // 5 minutos

    // Manejar errores de red
    window.addEventListener('online', function() {
        showNetworkStatus('Conexión restablecida', 'success');
        updateMetrics(); // Reintentar actualización
    });

    window.addEventListener('offline', function() {
        showNetworkStatus('Sin conexión a internet', 'warning');
    });

    function showNetworkStatus(message, type) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alert.style.cssText = 'top: 20px; left: 50%; transform: translateX(-50%); z-index: 1000; min-width: 300px;';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        document.body.appendChild(alert);

        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }

    // Función para exportar datos (si se implementa)
    window.exportData = function(format) {
        const url = `/admin/participants?export=${format}`;
        window.open(url, '_blank');
    };

    // Tooltip para elementos que lo necesiten
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Confirmación para acciones destructivas
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('confirm-action')) {
            const message = e.target.dataset.confirmMessage || '¿Estás seguro?';
            if (!confirm(message)) {
                e.preventDefault();
                return false;
            }
        }
    });

    console.log('Dashboard inicializado correctamente');
});