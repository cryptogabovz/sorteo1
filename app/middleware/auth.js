// Middleware de autenticación para admin
const authMiddleware = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return next();
  }

  // Si es una petición AJAX/API, devolver error JSON
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(401).json({
      success: false,
      message: 'Sesión expirada. Por favor, inicia sesión nuevamente.'
    });
  }

  // Redirigir a login para peticiones normales
  res.redirect('/admin');
};

// Middleware para verificar si ya está autenticado (para login)
const guestMiddleware = (req, res, next) => {
  if (req.session && req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  next();
};

module.exports = {
  authMiddleware,
  guestMiddleware
};