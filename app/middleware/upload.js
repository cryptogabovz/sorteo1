const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../config/env');

// Crear directorio de uploads si no existe
const uploadDir = path.join(__dirname, '../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generar nombre único para el archivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, 'ticket-' + uniqueSuffix + extension);
  }
});

// Filtro de archivos con validaciones de seguridad
const fileFilter = (req, file, cb) => {
  // Validar tipo MIME
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimes.includes(file.mimetype)) {
    return cb(new Error('Solo se permiten archivos de imagen (JPEG, PNG, WebP)'), false);
  }

  // Validar extensión del archivo
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return cb(new Error('Extensión de archivo no permitida'), false);
  }

  // Validar nombre del archivo (prevenir path traversal)
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return cb(new Error('Nombre de archivo inválido'), false);
  }

  // Sanitizar nombre del archivo
  const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Verificar que el archivo no esté vacío
  if (file.size === 0) {
    return cb(new Error('El archivo está vacío'), false);
  }

  cb(null, true);
};

// Configuración de multer con medidas de seguridad adicionales
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1, // Solo un archivo por petición
    fieldNameSize: 100, // Máximo tamaño del nombre del campo
    fieldSize: 1024 * 1024 // Máximo tamaño del campo (1MB)
  }
});

// Middleware de manejo de errores de multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'El archivo es demasiado grande. Máximo 5MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Solo se permite subir un archivo.'
      });
    }
  }

  if (error.message === 'Solo se permiten archivos de imagen') {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
};

module.exports = {
  upload,
  handleUploadError
};