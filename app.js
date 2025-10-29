require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./app/config/env');

const { migrateSoftDelete } = require('./app/scripts/migrate-soft-delete');

// Importar modelos y sincronizar base de datos
const { syncDatabase } = require('./app/models');

// Importar rutas
const publicRoutes = require('./app/routes/public');
const adminRoutes = require('./app/routes/admin');

// Importar middleware
const sessionConfig = require('./app/middleware/session');

const app = express();

// Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'app/views'));

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sesiones
app.use(sessionConfig);

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rutas
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);

// Middleware de error global
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

// Ruta 404
app.use((req, res) => {
  res.status(404).render('public/index', {
    title: 'Página no encontrada',
    error: 'La página solicitada no existe.'
  });
});

// Función para iniciar servidor
const startServer = async () => {
  try {
    // Sincronizar base de datos PRIMERO
    await syncDatabase();

    // Ejecutar migración de soft delete DESPUÉS de sincronizar BD
    console.log('🔄 Ejecutando migración de soft delete...');
    try {
      await migrateSoftDelete();
      console.log('✅ Migración de soft delete completada');
    } catch (migrateError) {
      console.error('❌ Error en migración de soft delete:', migrateError.message);
      console.error('Stack trace:', migrateError.stack);
      // No bloquear el inicio por errores de migración
      console.log('⚠️ Continuando con el inicio del servidor...');
    }

    // Ejecutar corrección de restricciones DESPUÉS de sincronizar BD
    if (process.env.NODE_ENV === 'production') {
      console.log('🔧 Ejecutando corrección de restricciones en producción...');
      try {
        // Importar y ejecutar la función
        const fixConstraints = require('./fix-constraints.js');

        // Crear nueva instancia de sequelize para evitar conflictos de conexión
        const fixSequelize = new (require('sequelize').Sequelize)(
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

        await fixConstraints(fixSequelize);
        await fixSequelize.close(); // Cerrar esta conexión específica
        console.log('✅ Corrección de restricciones completada');
      } catch (fixError) {
        console.error('❌ Error en corrección de restricciones:', fixError.message);
        console.error('Stack trace:', fixError.stack);
        // No bloquear el inicio por errores de corrección
        console.log('⚠️ Continuando con el inicio del servidor...');
      }
    }

    // Limpiar validaciones expiradas periódicamente (cada 5 minutos)
    setInterval(async () => {
      try {
        const { TicketValidation } = require('./app/models');
        const cleaned = await TicketValidation.cleanupExpired();
        if (cleaned > 0) {
          console.log(`🧹 Limpiadas ${cleaned} validaciones expiradas (tarea programada)`);
        }
      } catch (error) {
        console.error('❌ Error en limpieza programada:', error.message);
      }
    }, 5 * 60 * 1000); // 5 minutos

    // Iniciar servidor
    const PORT = config.port;
    app.listen(PORT, () => {
      console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
      console.log(`📊 Panel admin disponible en http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// Manejo de señales para cerrar gracefully
process.on('SIGINT', () => {
  console.log('🛑 Cerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Cerrando servidor...');
  process.exit(0);
});

// Iniciar servidor si este archivo es ejecutado directamente
if (require.main === module) {
  startServer();
}

module.exports = app;