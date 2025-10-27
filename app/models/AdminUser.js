const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcrypt');

const AdminUser = sequelize.define('admin_users', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [3, 50],
      isAlphanumeric: true
    }
  },
  password_hash: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['username']
    }
  ]
});

// Hook para hashear contraseña antes de guardar
AdminUser.beforeCreate(async (adminUser) => {
  if (adminUser.password_hash) {
    const saltRounds = 12;
    adminUser.password_hash = await bcrypt.hash(adminUser.password_hash, saltRounds);
  }
});

AdminUser.beforeUpdate(async (adminUser) => {
  if (adminUser.changed('password_hash')) {
    const saltRounds = 12;
    adminUser.password_hash = await bcrypt.hash(adminUser.password_hash, saltRounds);
  }
});

// Método para verificar contraseña
AdminUser.prototype.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password_hash);
};

// Método para crear admin por defecto (solo si no existe)
AdminUser.createDefaultAdmin = async function() {
  try {
    const existingAdmin = await this.findOne({ where: { username: 'admin' } });
    if (!existingAdmin) {
      await this.create({
        username: 'admin',
        password_hash: 'admin123' // Se hasheará automáticamente
      });
      console.log('✅ Admin por defecto creado: admin/admin123');
    }
  } catch (error) {
    console.error('❌ Error creando admin por defecto:', error);
  }
};

module.exports = AdminUser;