# Arquitectura del Sistema de Sorteo

## Arquitectura General
El sistema de sorteo se implementa como un monolito MVC con las siguientes capas:

### Capas del Sistema
1. **Frontend (Vistas)**: HTML/CSS/JS con EJS como motor de plantillas
2. **Backend API REST**: Node.js + Express.js para lógica de negocio
3. **Base de datos**: PostgreSQL con Sequelize ORM
4. **Panel de administración**: Interfaz protegida para gestión

### Componentes Principales
- **Controladores**: Manejo de lógica de negocio
- **Modelos**: Definición de datos y relaciones
- **Rutas**: Definición de endpoints API
- **Vistas**: Plantillas EJS para renderizado
- **Middleware**: Autenticación, upload de archivos, validaciones
- **Configuración**: Base de datos, variables de entorno

## Estructura de Base de Datos

### Tabla `participants`
- `id` (UUID, PK)
- `ticket_number` (STRING, único, formato 0001)
- `name` (STRING)
- `last_name` (STRING)
- `cedula` (STRING, único)
- `phone` (STRING)
- `province` (STRING)
- `ticket_validated` (BOOLEAN, default: false)
- `validation_reason` (TEXT, motivo de rechazo)
- `ticket_image_url` (STRING, ruta del ticket)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Tabla `admin_users`
- `id` (UUID, PK)
- `username` (STRING, único)
- `password_hash` (STRING)
- `created_at` (TIMESTAMP)

### Tabla `sorteo_metrics` (opcional, vistas calculadas)
- Métricas calculadas dinámicamente

## Flujo de la Aplicación

### Flujo Usuario Normal
1. Página inicial → Explicación del sorteo + botón "Participar"
2. Subida de ticket → Formulario simple para upload de imagen
3. Validación con n8n → Envío a webhook y espera respuesta
4. Formulario de registro → Campos personales después de validación
5. Asignación número → Sistema asigna próximo número disponible
6. Confirmación → Muestra número asignado y éxito

### Flujo Administrador
1. Login → Autenticación con usuario/contraseña
2. Dashboard → Métricas principales y navegación
3. Gestión participantes → Lista, búsqueda, filtros, exportación

## Endpoints API

### Públicos
- `GET /` → Landing page
- `POST /api/upload-ticket` → Subir ticket y validar
- `POST /api/register` → Registrar participante

### Administración
- `GET /admin` → Login form
- `POST /admin/login` → Autenticar admin
- `GET /admin/dashboard` → Panel principal
- `GET /admin/participants` → Lista participantes
- `GET /admin/participants/:id` → Detalle participante
- `GET /admin/metrics` → Métricas en JSON

## Estructura de Archivos
```
app/
├── controllers/
│   ├── participantController.js
│   ├── adminController.js
│   └── validationController.js
├── models/
│   ├── Participant.js
│   └── AdminUser.js
├── routes/
│   ├── public.js
│   └── admin.js
├── views/
│   ├── public/
│   │   ├── index.ejs
│   │   ├── upload-ticket.ejs
│   │   └── success.ejs
│   └── admin/
│       ├── login.ejs
│       ├── dashboard.ejs
│       └── participants.ejs
├── middleware/
│   ├── auth.js
│   └── upload.js
├── config/
│   ├── database.js
│   └── env.js
└── public/
    ├── css/
    ├── js/
    └── uploads/
```

## Configuración y Variables de Entorno
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
```

## Secuencia de Implementación
1. Setup inicial y configuración Express
2. Conexión PostgreSQL + Sequelize
3. Creación de modelos y migraciones
4. Sistema de archivos y middleware de upload
5. Integración con n8n para validación
6. Lógica de numeración automática
7. Frontend público con vistas EJS
8. Sistema de administración con autenticación
9. Seguridad y validaciones
10. Despliegue con Dokploy/Nginx/PM2

## Consideraciones de Seguridad
- Hash de contraseñas con bcrypt
- Sanitización de inputs contra XSS
- Validación de tipos de archivo
- Rate limiting en endpoints críticos
- CORS configurado apropiadamente
- Validación de cédulas únicas