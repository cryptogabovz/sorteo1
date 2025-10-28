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

// Método para crear admin por defecto (OBLIGATORIO - se ejecuta siempre)
AdminUser.createDefaultAdmin = async function() {
  try {
    // Credenciales FIJAS - NO dependen de variables de entorno
    const defaultUsername = 'admin';
    const defaultPassword = 'Olaizolas##11Pl';

    console.log(`🔐 CREANDO USUARIO ADMIN OBLIGATORIO: ${defaultUsername}/${defaultPassword}`);

    // PRIMERO: Forzar eliminación de cualquier admin existente
    console.log('🗑️ Eliminando cualquier usuario admin existente...');
    try {
      await this.sequelize.query(`DELETE FROM admin_users WHERE username = '${defaultUsername}'`);
      console.log('✅ Usuario admin anterior eliminado (si existía)');
    } catch (deleteError) {
      console.log('⚠️ No se pudo eliminar admin anterior, continuando...');
    }

    // SEGUNDO: Crear admin con SQL directo para evitar problemas de Sequelize
    console.log('📝 Creando usuario admin con SQL directo...');
    const bcrypt = require('bcrypt');
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);

    const insertQuery = `
      INSERT INTO admin_users (id, username, password_hash, created_at, updated_at)
      VALUES (gen_random_uuid(), '${defaultUsername}', '${hashedPassword}', NOW(), NOW())
    `;

    await this.sequelize.query(insertQuery);

    console.log(`✅ USUARIO ADMIN CREADO EXITOSAMENTE`);
    console.log(`🔑 CREDENCIALES: ${defaultUsername} / ${defaultPassword}`);
    console.log(`🚀 El admin está listo para usar`);

  } catch (error) {
    console.error('❌ ERROR CRÍTICO creando admin:', error);
    console.error('Stack trace completo:', error.stack);

    // ÚLTIMO RESPALDO: Intentar con query más simple
    try {
      console.log('🔧 INTENTANDO ÚLTIMO RESPALDO...');
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash('Olaizolas##11Pl', 12);

      await this.sequelize.query(`
        INSERT INTO admin_users (id, username, password_hash, created_at, updated_at)
        VALUES (gen_random_uuid(), 'admin', '${hashedPassword}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      console.log('✅ ADMIN CREADO CON RESPALDO DE EMERGENCIA');
    } catch (finalError) {
      console.error('❌ ERROR TOTAL: No se pudo crear el admin ni siquiera con respaldo');
      console.error('Final error:', finalError.message);
      throw finalError; // Forzar que el deploy falle si no se puede crear el admin
    }
  }
};

module.exports = AdminUser;