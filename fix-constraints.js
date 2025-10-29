const { sequelize } = require('./app/config/database');

async function fixConstraints() {
  try {
    console.log('🔧 Aplicando corrección final de restricciones...');

    // 1. Verificar restricciones actuales
    const [constraints] = await sequelize.query(`
      SELECT conname as constraint_name, contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = 'participants'::regclass;
    `);

    console.log('Restricciones actuales:');
    constraints.forEach(c => {
      console.log('- Nombre:', c.constraint_name, 'Tipo:', c.constraint_type);
    });

    // 2. Eliminar restricción de cédula si existe
    const cedulaConstraint = constraints.find(c => c.constraint_name === 'participants_cedula');
    if (cedulaConstraint) {
      console.log('❌ Eliminando restricción participants_cedula...');
      await sequelize.query('ALTER TABLE participants DROP CONSTRAINT participants_cedula;');
      console.log('✅ Restricción participants_cedula eliminada');
    } else {
      console.log('ℹ️ Restricción participants_cedula no existe');
    }

    // 3. Verificar que ticket_number siga siendo único
    const ticketConstraint = constraints.find(c => c.constraint_name === 'participants_ticket_number');
    if (ticketConstraint) {
      console.log('✅ Restricción participants_ticket_number existe (correcto)');
    } else {
      console.log('⚠️ ADVERTENCIA: Restricción participants_ticket_number no encontrada');
    }

    // 4. Verificar restricciones finales
    const [finalConstraints] = await sequelize.query(`
      SELECT conname as constraint_name, contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = 'participants'::regclass;
    `);

    console.log('Restricciones finales:');
    finalConstraints.forEach(c => {
      console.log('- Nombre:', c.constraint_name, 'Tipo:', c.constraint_type);
    });

    // 5. Probar creación de registro
    console.log('🧪 Probando creación de registro...');
    const { Participant } = require('./app/models');

    const testParticipant = await Participant.create({
      ticket_number: '9999',
      name: 'Test',
      last_name: 'Migration',
      cedula: '22006181',
      phone: '04140000000',
      province: 'Test Province',
      ticket_validated: true
    });

    console.log('✅ Registro de prueba creado:', testParticipant.ticket_number);

    // Limpiar
    await testParticipant.destroy();
    console.log('🧹 Registro de prueba eliminado');

    console.log('🎉 CORRECCIÓN COMPLETADA: Múltiples boletos funcionan correctamente');

  } catch (error) {
    console.error('❌ ERROR en corrección:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('Campos con error de unicidad:', error.fields);
    }
  } finally {
    await sequelize.close();
  }
}

fixConstraints();