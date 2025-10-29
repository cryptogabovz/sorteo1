#!/usr/bin/env node

/**
 * Script de migración para agregar columnas de soft delete
 * Se ejecuta automáticamente durante el despliegue con Dokploy
 */

async function migrateSoftDelete() {
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
    console.log('🔄 Iniciando migración de soft delete...');

    const queryInterface = sequelize.getQueryInterface();

    console.log('🔍 Verificando columnas en tabla participants...');

    const tableDescription = await queryInterface.describeTable('participants');

    const requiredColumns = ['deleted_at', 'deletion_reason', 'deleted_by'];
    const missingColumns = [];

    requiredColumns.forEach(col => {
      if (!tableDescription[col]) {
        missingColumns.push(col);
        console.log(`⚠️ Columna faltante: ${col}`);
      } else {
        console.log(`✅ Columna ${col} ya existe`);
      }
    });

    if (missingColumns.length > 0) {
      console.log(`📝 Agregando ${missingColumns.length} columnas faltantes...`);

      // Agregar columnas faltantes
      for (const col of missingColumns) {
        try {
          if (col === 'deleted_at') {
            await queryInterface.addColumn('participants', col, {
              type: sequelize.Sequelize.DATE,
              allowNull: true,
              comment: 'Fecha de eliminación lógica del ticket'
            });
            console.log(`✅ Columna deleted_at agregada`);
          } else if (col === 'deletion_reason') {
            await queryInterface.addColumn('participants', col, {
              type: sequelize.Sequelize.TEXT,
              allowNull: true,
              comment: 'Razón por la que se eliminó el ticket'
            });
            console.log(`✅ Columna deletion_reason agregada`);
          } else if (col === 'deleted_by') {
            await queryInterface.addColumn('participants', col, {
              type: sequelize.Sequelize.UUID,
              allowNull: true,
              comment: 'ID del administrador que eliminó el ticket'
            });
            console.log(`✅ Columna deleted_by agregada`);
          }
        } catch (addError) {
          console.error(`❌ Error agregando columna ${col}:`, addError.message);
          // No fallar completamente por una columna, continuar con las demás
        }
      }

      console.log('🎉 Migración completada exitosamente');
    } else {
      console.log('✅ Todas las columnas de soft delete ya existen');
    }

  } catch (error) {
    console.error('❌ Error en migración de soft delete:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1); // Salir con código de error para que Dokploy lo detecte
  } finally {
    console.log('🔧 Cerrando conexión separada de migrate-soft-delete');
    await sequelize.close();
  }
}

// Ejecutar migración si se llama directamente
if (require.main === module) {
  migrateSoftDelete()
    .then(() => {
      console.log('✅ Script de migración finalizado exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script de migración falló:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateSoftDelete };