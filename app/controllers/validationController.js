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
      expiresAt.setMinutes(expiresAt.getMinutes() + 60); // Expira en 60 minutos para dar tiempo a n8n

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
        response_url: `${req.protocol}://${req.get('host')}/api/webhook/validation-response`,
        // Agregar información adicional para debugging
        file_size: req.file.size,
        upload_timestamp: new Date().toISOString()
      };

      console.log(`📤 Enviando imagen a n8n - Correlation ID: ${correlationId}`);
      console.log(`📤 URL n8n: ${config.n8nWebhookUrl}`);
      console.log(`📤 Tamaño imagen: ${(base64Image.length / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📤 Response URL: ${payload.response_url}`);

      // Llamar a webhook de n8n con timeout reducido (solo para envío)
      const auth = Buffer.from(`${config.n8nWebhookUser}:${config.n8nWebhookPass}`).toString('base64');

      try {
        const n8nResponse = await axios.post(config.n8nWebhookUrl, payload, {
          timeout: 10000, // Aumentar a 10 segundos para envío
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${auth}`
          }
        });
        console.log(`📤 Imagen enviada exitosamente a n8n - Correlation ID: ${correlationId}`);
        console.log(`📤 Respuesta n8n:`, n8nResponse.data);
      } catch (n8nError) {
        console.error(`⚠️ Error enviando a n8n, pero continuamos:`, n8nError.message);
        console.error(`⚠️ Detalles del error:`, n8nError.response?.data || n8nError.message);
        // No fallamos aquí, continuamos con el flujo asíncrono
      }

      // Siempre esperamos respuesta asíncrona por webhook
      console.log(`⏳ Iniciando espera de validación asíncrona - Correlation ID: ${correlationId}`);

      return res.json({
        success: true,
        message: 'Validación iniciada. Procesando imagen...',
        correlationId,
        status: 'processing',
        nextStep: 'wait'
      });

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
        confidence,
        timestamp: new Date().toISOString()
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
      const updateData = {
        status: valid ? 'approved' : 'rejected',
        validation_result: req.body,
        reason: reason || (valid ? 'Ticket válido' : 'Ticket no válido'),
        confidence: confidence || 0,
        n8n_response_received: true
      };

      // Solo actualizar rejection_date si es rechazado (evitar error de columna)
      if (!valid) {
        // Verificar si la columna existe antes de actualizar
        try {
          updateData.rejection_date = new Date().toISOString().split('T')[0]; // Solo fecha YYYY-MM-DD
        } catch (columnError) {
          console.log('⚠️ Columna rejection_date no disponible, omitiendo actualización');
        }
      }

      await ticketValidation.update(updateData);

      console.log(`✅ Validación actualizada - Status: ${valid ? 'approved' : 'rejected'}, Correlation ID: ${correlation_id}`);
      console.log(`📅 Tiempo de expiración: ${ticketValidation.expires_at}`);
      console.log(`⏱️ Tiempo restante: ${Math.round((ticketValidation.expires_at - new Date()) / 1000)} segundos`);

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

  // Verificar estado de validación (para polling del frontend)
  async checkValidationStatus(req, res) {
    try {
      const { correlationId } = req.params;

      if (!correlationId) {
        return res.status(400).json({
          success: false,
          message: 'correlationId requerido'
        });
      }

      // Buscar validación en BD
      const ticketValidation = await TicketValidation.findByCorrelationId(correlationId);

      if (!ticketValidation) {
        return res.status(404).json({
          success: false,
          message: 'Validación no encontrada'
        });
      }

      // Verificar si expiró
      if (new Date() > ticketValidation.expires_at) {
        console.log(`⏰ Validación expirada - Correlation ID: ${correlationId}, Expiró: ${ticketValidation.expires_at}`);
        return res.json({
          success: true,
          status: 'expired',
          message: 'La validación ha expirado. Intente subir el ticket nuevamente.',
          expired: true
        });
      }

      // Retornar estado actual
      const response = {
        success: true,
        status: ticketValidation.status,
        correlationId: ticketValidation.correlation_id
      };

      if (ticketValidation.status === 'approved') {
        response.valid = true;
        response.reason = ticketValidation.reason || 'Ticket válido';
        response.confidence = ticketValidation.confidence;
        response.nextStep = 'register';

        console.log('💾 Guardando validationResult en sesión para registro...');

        // Guardar resultado en sesión para el registro
        req.session.validationResult = {
          correlationId,
          valid: true,
          reason: ticketValidation.reason || 'Ticket válido',
          confidence: ticketValidation.confidence || 0,
          ticketImageUrl: ticketValidation.image_filename ? `/uploads/${ticketValidation.image_filename}` : null,
          tempFile: ticketValidation.image_filename,
          timestamp: Date.now() // Timestamp para expiración
        };

        console.log('Sesión después de guardar validationResult:', {
          validationResult: req.session.validationResult,
          sessionID: req.sessionID
        });

      } else if (ticketValidation.status === 'rejected') {
        response.valid = false;
        response.reason = ticketValidation.reason || 'Ticket no válido';
        response.confidence = ticketValidation.confidence;
        response.nextStep = 'retry';
      } else {
        // Aún pendiente
        response.message = 'Procesando imagen...';
      }

      res.json(response);

    } catch (error) {
      console.error('❌ Error verificando estado de validación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}

module.exports = new ValidationController();