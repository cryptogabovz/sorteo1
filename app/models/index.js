const { sequelize } = require('../config/database');
const Participant = require('./Participant');
const AdminUser = require('./AdminUser');

// Sincronizar modelos con la base de datos
const syncDatabase = async () => {
  try {
    // En producción, crear tablas si no existen, pero no alterar estructura
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ Modelos sincronizados con la base de datos (development)');

      // Crear admin por defecto solo en desarrollo
      await AdminUser.createDefaultAdmin();
    } else {
      console.log('ℹ️ Modo producción: Verificando estado de BD...');

      // Verificar si las tablas existen primero
      try {
        await sequelize.getQueryInterface().describeTable('participants');
        console.log('✅ Tabla participants existe');

        await sequelize.getQueryInterface().describeTable('admin_users');
        console.log('✅ Tabla admin_users existe');

        console.log('✅ Todas las tablas existen, continuando...');

      } catch (tableError) {
        console.log('ℹ️ Tablas no existen, intentando crearlas...');

        try {
          // Crear tablas manualmente si no existen
          await sequelize.getQueryInterface().createTable('participants', {
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

          await sequelize.getQueryInterface().createTable('admin_users', {
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

          // Crear índices
          await sequelize.getQueryInterface().addIndex('participants', ['ticket_number'], { unique: true });
          await sequelize.getQueryInterface().addIndex('participants', ['cedula'], { unique: true });
          await sequelize.getQueryInterface().addIndex('participants', ['province']);
          await sequelize.getQueryInterface().addIndex('participants', ['ticket_validated']);
          await sequelize.getQueryInterface().addIndex('participants', ['created_at']);
          await sequelize.getQueryInterface().addIndex('admin_users', ['username'], { unique: true });

          console.log('✅ Tablas creadas manualmente exitosamente');

        } catch (createError) {
          console.error('❌ Error creando tablas manualmente:', createError.message);
          throw createError;
        }
      }

      // En producción, intentar crear admin si las variables están configuradas
      const config = require('../config/env');
      if (config.adminUsername && config.adminPassword) {
        console.log('ℹ️ Creando usuario admin en producción...');
        try {
          await AdminUser.createDefaultAdmin();
          console.log('✅ Usuario admin creado exitosamente en producción');
        } catch (adminError) {
          console.error('❌ Error creando admin:', adminError.message);
          // No fallar por esto
        }
      } else {
        console.log('⚠️ Variables ADMIN_USERNAME y ADMIN_PASSWORD no configuradas');
      }
    }
  } catch (error) {
    console.error('❌ Error sincronizando modelos:', error);
    console.error('Stack trace:', error.stack);

    // En producción, intentar continuar de todas formas
    console.log('⚠️ Intentando continuar sin sincronización automática...');
  }
};

module.exports = {
  sequelize,
  Participant,
  AdminUser,
  syncDatabase
};