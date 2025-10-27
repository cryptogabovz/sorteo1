const { sequelize } = require('../config/database');
const Participant = require('./Participant');
const AdminUser = require('./AdminUser');

// Sincronizar modelos con la base de datos
const syncDatabase = async () => {
  try {
    // En producción, crear tablas si no existen, pero no alterar estructura
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos (development)');

      // Crear admin por defecto solo en desarrollo
      await AdminUser.createDefaultAdmin();
    } else {
      console.log('ℹ️ Modo producción: Verificando/creando tablas...');

      // En producción, crear tablas si no existen
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ Tablas verificadas/creadas en producción');

      // En producción, intentar crear admin si las variables están configuradas
      const config = require('../config/env');
      if (config.adminUsername && config.adminPassword) {
        console.log('ℹ️ Intentando crear usuario admin en producción...');
        await AdminUser.createDefaultAdmin();
        console.log('✅ Usuario admin creado/verificado en producción');
      } else {
        console.log('⚠️ Variables ADMIN_USERNAME y ADMIN_PASSWORD no configuradas');
      }
    }
  } catch (error) {
    console.error('❌ Error sincronizando modelos:', error);
    console.error('Stack trace:', error.stack);

    // En producción, no fallar si hay error de sincronización
    if (process.env.NODE_ENV !== 'development') {
      console.log('⚠️ Continuando sin sincronización automática...');
    } else {
      throw error;
    }
  }
};

module.exports = {
  sequelize,
  Participant,
  AdminUser,
  syncDatabase
};