async function debugRegistration() {
  // Crear instancia separada para evitar conflictos con la conexión global
  const { Sequelize } = require('sequelize');
  const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 1, // Solo una conexión para evitar conflictos
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
  try {
    console.log('🔍 Depurando registro de participantes...');

    // Verificar restricciones actuales
    const [constraints] = await sequelize.query(`
      SELECT conname as constraint_name, contype as constraint_type
      FROM pg_constraint
      WHERE conrelid = 'participants'::regclass;
    `);

    console.log('Restricciones actuales:');
    constraints.forEach(c => {
      console.log('- Nombre:', c.constraint_name, 'Tipo:', c.constraint_type);
    });

    // Verificar si existe usuario con cédula específica
    const { Participant } = require('./app/models');
    const existing = await Participant.findAll({
      where: { cedula: '22006181' }
    });

    console.log('Registros existentes con cédula 22006181:', existing.length);
    existing.forEach((p, i) => {
      console.log(`  ${i+1}. Ticket: ${p.ticket_number}, Nombre: ${p.name} ${p.last_name}`);
    });

    // Intentar crear un registro de prueba
    console.log('Intentando crear registro de prueba...');
    const testParticipant = await Participant.create({
      ticket_number: '9998',
      name: 'Test',
      last_name: 'User',
      cedula: '22006181',
      phone: '04140000000',
      province: 'Test Province',
      ticket_validated: true
    });

    console.log('✅ Registro de prueba creado exitosamente:', testParticipant.ticket_number);

    // Limpiar
    await testParticipant.destroy();
    console.log('🧹 Registro de prueba eliminado');

  } catch (error) {
    console.error('❌ ERROR en depuración:', error.message);
    if (error.name === 'SequelizeUniqueConstraintError') {
      console.error('Campos con error de unicidad:', error.fields);
    }
  } finally {
    console.log('🔧 Cerrando conexión separada de debug-migration');
    await sequelize.close();
  }
}

debugRegistration();