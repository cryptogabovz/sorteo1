const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const { TicketValidation } = require('../models');

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

      // Llamar a webhook de n8n con autenticación Basic Auth
      const auth = Buffer.from(`${config.n8nWebhookUser}:${config.n8nWebhookPass}`).toString('base64');
      const response = await axios.post(config.n8nWebhookUrl, payload, {
        timeout: 30000, // 30 segundos timeout
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
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

      // Generar correlation_id único
      const correlationId = uuidv4();
      console.log(`🆔 Nueva validación iniciada - Correlation ID: ${correlationId}`);

      // Convertir imagen a base64 para enviar a n8n
      const fs = require('fs');
      const path = require('path');
      const imagePath = path.join(__dirname, '../../public/uploads', req.file.filename);
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');

      // Crear registro de validación pendiente
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30); // Expira en 30 minutos

      const ticketValidation = await TicketValidation.create({
        correlation_id: correlationId,
        image_path: imagePath,
        image_filename: req.file.filename,
        status: 'pending',
        expires_at: expiresAt
      });

      console.log(`💾 Validación guardada en BD - ID: ${ticketValidation.id}`);

      // Preparar payload para n8n
      const payload = {
        correlation_id: correlationId,
        image: base64Image,
        filename: req.file.originalname,
        mimetype: req.file.mimetype,
        timestamp: new Date().toISOString(),
        source: 'sorteo-web-upload',
        response_url: `${req.protocol}://${req.get('host')}/api/webhook/validation-response`
      };

      console.log(`📤 Enviando imagen a n8n - Correlation ID: ${correlationId}`);

      // Llamar a webhook de n8n con autenticación Basic Auth
      const auth = Buffer.from(`${config.n8nWebhookUser}:${config.n8nWebhookPass}`).toString('base64');
      const response = await axios.post(config.n8nWebhookUrl, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        }
      });

      console.log(`✅ Respuesta inmediata de n8n - Correlation ID: ${correlationId}`);

      // Verificar si n8n ya dio respuesta inmediata
      const { valid, reason, confidence } = response.data;

      if (valid !== undefined) {
        // Respuesta inmediata - actualizar registro
        await ticketValidation.update({
          status: valid ? 'approved' : 'rejected',
          validation_result: response.data,
          reason: reason || (valid ? 'Ticket válido' : 'Ticket no válido'),
          confidence: confidence || 0,
          n8n_response_received: true
        });

        console.log(`🎯 Validación completada inmediatamente - Status: ${valid ? 'approved' : 'rejected'}`);

        // Guardar resultado en sesión para el siguiente paso
        req.session.validationResult = {
          correlationId,
          valid: valid || false,
          reason: reason || 'Ticket no válido',
          confidence: confidence || 0,
          ticketImageUrl: `/uploads/${req.file.filename}`,
          tempFile: req.file.filename
        };

        return res.json({
          success: true,
          valid: valid || false,
          reason: reason || 'Ticket no válido',
          confidence: confidence || 0,
          nextStep: valid ? 'register' : 'retry'
        });
      } else {
        // Respuesta asíncrona esperada - n8n responderá por webhook
        console.log(`⏳ Validación asíncrona iniciada - Esperando respuesta en webhook`);

        return res.json({
          success: true,
          message: 'Validación iniciada. Procesando imagen...',
          correlationId,
          status: 'processing',
          nextStep: 'wait'
        });
      }

    } catch (error) {
      console.error('❌ Error en upload y validación:', error);

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

  // Recibir respuesta de validación de n8n
  async receiveValidationResponse(req, res) {
    try {
      const { correlation_id, valid, reason, confidence, ...extraData } = req.body;

      if (!correlation_id) {
        console.error('❌ Respuesta de validación sin correlation_id');
        return res.status(400).json({
          success: false,
          message: 'correlation_id requerido'
        });
      }

      console.log(`🔔 Respuesta de validación recibida - Correlation ID: ${correlation_id}`, {
        valid,
        reason,
        confidence
      });

      // Buscar la validación pendiente
      const ticketValidation = await TicketValidation.findByCorrelationId(correlation_id);

      if (!ticketValidation) {
        console.error(`❌ Validación no encontrada - Correlation ID: ${correlation_id}`);
        return res.status(404).json({
          success: false,
          message: 'Validación no encontrada'
        });
      }

      if (ticketValidation.n8n_response_received) {
        console.log(`⚠️ Validación ya procesada - Correlation ID: ${correlation_id}`);
        return res.status(200).json({
          success: true,
          message: 'Validación ya fue procesada anteriormente'
        });
      }

      // Actualizar el registro de validación
      await ticketValidation.update({
        status: valid ? 'approved' : 'rejected',
        validation_result: req.body,
        reason: reason || (valid ? 'Ticket válido' : 'Ticket no válido'),
        confidence: confidence || 0,
        n8n_response_received: true
      });

      console.log(`✅ Validación actualizada - Status: ${valid ? 'approved' : 'rejected'}, Correlation ID: ${correlation_id}`);

      res.json({
        success: true,
        message: 'Respuesta de validación procesada correctamente',
        processed: {
          correlation_id,
          valid,
          reason,
          confidence,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Error procesando respuesta de validación:', error);
      res.status(500).json({
        success: false,
        message: 'Error procesando respuesta de validación'
      });
    }
  }
}

module.exports = new ValidationController();