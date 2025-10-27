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

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  // Solo permitir imágenes
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos de imagen'), false);
  }
};

// Configuración de multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
    files: 1 // Solo un archivo por petición
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