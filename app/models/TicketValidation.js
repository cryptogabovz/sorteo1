const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TicketValidation = sequelize.define('TicketValidation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  correlation_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  image_path: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  image_filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected'),
    defaultValue: 'pending',
    allowNull: false
  },
  validation_result: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Resultado completo de la validación de n8n'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Razón de aprobación o rechazo'
  },
  confidence: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    comment: 'Nivel de confianza de la validación (0-1)'
  },
  n8n_response_received: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: 'Fecha de expiración de la validación pendiente'
  },
  // Nuevo campo para métricas de tickets rechazados (opcional)
  // rejection_date: {
  //   type: DataTypes.DATEONLY,
  //   allowNull: true,
  //   comment: 'Fecha de rechazo (solo para tickets rechazados)'
  // }
}, {
  tableName: 'ticket_validations',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['correlation_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['n8n_response_received']
    },
    // {
    //   fields: ['rejection_date']
    // }
  ]
});

// Método para limpiar validaciones expiradas
TicketValidation.cleanupExpired = async function() {
  try {
    const result = await this.destroy({
      where: {
        status: 'pending',
        expires_at: {
          [require('sequelize').Op.lt]: new Date()
        }
      }
    });
    if (result > 0) {
      console.log(`🧹 Limpiadas ${result} validaciones expiradas`);
    }
    return result;
  } catch (error) {
    console.error('❌ Error limpiando validaciones expiradas:', error);
    return 0;
  }
};

// Método para encontrar validación por correlation_id
TicketValidation.findByCorrelationId = async function(correlationId) {
  return await this.findOne({
    where: { correlation_id: correlationId }
  });
};

// Método para obtener métricas diarias de participantes (no validaciones)
TicketValidation.getDailyParticipantsMetrics = async function(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [results] = await sequelize.query(`
      SELECT
        DATE(p.created_at) as date,
        COUNT(*) as participants_count
      FROM participants p
      WHERE p.created_at >= ?
      GROUP BY DATE(p.created_at)
      ORDER BY DATE(p.created_at) DESC
    `, {
      replacements: [startDate.toISOString().split('T')[0]]
    });

    return results;
  } catch (error) {
    console.error('Error obteniendo métricas diarias de participantes:', error);
    return [];
  }
};

module.exports = TicketValidation;