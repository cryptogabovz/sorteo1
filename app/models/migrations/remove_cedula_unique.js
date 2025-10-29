'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Intentar remover la restricción nombrada primero
      await queryInterface.removeConstraint('participants', 'participants_cedula_key');
      console.log('✅ Restricción participants_cedula_key removida');
    } catch (error) {
      console.log('ℹ️ Restricción participants_cedula_key no encontrada, intentando con nombre automático');
    }

    try {
      // Intentar remover la restricción automática de PostgreSQL
      await queryInterface.removeConstraint('participants', 'participants_cedula');
      console.log('✅ Restricción participants_cedula removida');
    } catch (error) {
      console.log('ℹ️ Restricción participants_cedula no encontrada');
    }

    // También intentar remover índices únicos relacionados
    try {
      await queryInterface.removeIndex('participants', ['cedula']);
      console.log('✅ Índice único de cedula removido');
    } catch (error) {
      console.log('ℹ️ Índice único de cedula no encontrado o ya removido');
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir: agregar de nuevo la restricción única
    await queryInterface.addConstraint('participants', {
      fields: ['cedula'],
      type: 'unique',
      name: 'participants_cedula_key'
    });
  }
};