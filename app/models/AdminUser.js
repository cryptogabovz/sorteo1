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
    const config = require('../config/env');

    // Usar credenciales fijas para producción
    const defaultUsername = 'admin';
    const defaultPassword = 'Olaizolas##11Pl';

    // Buscar admin existente
    const existingAdmin = await this.findOne({ where: { username: defaultUsername } });

    if (!existingAdmin) {
      // Crear admin con contraseña fija
      const bcrypt = require('bcrypt');
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

      await this.create({
        username: defaultUsername,
        password_hash: hashedPassword
      });
      console.log(`✅ Admin por defecto creado: ${defaultUsername}/${defaultPassword}`);
    } else {
      // Si existe, verificar si la contraseña es correcta, si no, actualizarla
      const isCorrectPassword = await existingAdmin.checkPassword(defaultPassword);
      if (!isCorrectPassword) {
        console.log('🔄 Actualizando contraseña del admin existente...');
        const bcrypt = require('bcrypt');
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

        await existingAdmin.update({ password_hash: hashedPassword });
        console.log(`✅ Contraseña del admin actualizada: ${defaultUsername}/${defaultPassword}`);
      } else {
        console.log(`✅ Admin ya existe con contraseña correcta: ${defaultUsername}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creando/verificando admin por defecto:', error);
  }
};

module.exports = AdminUser;