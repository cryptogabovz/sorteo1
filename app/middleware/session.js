const session = require('express-session');
const config = require('../config/env');

// Configuración de sesiones
const sessionConfig = session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Cambiar a true en producción con HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  },
  name: 'sorteo.sid' // Cambiar nombre de cookie por seguridad
});

module.exports = sessionConfig;