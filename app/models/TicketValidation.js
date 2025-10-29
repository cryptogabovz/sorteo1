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
  // Nuevo campo para métricas de tickets rechazados
  rejection_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Fecha de rechazo (solo para tickets rechazados)'
  }
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
    {
      fields: ['rejection_date']
    }
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

// Método para obtener métricas diarias de validaciones
TicketValidation.getDailyMetrics = async function(days = 7) {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Para approved usamos created_at, para rejected usamos rejection_date
    const [results] = await sequelize.query(`
      SELECT
        DATE(COALESCE(tv.rejection_date, tv.created_at)) as date,
        COUNT(CASE WHEN tv.status = 'approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN tv.status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(*) as total_count
      FROM ticket_validations tv
      WHERE (tv.status = 'approved' AND tv.created_at >= ?)
         OR (tv.status = 'rejected' AND tv.rejection_date >= ?)
      GROUP BY DATE(COALESCE(tv.rejection_date, tv.created_at))
      ORDER BY DATE(COALESCE(tv.rejection_date, tv.created_at)) DESC
    `, {
      replacements: [
        startDate.toISOString().split('T')[0], // Para approved
        startDate.toISOString().split('T')[0]  // Para rejected
      ]
    });

    return results;
  } catch (error) {
    console.error('Error obteniendo métricas diarias:', error);
    return [];
  }
};

module.exports = TicketValidation;