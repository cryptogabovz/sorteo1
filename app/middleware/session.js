const session = require('express-session');
const config = require('../config/env');

// Configuración de sesiones
const sessionConfig = session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.nodeEnv === 'production', // HTTPS en producción, HTTP en desarrollo
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'lax' // Protección CSRF
  },
  name: 'sorteo.sid' // Cambiar nombre de cookie por seguridad
});

module.exports = sessionConfig;