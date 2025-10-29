const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Participant = sequelize.define('participants', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ticket_number: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      is: /^\d{4}$/ // Formato 0001, 0002, etc.
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  cedula: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: false, // Permitir múltiples registros con misma cédula
    validate: {
      notEmpty: true,
      len: [5, 20]
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [7, 20]
    }
  },
  province: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 50]
    }
  },
  ticket_validated: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  validation_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ticket_image_url: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  deletion_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  deleted_by: {
    type: DataTypes.UUID,
    allowNull: true
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['ticket_number']
    },
    {
      fields: ['cedula'] // Permitir múltiples registros con misma cédula
    },
    {
      fields: ['province']
    },
    {
      fields: ['ticket_validated']
    },
    {
      fields: ['created_at']
    }
  ]
});

// Método para obtener próximo número de ticket disponible
Participant.getNextTicketNumber = async function() {
  // Primero buscar si hay números eliminados disponibles (reutilización)
  const deletedTicket = await this.findOne({
    where: {
      deleted_at: {
        [require('sequelize').Op.ne]: null // Tickets eliminados
      }
    },
    order: [['ticket_number', 'ASC']] // El más bajo disponible primero
  });

  if (deletedTicket) {
    console.log(`♻️ Reutilizando número de ticket eliminado: ${deletedTicket.ticket_number}`);
    return deletedTicket.ticket_number;
  }

  // Si no hay eliminados, buscar el último ticket activo (no eliminado)
  const lastParticipant = await this.findOne({
    where: {
      deleted_at: null // Solo tickets no eliminados
    },
    order: [['ticket_number', 'DESC']]
  });

  if (!lastParticipant) {
    return '0001';
  }

  const lastNumber = parseInt(lastParticipant.ticket_number);
  const nextNumber = lastNumber + 1;
  return nextNumber.toString().padStart(4, '0');
};

// Método para obtener estadísticas
Participant.getStats = async function() {
  const [results] = await sequelize.query(`
    SELECT
      COUNT(*) as total_participants,
      COUNT(CASE WHEN ticket_validated = true THEN 1 END) as validated_tickets,
      COUNT(CASE WHEN ticket_validated = false THEN 1 END) as rejected_tickets,
      COUNT(DISTINCT province) as provinces_count
    FROM participants
  `);

  return results[0];
};

// Método para obtener métricas diarias de participantes
Participant.getDailyParticipantsMetrics = async function(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [results] = await sequelize.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as participants_count
      FROM participants
      WHERE created_at >= ?
      GROUP BY DATE(created_at)
      ORDER BY DATE(created_at) DESC
    `, {
      replacements: [startDate.toISOString().split('T')[0]]
    });

    return results;
  } catch (error) {
    console.error('Error obteniendo métricas diarias de participantes:', error);
    return [];
  }
};

module.exports = Participant;