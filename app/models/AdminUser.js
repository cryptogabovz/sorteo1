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

// Método para crear admin por defecto (siempre se asegura de que exista con credenciales correctas)
AdminUser.createDefaultAdmin = async function() {
  try {
    // Usar credenciales fijas para producción
    const defaultUsername = 'admin';
    const defaultPassword = 'Olaizolas##11Pl';

    console.log(`🔐 Configurando usuario admin: ${defaultUsername}/${defaultPassword}`);

    // Buscar admin existente
    const existingAdmin = await this.findOne({ where: { username: defaultUsername } });

    if (!existingAdmin) {
      // Crear admin con contraseña fija
      console.log('📝 Creando nuevo usuario admin...');
      const bcrypt = require('bcrypt');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

      const newAdmin = await this.create({
        username: defaultUsername,
        password_hash: hashedPassword
      });
      console.log(`✅ Admin creado exitosamente: ID ${newAdmin.id}, usuario: ${defaultUsername}`);
    } else {
      // Si existe, siempre actualizar la contraseña para asegurar que sea correcta
      console.log('🔄 Actualizando contraseña del admin existente...');
      const bcrypt = require('bcrypt');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

      await existingAdmin.update({ password_hash: hashedPassword });
      console.log(`✅ Contraseña del admin actualizada: ${defaultUsername}/${defaultPassword}`);
    }
  } catch (error) {
    console.error('❌ Error creando/configurando admin por defecto:', error);
    console.error('Stack trace:', error.stack);
  }
};

module.exports = AdminUser;