const axios = require('axios');
const config = require('../config/env');

class ValidationController {
  // Validar ticket con n8n
  async validateTicket(req, res) {
    try {
      const { ticketImage } = req.body;

      if (!ticketImage) {
        return res.status(400).json({
          success: false,
          message: 'Imagen del ticket requerida'
        });
      }

      // Preparar payload para n8n
      const payload = {
        image: ticketImage, // Base64 o URL
        timestamp: new Date().toISOString(),
        source: 'sorteo-web'
      };

      // Llamar a webhook de n8n
      const response = await axios.post(config.n8nWebhookUrl, payload, {
        timeout: 30000, // 30 segundos timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { valid, reason, confidence } = response.data;

      res.json({
        success: true,
        valid: valid || false,
        reason: reason || 'Ticket no válido',
        confidence: confidence || 0
      });

    } catch (error) {
      console.error('Error validando ticket:', error);

      // Si hay error de conexión con n8n, devolver respuesta por defecto
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(503).json({
          success: false,
          message: 'Servicio de validación no disponible. Intente nuevamente.'
        });
      }

      // Timeout
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({
          success: false,
          message: 'Tiempo de espera agotado. Intente nuevamente.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Subir ticket y validar
  async uploadAndValidate(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No se recibió ningún archivo'
        });
      }

      // Convertir imagen a base64 para enviar a n8n
      const fs = require('fs');
      const path = require('path');
      const imagePath = path.join(__dirname, '../../public/uploads', req.file.filename);
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Preparar payload
      const payload = {
        image: base64Image,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        timestamp: new Date().toISOString(),
        source: 'sorteo-web-upload'
      };

      // Llamar a webhook de n8n
      const response = await axios.post(config.n8nWebhookUrl, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const { valid, reason, confidence } = response.data;

      // Guardar resultado temporal en sesión para el siguiente paso
      req.session.validationResult = {
        valid: valid || false,
        reason: reason || 'Ticket no válido',
        confidence: confidence || 0,
        ticketImageUrl: `/uploads/${req.file.filename}`,
        tempFile: req.file.filename
      };

      res.json({
        success: true,
        valid: valid || false,
        reason: reason || 'Ticket no válido',
        confidence: confidence || 0,
        nextStep: valid ? 'register' : 'retry'
      });

    } catch (error) {
      console.error('Error en upload y validación:', error);

      // Limpiar archivo si existe
      if (req.file) {
        const fs = require('fs');
        const path = require('path');
        const imagePath = path.join(__dirname, '../../public/uploads', req.file.filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      }

      // Manejar errores similares al método anterior
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        return res.status(503).json({
          success: false,
          message: 'Servicio de validación no disponible. Intente nuevamente.'
        });
      }

      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({
          success: false,
          message: 'Tiempo de espera agotado. Intente nuevamente.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error procesando la imagen'
      });
    }
  }
}

module.exports = new ValidationController();