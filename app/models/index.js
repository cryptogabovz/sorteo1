const { sequelize } = require('../config/database');
const Participant = require('./Participant');
const AdminUser = require('./AdminUser');

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

      console.log('✅ Base de datos inicializada correctamente en producción');

      // Crear/verificar usuario admin
      const config = require('../config/env');
      if (config.adminUsername && config.adminPassword) {
        console.log('ℹ️ Verificando/creando usuario admin...');
        try {
          await AdminUser.createDefaultAdmin();
          console.log('✅ Usuario admin creado/verificado');
        } catch (adminError) {
          console.error('❌ Error creando admin:', adminError.message);
        }
      } else {
        console.log('⚠️ Variables ADMIN_USERNAME y ADMIN_PASSWORD no configuradas');
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
  syncDatabase
};