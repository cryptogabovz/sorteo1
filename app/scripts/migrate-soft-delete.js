const { sequelize } = require('../config/database');

async function migrateSoftDelete() {
  try {
    console.log('🔄 Iniciando migración de soft delete...');

    // Verificar si las columnas ya existen
    console.log('🔍 Verificando columnas en tabla participants...');

    const [columns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'participants' AND table_schema = 'public'
    `);

    const columnNames = columns.map(col => col.column_name);

    // Verificar y agregar columna deleted_at
    if (!columnNames.includes('deleted_at')) {
      console.log('➕ Agregando columna deleted_at...');
      await sequelize.query(`
        ALTER TABLE participants ADD COLUMN deleted_at TIMESTAMP NULL;
      `);
      console.log('✅ Columna deleted_at agregada');
    } else {
      console.log('✅ Columna deleted_at ya existe');
    }

    // Verificar y agregar columna deletion_reason
    if (!columnNames.includes('deletion_reason')) {
      console.log('➕ Agregando columna deletion_reason...');
      await sequelize.query(`
        ALTER TABLE participants ADD COLUMN deletion_reason TEXT NULL;
      `);
      console.log('✅ Columna deletion_reason agregada');
    } else {
      console.log('✅ Columna deletion_reason ya existe');
    }

    // Verificar y agregar columna deleted_by
    if (!columnNames.includes('deleted_by')) {
      console.log('➕ Agregando columna deleted_by...');
      await sequelize.query(`
        ALTER TABLE participants ADD COLUMN deleted_by UUID NULL;
      `);
      console.log('✅ Columna deleted_by agregada');
    } else {
      console.log('✅ Columna deleted_by ya existe');
    }

    // Verificar y agregar columna rejection_date en ticket_validations
    const [validationColumns] = await sequelize.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'ticket_validations' AND table_schema = 'public'
    `);

    const validationColumnNames = validationColumns.map(col => col.column_name);

    if (!validationColumnNames.includes('rejection_date')) {
      console.log('➕ Agregando columna rejection_date en ticket_validations...');
      await sequelize.query(`
        ALTER TABLE ticket_validations ADD COLUMN rejection_date DATE NULL;
      `);
      console.log('✅ Columna rejection_date agregada en ticket_validations');
    } else {
      console.log('✅ Columna rejection_date ya existe en ticket_validations');
    }

    console.log('✅ Todas las columnas de soft delete ya existen');

  } catch (error) {
    console.error('❌ Error en migración de soft delete:', error);
    throw error;
  }
}

module.exports = { migrateSoftDelete };

// Ejecutar solo si se llama directamente
if (require.main === module) {
  migrateSoftDelete()
    .then(() => {
      console.log('✅ Migración completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error en migración:', error);
      process.exit(1);
    });
}