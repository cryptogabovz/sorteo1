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
      console.log('ℹ️ Modo producción: Desactivando sincronización automática');

      // En producción, NO hacer sincronización automática
      // Las tablas deben crearse manualmente o mediante migraciones
      console.log('✅ Sincronización automática desactivada en producción');

      // En producción, intentar crear admin si las variables están configuradas
      const config = require('../config/env');
      if (config.adminUsername && config.adminPassword) {
        console.log('ℹ️ Verificando/creando usuario admin en producción...');
        try {
          await AdminUser.createDefaultAdmin();
          console.log('✅ Usuario admin creado/verificado en producción');
        } catch (adminError) {
          console.error('❌ Error creando admin:', adminError.message);
          // No fallar por esto
        }
      } else {
        console.log('⚠️ Variables ADMIN_USERNAME y ADMIN_PASSWORD no configuradas');
      }
    }
  } catch (error) {
    console.error('❌ Error en inicialización de BD:', error.message);

    // En producción, intentar continuar de todas formas
    console.log('⚠️ Continuando sin inicialización automática de BD...');
  }
};

module.exports = {
  sequelize,
  Participant,
  AdminUser,
  syncDatabase
};