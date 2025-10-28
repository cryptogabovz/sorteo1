const { Participant, TicketValidation } = require('../models');

class ParticipantController {
  // Registrar nuevo participante
  async register(req, res) {
    try {
      const { name, lastName, cedula, phone, province } = req.body;

      // Validar datos requeridos
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

      // Crear participante
      const participant = await Participant.create({
        ticket_number: ticketNumber,
        name: name.trim(),
        last_name: lastName.trim(),
        cedula: cedula.trim(),
        phone: phone.trim(),
        province: province.trim(),
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

      // Manejar errores de unicidad
      if (error.name === 'SequelizeUniqueConstraintError') {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un registro con estos datos'
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