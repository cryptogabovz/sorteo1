const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const validationController = require('../controllers/validationController');
const { upload, handleUploadError } = require('../middleware/upload');

// Rutas públicas

// Página principal (landing page)
router.get('/', (req, res) => {
  res.render('public/index', {
    title: 'Sorteo - Participa Ahora'
  });
});

// Página de subida de ticket
router.get('/participar', (req, res) => {
  res.render('public/upload-ticket', {
    title: 'Subir Ticket'
  });
});

// API: Subir ticket y validar
router.post('/api/upload-ticket',
  upload.single('ticket'),
  handleUploadError,
  validationController.uploadAndValidate
);

// Página de registro (después de validación exitosa)
router.get('/registro', (req, res) => {
  console.log('🔍 Verificando acceso a /registro...');
  console.log('Sesión actual:', {
    validationResult: req.session.validationResult,
    confirmationData: req.session.confirmationData,
    sessionID: req.sessionID
  });

  // Verificar que haya resultado de validación válido
  if (!req.session.validationResult) {
    console.log('❌ Acceso denegado a /registro - No hay validationResult en sesión');
    return res.redirect('/participar?error=validation_required');
  }

  if (!req.session.validationResult.valid) {
    console.log('❌ Acceso denegado a /registro - validationResult.valid es false');
    return res.redirect('/participar?error=validation_invalid');
  }

  if (!req.session.validationResult.correlationId) {
    console.log('❌ Acceso denegado a /registro - No hay correlationId');
    return res.redirect('/participar?error=correlation_missing');
  }

  // Verificar que la validación no haya expirado (60 minutos para coincidir con BD)
  const validationTime = req.session.validationResult.timestamp || 0;
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 60 minutos (coincide con BD)

  console.log('⏱️ Verificando expiración:', {
    validationTime: new Date(validationTime).toISOString(),
    now: new Date(now).toISOString(),
    age: Math.round((now - validationTime) / 1000 / 60),
    maxAge: Math.round(maxAge / 1000 / 60),
    expired: now - validationTime > maxAge
  });

  if (now - validationTime > maxAge) {
    console.log('❌ Validación expirada en sesión, limpiando y redirigiendo');
    delete req.session.validationResult;
    return res.redirect('/participar?error=validation_expired');
  }

  console.log('✅ Acceso permitido a /registro - Validación confirmada');
  res.render('public/register', {
    title: 'Registro de Participante',
    validationResult: req.session.validationResult,
    recaptcha: require('../config/env').recaptcha
  });
});

// API: Registrar participante
router.post('/api/register', participantController.register);

// Página de confirmación exitosa
router.get('/exito', (req, res) => {
  console.log('🔍 Verificando acceso a /exito...');

  // Verificar que haya datos de confirmación en sesión
  if (!req.session.confirmationData) {
    console.log('❌ Acceso denegado a /exito - No hay confirmationData en sesión');
    return res.redirect('/');
  }

  console.log('✅ Acceso permitido a /exito - Datos de confirmación encontrados');
  console.log('Datos de confirmación:', req.session.confirmationData);

  const confirmationData = req.session.confirmationData;
  // NO limpiar datos de confirmación aquí - permitir recargas de página
  // delete req.session.confirmationData;

  res.render('public/success', {
    title: 'Registro Exitoso - Sistema de Sorteo',
    data: confirmationData
  });
});

// API: Obtener estadísticas públicas (opcional)
router.get('/api/stats', participantController.getPublicStats);

// Webhook: Recibir respuesta de validación de n8n
router.post('/api/webhook/validation-response', validationController.receiveValidationResponse);

// API: Verificar estado de validación (para polling)
router.get('/api/validation-status/:correlationId', validationController.checkValidationStatus);

module.exports = router;