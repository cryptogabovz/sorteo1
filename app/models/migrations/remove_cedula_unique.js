'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remover la restricción única de la columna cedula
    await queryInterface.removeConstraint('participants', 'participants_cedula_key');
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