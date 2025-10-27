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

// API: Obtener métricas (para dashboard AJAX)
router.get('/api/metrics', authMiddleware, adminController.getMetrics);

module.exports = router;