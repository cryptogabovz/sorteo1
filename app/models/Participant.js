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
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['ticket_number']
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
  const lastParticipant = await this.findOne({
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

module.exports = Participant;