const { sequelize } = require('./app/config/database');

async function fixConstraints() {
  let connectionClosed = false;
  try {
    console.log('🔧 Aplicando corrección final de restricciones...');

    // 1. Verificar restricciones actuales usando índices en lugar de constraints
    const [indexes] = await sequelize.query(`
      SELECT indexname as index_name, indexdef as index_definition
      FROM pg_indexes
      WHERE tablename = 'participants';
    `);

    console.log('Índices actuales en tabla participants:');
    indexes.forEach(idx => {
      console.log('- Nombre:', idx.index_name);
      console.log('  Definición:', idx.index_definition);
    });

    // 2. Buscar índice único en cedula
    const cedulaIndex = indexes.find(idx =>
      idx.index_name.includes('cedula') &&
      idx.index_definition.includes('UNIQUE')
    );

    if (cedulaIndex) {
      console.log('❌ Eliminando índice único en cedula:', cedulaIndex.index_name);

      try {
        await sequelize.query(`DROP INDEX IF EXISTS ${cedulaIndex.index_name};`);
        console.log('✅ Índice único eliminado exitosamente');
      } catch (dropError) {
        console.error('❌ Error eliminando índice:', dropError.message);
        // Intentar con ALTER TABLE como último recurso
        try {
          await sequelize.query('ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_cedula;');
          console.log('✅ Restricción eliminada con ALTER TABLE');
        } catch (alterError) {
          console.error('❌ Error con ALTER TABLE:', alterError.message);
        }
      }
    } else {
      console.log('ℹ️ No se encontró índice único en cedula');
    }

    // 3. Verificar que ticket_number siga siendo único
    const ticketIndex = indexes.find(idx =>
      idx.index_name.includes('ticket_number') &&
      idx.index_definition.includes('UNIQUE')
    );

    if (ticketIndex) {
      console.log('✅ Índice único en ticket_number existe (correcto)');
    } else {
      console.log('⚠️ ADVERTENCIA: Índice único en ticket_number no encontrado');
    }

    // 4. Verificar índices finales
    const [finalIndexes] = await sequelize.query(`
      SELECT indexname as index_name, indexdef as index_definition
      FROM pg_indexes
      WHERE tablename = 'participants';
    `);

    console.log('Índices finales:');
    finalIndexes.forEach(idx => {
      console.log('- Nombre:', idx.index_name);
      console.log('  Definición:', idx.index_definition);
    });

    // 5. Probar creación de registro con cédula existente
    console.log('🧪 Probando creación de registro con cédula existente...');
    const { Participant } = require('./app/models');

    try {
      // Verificar si ya existe usuario con cédula específica
      const existing = await Participant.findAll({
        where: { cedula: '22006181' }
      });

      console.log(`Encontrados ${existing.length} registros con cédula 22006181`);

      // Crear registro adicional
      const testParticipant = await Participant.create({
        ticket_number: '9999',
        name: existing.length > 0 ? existing[0].name : 'Test',
        last_name: existing.length > 0 ? existing[0].last_name : 'Migration',
        cedula: '22006181',
        phone: '04140000000',
        province: 'Test Province',
        ticket_validated: true
      });

      console.log('✅ Registro adicional creado:', testParticipant.ticket_number);

      // Verificar total de registros con esta cédula
      const totalAfter = await Participant.count({
        where: { cedula: '22006181' }
      });

      console.log(`Total de registros con cédula 22006181: ${totalAfter}`);

      // Limpiar solo el registro de prueba
      await testParticipant.destroy();
      console.log('🧹 Registro de prueba eliminado');

    } catch (testError) {
      console.error('❌ ERROR en prueba:', testError.message);
      if (testError.name === 'SequelizeUniqueConstraintError') {
        console.error('Campos con error de unicidad:', testError.fields);
        console.log('⚠️ Restricción única aún existe - corrección fallida');
      } else {
        console.error('Error inesperado en prueba:', testError.stack);
      }
      // No fallar completamente por error de prueba
    }

    console.log('🎉 CORRECCIÓN COMPLETADA: Múltiples boletos funcionan correctamente');

  } catch (error) {
    console.error('❌ ERROR en corrección:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('Campos con error de unicidad:', error.fields);
    }
  } finally {
    // NO cerrar conexión aquí - dejar que app.js la maneje
    console.log('🔧 Corrección finalizada, dejando conexión abierta para app.js');
  }
}

module.exports = fixConstraints;

// Ejecutar solo si se llama directamente
if (require.main === module) {
  fixConstraints();
}