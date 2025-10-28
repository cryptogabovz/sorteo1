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

    // PRIMERO: Intentar eliminar cualquier admin existente para evitar conflictos
    try {
      const deletedCount = await this.destroy({ where: { username: defaultUsername } });
      if (deletedCount > 0) {
        console.log(`🗑️ Eliminados ${deletedCount} usuarios admin existentes`);
      }
    } catch (deleteError) {
      console.log('⚠️ No se pudieron eliminar admins existentes, continuando...');
    }

    // SEGUNDO: Crear admin fresco con contraseña correcta
    console.log('📝 Creando usuario admin desde cero...');
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    const newAdmin = await this.create({
      username: defaultUsername,
      password_hash: hashedPassword
    });

    console.log(`✅ Admin creado exitosamente: ID ${newAdmin.id}, usuario: ${defaultUsername}`);
    console.log(`🔑 Credenciales finales: ${defaultUsername} / ${defaultPassword}`);

  } catch (error) {
    console.error('❌ Error creando/configurando admin por defecto:', error);
    console.error('Stack trace:', error.stack);

    // Intento de respaldo: forzar creación sin validaciones
    try {
      console.log('🔧 Intentando creación forzada...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Olaizolas##11Pl', 12);

      await this.sequelize.query(`
        INSERT INTO admin_users (id, username, password_hash, created_at, updated_at)
        VALUES (gen_random_uuid(), 'admin', '${hashedPassword}', NOW(), NOW())
        ON CONFLICT (username) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW()
      `);

      console.log('✅ Admin creado/actualizado vía SQL directo');
    } catch (fallbackError) {
      console.error('❌ Error incluso en fallback:', fallbackError.message);
    }
  }
};

module.exports = AdminUser;