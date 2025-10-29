const { sequelize } = require('../config/database');
const Participant = require('./Participant');
const AdminUser = require('./AdminUser');
const TicketValidation = require('./TicketValidation');

// Función para ejecutar migraciones pendientes
const runPendingMigrations = async () => {
  try {
    console.log('🔄 Verificando migraciones pendientes...');
    const queryInterface = sequelize.getQueryInterface();

    // Lista de migraciones a ejecutar
    const migrations = [
      {
        name: 'remove_cedula_unique',
        check: async () => {
          const constraints = await queryInterface.showConstraint('participants');
          return !constraints.some(c => c.constraintName === 'participants_cedula_key');
        },
        run: async () => {
          const migration = require('./migrations/remove_cedula_unique.js');
          await migration.up(queryInterface, sequelize.constructor);
          console.log('✅ Migración remove_cedula_unique ejecutada');
        }
      }
    ];

    // Ejecutar migraciones pendientes
    for (const migration of migrations) {
      const alreadyApplied = await migration.check();
      if (!alreadyApplied) {
        console.log(`📋 Ejecutando migración: ${migration.name}`);
        await migration.run();
      } else {
        console.log(`⏭️ Migración ${migration.name} ya aplicada`);
      }
    }

    console.log('✅ Todas las migraciones verificadas');
  } catch (error) {
    console.error('❌ Error ejecutando migraciones:', error.message);
    // No fallar el inicio por errores de migración
  }
};

// Sincronizar modelos con la base de datos
const syncDatabase = async () => {
  try {
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos (development)');

      // Crear admin por defecto solo en desarrollo
      await AdminUser.createDefaultAdmin();
    } else {
      console.log('ℹ️ Modo producción: Inicializando base de datos...');

      // Ejecutar migraciones pendientes ANTES de verificar tablas
      await runPendingMigrations();

      // Verificar si las tablas existen
      const queryInterface = sequelize.getQueryInterface();

      try {
        // Verificar tabla participants
        await queryInterface.describeTable('participants');
        console.log('✅ Tabla participants ya existe');
      } catch (error) {
        console.log('ℹ️ Creando tabla participants...');
        await queryInterface.createTable('participants', {
          id: {
            type: sequelize.Sequelize.UUID,
            defaultValue: sequelize.Sequelize.UUIDV4,
            primaryKey: true
          },
          ticket_number: {
            type: sequelize.Sequelize.STRING(10),
            allowNull: false,
            unique: true
          },
          name: {
            type: sequelize.Sequelize.STRING(100),
            allowNull: false
          },
          last_name: {
            type: sequelize.Sequelize.STRING(100),
            allowNull: false
          },
          cedula: {
            type: sequelize.Sequelize.STRING(20),
            allowNull: false,
            unique: true
          },
          phone: {
            type: sequelize.Sequelize.STRING(20),
            allowNull: false
          },
          province: {
            type: sequelize.Sequelize.STRING(50),
            allowNull: false
          },
          ticket_validated: {
            type: sequelize.Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false
          },
          validation_reason: {
            type: sequelize.Sequelize.TEXT,
            allowNull: true
          },
          ticket_image_url: {
            type: sequelize.Sequelize.STRING(255),
            allowNull: true
          },
          created_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false
          },
          updated_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false
          }
        });
        console.log('✅ Tabla participants creada');
      }

      try {
        // Verificar tabla admin_users
        await queryInterface.describeTable('admin_users');
        console.log('✅ Tabla admin_users ya existe');
      } catch (error) {
        console.log('ℹ️ Creando tabla admin_users...');
        await queryInterface.createTable('admin_users', {
          id: {
            type: sequelize.Sequelize.UUID,
            defaultValue: sequelize.Sequelize.UUIDV4,
            primaryKey: true
          },
          username: {
            type: sequelize.Sequelize.STRING(50),
            allowNull: false,
            unique: true
          },
          password_hash: {
            type: sequelize.Sequelize.STRING(255),
            allowNull: false
          },
          created_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false
          },
          updated_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false
          }
        });
        console.log('✅ Tabla admin_users creada');
      }

      // Crear índices si no existen
      try {
        await queryInterface.addIndex('participants', ['ticket_number'], { unique: true });
        console.log('✅ Índice ticket_number creado/verificado');
      } catch (error) {
        console.log('ℹ️ Índice ticket_number ya existe');
      }

      try {
        await queryInterface.addIndex('participants', ['cedula'], { unique: true });
        console.log('✅ Índice cedula creado/verificado');
      } catch (error) {
        console.log('ℹ️ Índice cedula ya existe');
      }

      try {
        await queryInterface.addIndex('admin_users', ['username'], { unique: true });
        console.log('✅ Índice username creado/verificado');
      } catch (error) {
        console.log('ℹ️ Índice username ya existe');
      }

      try {
        // Verificar tabla ticket_validations
        await queryInterface.describeTable('ticket_validations');
        console.log('✅ Tabla ticket_validations ya existe');
      } catch (error) {
        console.log('ℹ️ Creando tabla ticket_validations...');
        await queryInterface.createTable('ticket_validations', {
          id: {
            type: sequelize.Sequelize.UUID,
            defaultValue: sequelize.Sequelize.UUIDV4,
            primaryKey: true
          },
          correlation_id: {
            type: sequelize.Sequelize.UUID,
            allowNull: false,
            unique: true
          },
          image_path: {
            type: sequelize.Sequelize.STRING(255),
            allowNull: false
          },
          image_filename: {
            type: sequelize.Sequelize.STRING(255),
            allowNull: false
          },
          status: {
            type: sequelize.Sequelize.ENUM('pending', 'approved', 'rejected'),
            defaultValue: 'pending',
            allowNull: false
          },
          validation_result: {
            type: sequelize.Sequelize.JSON,
            allowNull: true
          },
          reason: {
            type: sequelize.Sequelize.TEXT,
            allowNull: true
          },
          confidence: {
            type: sequelize.Sequelize.DECIMAL(3, 2),
            allowNull: true
          },
          n8n_response_received: {
            type: sequelize.Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false
          },
          expires_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false
          },
          created_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false
          },
          updated_at: {
            type: sequelize.Sequelize.DATE,
            allowNull: false
          }
        });
        console.log('✅ Tabla ticket_validations creada');
      }

      console.log('✅ Base de datos inicializada correctamente en producción');

      // Limpiar validaciones expiradas
      try {
        const cleaned = await TicketValidation.cleanupExpired();
        if (cleaned > 0) {
          console.log(`🧹 Limpiadas ${cleaned} validaciones expiradas al inicio`);
        }
      } catch (cleanupError) {
        console.error('❌ Error limpiando validaciones expiradas:', cleanupError.message);
      }

      // Crear/verificar usuario admin (SIEMPRE, sin importar variables de entorno)
      console.log('ℹ️ Creando/verificando usuario admin por defecto...');
      try {
        await AdminUser.createDefaultAdmin();
        console.log('✅ Usuario admin creado/verificado exitosamente');
      } catch (adminError) {
        console.error('❌ Error creando admin:', adminError.message);
        console.error('Stack trace:', adminError.stack);
      }
    }
  } catch (error) {
    console.error('❌ Error en inicialización de BD:', error.message);
    console.log('⚠️ Continuando sin inicialización automática...');
  }
};

module.exports = {
  sequelize,
  Participant,
  AdminUser,
  TicketValidation,
  syncDatabase
};