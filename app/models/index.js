const { sequelize } = require('../config/database');
const Participant = require('./Participant');
const AdminUser = require('./AdminUser');

// Sincronizar modelos con la base de datos
const syncDatabase = async () => {
  try {
    // En producción, no sincronizar automáticamente para evitar problemas
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos (development)');

      // Crear admin por defecto solo en desarrollo
      await AdminUser.createDefaultAdmin();
    } else {
      console.log('ℹ️ Modo producción: No se sincronizan modelos automáticamente');
      console.log('ℹ️ Asegúrate de que las tablas existan en la base de datos');

      // En producción, intentar crear admin si las variables están configuradas
      const config = require('../config/env');
      if (config.adminUsername && config.adminPassword) {
        await AdminUser.createDefaultAdmin();
      }
    }
  } catch (error) {
    console.error('❌ Error sincronizando modelos:', error);
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