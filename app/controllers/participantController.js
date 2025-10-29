const { Participant, TicketValidation } = require('../models');
const axios = require('axios');
const config = require('../config/env');

class ParticipantController {
  // Verificar reCAPTCHA (v2 o v3)
  async verifyRecaptcha(token) {
    try {
      if (!config.recaptcha || !config.recaptcha.secretKey) {
        console.log('⚠️ reCAPTCHA no configurado, omitiendo verificación');
        return { success: true };
      }

      console.log('🔍 Verificando reCAPTCHA con token:', token ? token.substring(0, 20) + '...' : 'null');

      const response = await axios.post('https://www.google.com/recaptcha/api/siteverify', null, {
        params: {
          secret: config.recaptcha.secretKey,
          response: token
        }
      });

      console.log('📥 Respuesta reCAPTCHA:', JSON.stringify(response.data, null, 2));

      // Verificar respuesta básica
      if (!response.data.success) {
        console.log('❌ reCAPTCHA fallido - códigos de error:', response.data['error-codes']);
        return {
          success: false,
          error: response.data['error-codes']?.join(', ') || 'Verificación fallida',
          'error-codes': response.data['error-codes']
        };
      }

      // Para reCAPTCHA v3, verificar score (umbral recomendado: 0.5)
      if (response.data.score !== undefined) {
        const score = response.data.score;
        console.log(`📊 Score reCAPTCHA v3: ${score}`);

        // Considerar válido si score >= 0.5
        if (score >= 0.5) {
          console.log('✅ Score aceptable, usuario válido');
          return { success: true, score: score, version: 'v3' };
        } else {
          console.log('❌ Score bajo, posible bot');
          return { success: false, score: score, error: 'Score de reCAPTCHA demasiado bajo', version: 'v3' };
        }
      }

      // Para reCAPTCHA v2, success=true es suficiente
      console.log('✅ reCAPTCHA v2 verificado exitosamente');
      return { success: true, version: 'v2' };

    } catch (error) {
      console.error('❌ Error verificando reCAPTCHA:', error.response?.data || error.message);

      // Manejar errores específicos de la API
      if (error.response?.data) {
        const errorData = error.response.data;
        console.log('📋 Detalles del error:', errorData);

        if (errorData['error-codes']) {
          return {
            success: false,
            error: `Error de reCAPTCHA: ${errorData['error-codes'].join(', ')}`,
            'error-codes': errorData['error-codes']
          };
        }
      }

      return { success: false, error: 'Error interno de verificación' };
    }
  }

  // Registrar nuevo participante
  async register(req, res) {
    try {
      const { name, lastName, cedula, phone, province, termsAccepted, 'g-recaptcha-response': recaptchaToken } = req.body;

      // Verificar reCAPTCHA si está configurado
      if (config.recaptcha && config.recaptcha.secretKey && config.recaptcha.siteKey) {
        console.log('🔒 reCAPTCHA configurado, verificando...');
        console.log('🔑 Token recibido:', recaptchaToken ? recaptchaToken.substring(0, 20) + '...' : 'null');

        if (!recaptchaToken) {
          console.log('❌ Token de reCAPTCHA faltante');
          return res.status(400).json({
            success: false,
            message: 'Por favor, complete la verificación de reCAPTCHA'
          });
        }

        try {
          const recaptchaResult = await this.verifyRecaptcha(recaptchaToken);
          console.log('📊 Resultado verificación reCAPTCHA:', recaptchaResult);

          if (!recaptchaResult.success) {
            console.log('❌ Verificación de reCAPTCHA fallida:', recaptchaResult);
            return res.status(400).json({
              success: false,
              message: 'Verificación de reCAPTCHA fallida. Intente nuevamente.'
            });
          }
          console.log('✅ reCAPTCHA verificado exitosamente');
        } catch (recaptchaError) {
          console.error('❌ Error verificando reCAPTCHA:', recaptchaError);
          // No bloquear el registro por errores de reCAPTCHA, solo loggear
          console.log('⚠️ Continuando sin verificación reCAPTCHA por error');
        }
      } else {
        console.log('⚠️ reCAPTCHA no configurado o incompleto, omitiendo verificación');
      }

      // Validar aceptación de términos y condiciones
      if (!termsAccepted || termsAccepted !== 'on') {
        return res.status(400).json({
          success: false,
          message: 'Debe aceptar los términos y condiciones para participar'
        });
      }

      // Sanitización y validación de inputs
      const sanitizedData = {
        name: name?.trim().replace(/[<>\"'&]/g, ''),
        lastName: lastName?.trim().replace(/[<>\"'&]/g, ''),
        cedula: cedula?.trim().replace(/[^0-9]/g, ''), // Solo números
        phone: phone?.trim().replace(/[^0-9+\-\s]/g, ''), // Solo números, espacios, + y -
        province: province?.trim()
      };

      // Validar que todos los campos estén presentes y no vacíos
      if (!sanitizedData.name || !sanitizedData.lastName || !sanitizedData.cedula ||
          !sanitizedData.phone || !sanitizedData.province) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos y deben ser válidos'
        });
      }

      // Validar longitudes mínimas
      if (sanitizedData.name.length < 2 || sanitizedData.lastName.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y apellido deben tener al menos 2 caracteres'
        });
      }

      if (sanitizedData.cedula.length < 5) {
        return res.status(400).json({
          success: false,
          message: 'Cédula debe tener al menos 5 dígitos'
        });
      }

      if (sanitizedData.phone.length < 7) {
        return res.status(400).json({
          success: false,
          message: 'Teléfono debe tener al menos 7 caracteres'
        });
      }

      // Validar datos requeridos (todos obligatorios)
      if (!name || !lastName || !cedula || !phone || !province) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      // Verificar que haya resultado de validación en sesión
      if (!req.session.validationResult) {
        return res.status(400).json({
          success: false,
          message: 'Debe validar el ticket primero'
        });
      }

      const validationResult = req.session.validationResult;

      // Si hay correlationId, verificar estado en BD
      if (validationResult.correlationId) {
        const ticketValidation = await TicketValidation.findByCorrelationId(validationResult.correlationId);

        if (!ticketValidation) {
          return res.status(400).json({
            success: false,
            message: 'Validación no encontrada. Intente subir el ticket nuevamente.'
          });
        }

        if (ticketValidation.status === 'pending') {
          return res.status(400).json({
            success: false,
            message: 'La validación aún está en proceso. Espere unos momentos e intente nuevamente.'
          });
        }

        if (ticketValidation.status === 'rejected') {
          return res.status(400).json({
            success: false,
            message: `Ticket rechazado: ${ticketValidation.reason || 'No cumple con los requisitos'}`
          });
        }

        if (ticketValidation.status !== 'approved') {
          return res.status(400).json({
            success: false,
            message: 'Estado de validación desconocido. Contacte al administrador.'
          });
        }

        // Validación aprobada - continuar con el registro
        console.log(`✅ Validación aprobada para registro - Correlation ID: ${validationResult.correlationId}`);
      } else {
        // Validación síncrona (legacy) - verificar valid flag
        if (!validationResult.valid) {
          return res.status(400).json({
            success: false,
            message: 'El ticket no es válido'
          });
        }
      }

      // Nota: Permitir múltiples registros con la misma cédula
      // ya que una persona puede comprar varios productos y participar múltiples veces
      console.log(`📝 Registro con cédula ${cedula} - Permitido múltiples participaciones`);

      // Obtener próximo número de ticket
      const ticketNumber = await Participant.getNextTicketNumber();

      // Crear participante con datos sanitizados
      const participant = await Participant.create({
        ticket_number: ticketNumber,
        name: sanitizedData.name,
        last_name: sanitizedData.lastName,
        cedula: sanitizedData.cedula,
        phone: sanitizedData.phone,
        province: sanitizedData.province,
        ticket_validated: true,
        ticket_image_url: validationResult.ticketImageUrl || null
      });

      // Limpiar sesión
      delete req.session.validationResult;

      res.json({
        success: true,
        message: 'Participante registrado exitosamente',
        data: {
          ticketNumber: participant.ticket_number,
          name: participant.name,
          lastName: participant.last_name
        }
      });

    } catch (error) {
      console.error('❌ Error registrando participante:', error);
      console.error('Stack trace:', error.stack);

      // Manejar errores de validación de Sequelize
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(err => err.message);
        console.log('📋 Errores de validación:', messages);
        return res.status(400).json({
          success: false,
          message: messages.join(', ')
        });
      }

      // Manejar errores de unicidad - ahora permitimos múltiples registros
      if (error.name === 'SequelizeUniqueConstraintError') {
        console.log('⚠️ Error de unicidad detectado, pero permitiendo múltiples participaciones');
        // No devolver error, continuar normalmente
      }

      // Manejar errores de base de datos
      if (error.name === 'SequelizeDatabaseError') {
        console.error('💾 Error de base de datos:', error.original?.message);
        return res.status(500).json({
          success: false,
          message: 'Error de base de datos. Intente nuevamente.'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener estadísticas para dashboard público (opcional)
  async getPublicStats(req, res) {
    try {
      const stats = await Participant.getStats();

      res.json({
        success: true,
        data: {
          totalParticipants: stats.total_participants,
          validatedTickets: stats.validated_tickets,
          provinces: stats.provinces_count
        }
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo estadísticas'
      });
    }
  }
}

module.exports = new ParticipantController();