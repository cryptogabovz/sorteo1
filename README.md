# Sistema de Sorteo con Validación Automática

Sistema web completo para la gestión de sorteos con validación automática de tickets mediante integración con n8n.

## 🚀 Inicio Rápido

### Prerrequisitos
- Docker y Docker Compose
- Node.js 18+ (opcional, para desarrollo local)

### Instalación y Ejecución

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd sorteo-app
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.example .env
   # Editar .env según sea necesario
   ```

3. **Ejecutar con Docker Compose**
   ```bash
   docker-compose up --build
   ```

4. **Acceder a la aplicación**
   - **Aplicación principal**: http://localhost:3000
   - **Panel de administración**: http://localhost:3000/admin
   - **Base de datos**: localhost:5432

## 📋 Características

### Para Participantes
- ✅ **Registro intuitivo**: Proceso de 3 pasos simple
- ✅ **Validación automática**: Subida de ticket con verificación IA
- ✅ **Interfaz responsive**: Funciona en móviles y desktop
- ✅ **Confirmación inmediata**: Número de participación asignado

### Para Administradores
- 📊 **Dashboard en tiempo real**: Métricas actualizadas
- 👥 **Gestión de participantes**: Lista con filtros y búsqueda
- 📈 **Estadísticas detalladas**: Reportes y exportación
- 🔐 **Autenticación segura**: Panel protegido

## 🏗️ Arquitectura

### Stack Tecnológico
- **Backend**: Node.js + Express.js
- **Base de datos**: PostgreSQL + Sequelize ORM
- **Frontend**: EJS + Bootstrap CSS + Vanilla JS
- **Contenedor**: Docker + Docker Compose

### Estructura del Proyecto
```
sorteo-app/
├── app/
│   ├── config/          # Configuración BD y entorno
│   ├── controllers/     # Lógica de negocio
│   ├── middleware/      # Middlewares personalizados
│   ├── models/          # Modelos Sequelize
│   ├── routes/          # Definición de rutas
│   └── views/           # Plantillas EJS
├── public/              # Archivos estáticos
│   ├── css/
│   ├── js/
│   └── uploads/
├── .env                 # Variables de entorno
├── docker-compose.yml   # Configuración Docker
├── Dockerfile          # Imagen Docker
└── package.json        # Dependencias Node.js
```

## 🔧 Configuración

### Variables de Entorno
```env
# Base de datos
DB_HOST=db
DB_PORT=5432
DB_NAME=sorteo_db
DB_USER=usuario
DB_PASS=contraseña

# Sesiones
SESSION_SECRET=tu_clave_secreta_segura

# Uploads
UPLOAD_PATH=./public/uploads

# n8n Integration
N8N_WEBHOOK_URL=https://tu-n8n.com/webhook/ticket-validation

# Puerto
PORT=3000
```

### Usuario Administrador por Defecto
- **Usuario**: admin
- **Contraseña**: admin123
- ⚠️ **Cambiar en producción**

## 🔄 Flujo de la Aplicación

1. **Página Inicial** → Usuario ve explicación del sorteo
2. **Subida de Ticket** → Validación automática con n8n
3. **Registro** → Formulario de datos personales
4. **Confirmación** → Número asignado y éxito

## 🐳 Comandos Docker

```bash
# Construir y ejecutar
docker-compose up --build

# Ejecutar en segundo plano
docker-compose up -d

# Ver logs
docker-compose logs -f

# Detener servicios
docker-compose down

# Reconstruir sin cache
docker-compose build --no-cache
```

## 🧪 Desarrollo Local

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Ejecutar normalmente
npm start
```

## 🔒 Seguridad

- ✅ **Hash de contraseñas**: bcrypt con salt rounds
- ✅ **Sanitización de inputs**: Validación de datos
- ✅ **Protección XSS**: Middlewares de seguridad
- ✅ **Rate limiting**: Control de peticiones
- ✅ **Validación de archivos**: Solo imágenes permitidas

## 📊 API Endpoints

### Públicas
- `GET /` → Landing page
- `POST /api/upload-ticket` → Validar ticket
- `POST /api/register` → Registrar participante

### Administración
- `GET /admin` → Login
- `POST /admin/login` → Autenticar
- `GET /admin/dashboard` → Panel principal
- `GET /admin/participants` → Lista participantes
- `GET /admin/api/metrics` → Métricas JSON

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama para feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia ISC.

## 📞 Soporte

Para soporte técnico o preguntas:
- Crear issue en el repositorio
- Contactar al equipo de desarrollo

---

**Desarrollado con ❤️ por Kilo Code**