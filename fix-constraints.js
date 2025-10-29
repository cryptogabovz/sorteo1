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

    // 2. Eliminar restricción de cédula si existe (múltiples métodos)
    const cedulaConstraint = constraints.find(c => c.constraint_name === 'participants_cedula');
    if (cedulaConstraint) {
      console.log('❌ Eliminando restricción participants_cedula...');

      // Intentar múltiples métodos para eliminar la restricción
      try {
        await sequelize.query('ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_cedula;');
        console.log('✅ Eliminada con ALTER TABLE');
      } catch (error) {
        console.log('⚠️ ALTER TABLE falló, intentando con Sequelize...');
        try {
          const queryInterface = sequelize.getQueryInterface();
          await queryInterface.removeConstraint('participants', 'participants_cedula');
          console.log('✅ Eliminada con Sequelize');
        } catch (sequelizeError) {
          console.log('⚠️ Sequelize falló, intentando con DROP INDEX...');
          try {
            await sequelize.query('DROP INDEX IF EXISTS participants_cedula;');
            console.log('✅ Eliminada con DROP INDEX');
          } catch (indexError) {
            console.log('⚠️ DROP INDEX falló, intentando recrear columna...');
            // Último recurso: recrear columna sin restricciones
            await sequelize.query(`
              DO $$
              BEGIN
                -- Remover cualquier restricción única en cedula
                ALTER TABLE participants DROP CONSTRAINT IF EXISTS participants_cedula;
                DROP INDEX IF EXISTS participants_cedula;
                -- Asegurar que la columna permita NULL temporalmente
                ALTER TABLE participants ALTER COLUMN cedula DROP NOT NULL;
                ALTER TABLE participants ALTER COLUMN cedula SET NOT NULL;
              EXCEPTION
                WHEN others THEN
                  RAISE NOTICE 'Error en corrección: %', SQLERRM;
              END
              $$;
            `);
            console.log('✅ Corrección con DO block completada');
          }
        }
      }
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

    // 5. Probar creación de registro con cédula existente
    console.log('🧪 Probando creación de registro con cédula existente...');
    const { Participant } = require('./app/models');

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