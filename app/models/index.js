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
      console.log('ℹ️ Modo producción: Eliminando y recreando tablas...');

      // En producción, forzar recreación completa de tablas
      await sequelize.sync({ force: true });
      console.log('✅ Tablas recreadas completamente en producción');

      // En producción, intentar crear admin si las variables están configuradas
      const config = require('../config/env');
      if (config.adminUsername && config.adminPassword) {
        console.log('ℹ️ Creando usuario admin en producción...');
        try {
          await AdminUser.createDefaultAdmin();
          console.log('✅ Usuario admin creado exitosamente en producción');
        } catch (adminError) {
          console.error('❌ Error creando admin:', adminError.message);
          // No fallar por esto
        }
      } else {
        console.log('⚠️ Variables ADMIN_USERNAME y ADMIN_PASSWORD no configuradas');
      }
    }
  } catch (error) {
    console.error('❌ Error sincronizando modelos:', error);
    console.error('Stack trace:', error.stack);

    // En producción, intentar continuar de todas formas
    console.log('⚠️ Intentando continuar sin sincronización automática...');
  }
};

module.exports = {
  sequelize,
  Participant,
  AdminUser,
  syncDatabase
};