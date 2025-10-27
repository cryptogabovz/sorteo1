const { sequelize } = require('../config/database');
const Participant = require('./Participant');
const AdminUser = require('./AdminUser');

// Sincronizar modelos con la base de datos
const syncDatabase = async () => {
  try {
    await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
    console.log('✅ Modelos sincronizados con la base de datos');

    // Crear admin por defecto
    await AdminUser.createDefaultAdmin();
  } catch (error) {
    console.error('❌ Error sincronizando modelos:', error);
  }
};

module.exports = {
  sequelize,
  Participant,
  AdminUser,
  syncDatabase
};