# Stack Tecnológico

## Backend
- **Node.js**: Runtime de JavaScript para el servidor
- **Express.js**: Framework web minimalista para Node.js
- **Sequelize**: ORM para PostgreSQL con soporte de migraciones
- **bcrypt**: Hashing de contraseñas
- **express-session**: Manejo de sesiones para autenticación
- **multer**: Middleware para upload de archivos
- **axios**: Cliente HTTP para integración con n8n

## Base de Datos
- **PostgreSQL**: Base de datos relacional robusta
- **UUID**: Generación de identificadores únicos
- **Timestamps**: Seguimiento automático de creación y actualización

## Frontend
- **EJS**: Motor de plantillas para renderizado del lado servidor
- **Bootstrap**: Framework CSS para diseño responsivo
- **Vanilla JavaScript**: Interacciones del lado cliente
- **HTML5**: Estructura semántica
- **CSS3**: Estilos modernos con Flexbox/Grid

## Infraestructura y Despliegue
- **PM2**: Gestor de procesos para Node.js en producción
- **Nginx**: Servidor web y proxy reverso
- **Dokploy**: Plataforma de despliegue simplificada
- **VPS**: Servidor virtual privado para hosting

## Integraciones Externas
- **n8n**: Automatización de workflows para validación de tickets
- **Webhooks**: Comunicación asíncrona con servicios externos

## Herramientas de Desarrollo
- **Nodemon**: Reinicio automático durante desarrollo
- **ESLint**: Linting de código JavaScript
- **Prettier**: Formateo automático de código
- **Git**: Control de versiones

## Variables de Entorno
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sorteo_db
DB_USER=usuario
DB_PASS=contraseña
SESSION_SECRET=clave_secreta_sesiones
UPLOAD_PATH=./public/uploads
N8N_WEBHOOK_URL=https://tun8n.com/webhook/ticket-validation
PORT=3000
NODE_ENV=development
```

## Consideraciones Técnicas
- **MVC Pattern**: Separación clara de responsabilidades
- **RESTful API**: Diseño de endpoints consistente
- **Middleware Pattern**: Reutilización de lógica transversal
- **File Upload**: Manejo seguro de archivos de imagen
- **Session Management**: Autenticación stateless para admin
- **Error Handling**: Manejo robusto de errores y excepciones