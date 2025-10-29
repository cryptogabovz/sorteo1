const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, guestMiddleware } = require('../middleware/auth');

// Rutas de administración (requieren autenticación)

// Página de login
router.get('/', guestMiddleware, adminController.showLogin);

// Procesar login
router.post('/login', guestMiddleware, adminController.login);

// Logout
router.post('/logout', authMiddleware, adminController.logout);

// Dashboard
router.get('/dashboard', authMiddleware, adminController.showDashboard);

// Gestión de participantes
router.get('/participants', authMiddleware, adminController.listParticipants);

// Detalle de participante
router.get('/participants/:id', authMiddleware, adminController.showParticipant);

// Eliminar ticket específico
router.delete('/participants/:id', authMiddleware, adminController.deleteTicket);

// API: Obtener métricas (para dashboard AJAX)
router.get('/api/metrics', authMiddleware, adminController.getMetrics);

// API: Obtener métricas diarias para gráfico
router.get('/api/daily-metrics', authMiddleware, adminController.getDailyMetrics);

// Página de configuración
router.get('/configuracion', authMiddleware, adminController.showConfiguracion);

// Cambiar contraseña de admin
router.post('/configuracion/change-password', authMiddleware, adminController.changePassword);

// Limpiar todos los datos
router.post('/configuracion/clear-data', authMiddleware, adminController.clearAllData);

module.exports = router;