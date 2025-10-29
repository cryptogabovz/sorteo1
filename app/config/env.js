require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  sessionSecret: process.env.SESSION_SECRET || 'default_secret',
  uploadPath: process.env.UPLOAD_PATH || './public/uploads',
  n8nWebhookUrl: process.env.N8N_WEBHOOK_URL,
  n8nWebhookUser: process.env.N8N_WEBHOOK_USER,
  n8nWebhookPass: process.env.N8N_WEBHOOK_PASS,
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
  recaptcha: {
    siteKey: process.env.RECAPTCHA_SITE_KEY,
    secretKey: process.env.RECAPTCHA_SECRET_KEY
  },
  database: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASS
  }
};

module.exports = config;