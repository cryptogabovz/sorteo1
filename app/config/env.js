require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'default_secret',
  uploadPath: process.env.UPLOAD_PATH || './public/uploads',
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || 'https://tun8n.com/webhook/ticket-validation',
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'sorteo_db',
    user: process.env.DB_USER || 'usuario',
    password: process.env.DB_PASS || 'contraseña'
  }
};

module.exports = config;