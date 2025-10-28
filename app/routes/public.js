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
  // Verificar que haya resultado de validación
  if (!req.session.validationResult || !req.session.validationResult.valid) {
    return res.redirect('/participar');
  }

  res.render('public/register', {
    title: 'Registro de Participante',
    validationResult: req.session.validationResult
  });
});

// API: Registrar participante
router.post('/api/register', participantController.register);

// Página de confirmación exitosa
router.get('/exito', (req, res) => {
  // Verificar que haya datos de confirmación en sesión
  if (!req.session.confirmationData) {
    return res.redirect('/');
  }

  const confirmationData = req.session.confirmationData;
  delete req.session.confirmationData; // Limpiar después de mostrar

  res.render('public/success', {
    title: '¡Registro Exitoso!',
    data: confirmationData
  });
});

// API: Obtener estadísticas públicas (opcional)
router.get('/api/stats', participantController.getPublicStats);

// Webhook: Recibir respuesta de validación de n8n
router.post('/api/webhook/validation-response', validationController.receiveValidationResponse);

module.exports = router;