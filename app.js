require('dotenv').config();
const express = require('express');
const path = require('path');
const config = require('./app/config/env');

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
    // Sincronizar base de datos
    await syncDatabase();

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