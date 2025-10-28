const { Participant, TicketValidation } = require('../models');

class ParticipantController {
  // Registrar nuevo participante
  async register(req, res) {
    try {
      const { name, lastName, cedula, phone, province, termsAccepted } = req.body;

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
      console.error('Error registrando participante:', error);

      // Manejar errores de validación de Sequelize
      if (error.name === 'SequelizeValidationError') {
        const messages = error.errors.map(err => err.message);
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