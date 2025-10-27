const { AdminUser, Participant } = require('../models');

class AdminController {
  // Mostrar formulario de login
  showLogin(req, res) {
    res.render('admin/login', {
      title: 'Login Administrador',
      error: req.query.error
    });
  }

  // Procesar login
  async login(req, res) {
    try {
      const { username, password } = req.body;

      console.log(`🔐 Intento de login: usuario '${username}'`);

      if (!username || !password) {
        console.log('❌ Login fallido: campos vacíos');
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Usuario y contraseña requeridos'
        });
      }

      // Verificar conexión a BD primero
      const { sequelize } = require('../config/database');
      try {
        await sequelize.authenticate();
        console.log('✅ Conexión a BD OK');
      } catch (dbError) {
        console.error('❌ Error de conexión a BD:', dbError.message);
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Error de conexión a la base de datos'
        });
      }

      // Buscar usuario admin
      console.log('🔍 Buscando usuario en BD...');
      const admin = await AdminUser.findOne({ where: { username } });
      if (!admin) {
        console.log(`❌ Login fallido: usuario '${username}' no encontrado en BD`);

        // Intentar crear usuario si no existe y tenemos las variables
        const config = require('../config/env');
        if (config.adminUsername && config.adminPassword && username === config.adminUsername) {
          console.log('🔧 Intentando crear usuario admin...');
          try {
            await AdminUser.createDefaultAdmin();
            const newAdmin = await AdminUser.findOne({ where: { username } });
            if (newAdmin) {
              console.log('✅ Usuario admin creado exitosamente');
              // Continuar con el login del usuario recién creado
            } else {
              throw new Error('No se pudo crear el usuario admin');
            }
          } catch (createError) {
            console.error('❌ Error creando usuario admin:', createError.message);
            return res.render('admin/login', {
              title: 'Login Administrador',
              error: 'Error interno del servidor'
            });
          }
        } else {
          return res.render('admin/login', {
            title: 'Login Administrador',
            error: 'Credenciales inválidas'
          });
        }
      }

      const finalAdmin = await AdminUser.findOne({ where: { username } });
      console.log(`✅ Usuario encontrado: ${finalAdmin.username}, ID: ${finalAdmin.id}`);

      // Verificar contraseña
      console.log('🔐 Verificando contraseña...');
      const isValidPassword = await finalAdmin.checkPassword(password);
      if (!isValidPassword) {
        console.log(`❌ Login fallido: contraseña incorrecta para usuario '${username}'`);
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Credenciales inválidas'
        });
      }

      console.log(`✅ Contraseña válida para usuario '${username}'`);

      // Crear sesión
      req.session.adminId = finalAdmin.id;
      req.session.adminUsername = finalAdmin.username;
      req.session.adminLoggedIn = true;

      console.log(`🎉 Login exitoso: usuario '${username}' autenticado, redirigiendo a dashboard`);

      // Forzar guardado de sesión antes de redirigir
      req.session.save((err) => {
        if (err) {
          console.error('❌ Error guardando sesión:', err);
          return res.render('admin/login', {
            title: 'Login Administrador',
            error: 'Error interno del servidor'
          });
        }
        console.log('💾 Sesión guardada correctamente');
        res.redirect('/admin/dashboard');
      });

    } catch (error) {
      console.error('❌ Error en login:', error);
      console.error('Stack trace completo:', error.stack);
      res.render('admin/login', {
        title: 'Login Administrador',
        error: 'Error interno del servidor'
      });
    }
  }

  // Logout
  logout(req, res) {
    const username = req.session.adminUsername;
    req.session.destroy((err) => {
      if (err) {
        console.error('Error cerrando sesión:', err);
      }
      console.log(`Logout exitoso: usuario '${username}' cerró sesión`);
      res.redirect('/admin');
    });
  }

  // Mostrar dashboard
  async showDashboard(req, res) {
    try {
      // Obtener estadísticas
      const stats = await Participant.getStats();

      // Obtener participantes recientes (últimos 10)
      const recentParticipants = await Participant.findAll({
        order: [['created_at', 'DESC']],
        limit: 10,
        attributes: ['id', 'ticket_number', 'name', 'last_name', 'province', 'ticket_validated', 'created_at']
      });

      // Información del webhook de n8n
      const config = require('../config/env');
      const webhookInfo = {
        url: config.n8nWebhookUrl,
        user: config.n8nWebhookUser,
        examplePayload: {
          image: "base64_encoded_image_data",
          filename: "ticket_image.jpg",
          mimetype: "image/jpeg",
          timestamp: "2025-10-27T21:05:54.347Z",
          source: "sorteo-web-upload"
        },
        exampleResponse: {
          valid: true,
          reason: "Ticket válido - formato correcto",
          confidence: 0.95
        }
      };

      res.render('admin/dashboard', {
        title: 'Dashboard Administrador',
        stats,
        recentParticipants,
        webhookInfo
      });

    } catch (error) {
      console.error('Error cargando dashboard:', error);
      console.error('Stack trace:', error.stack);

      // En caso de error de BD, devolver valores por defecto
      const defaultStats = {
        total_participants: 0,
        validated_tickets: 0,
        rejected_tickets: 0,
        provinces_count: 0
      };

      res.render('admin/dashboard', {
        title: 'Dashboard Administrador',
        stats: defaultStats,
        recentParticipants: [],
        webhookInfo: null,
        error: 'Error cargando datos del dashboard'
      });
    }
  }

  // Listar participantes con filtros y paginación
  async listParticipants(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 50;
      const offset = (page - 1) * limit;

      // Construir filtros
      const where = {};
      if (req.query.province) where.province = req.query.province;
      if (req.query.validated !== undefined) where.ticket_validated = req.query.validated === 'true';
      if (req.query.search) {
        where[require('sequelize').Op.or] = [
          { name: { [require('sequelize').Op.iLike]: `%${req.query.search}%` } },
          { last_name: { [require('sequelize').Op.iLike]: `%${req.query.search}%` } },
          { cedula: { [require('sequelize').Op.iLike]: `%${req.query.search}%` } },
          { phone: { [require('sequelize').Op.iLike]: `%${req.query.search}%` } },
          { ticket_number: { [require('sequelize').Op.iLike]: `%${req.query.search}%` } }
        ];
      }

      // Obtener participantes
      const { count, rows: participants } = await Participant.findAndCountAll({
        where,
        order: [['created_at', 'DESC']],
        limit,
        offset
      });

      // Obtener lista de provincias para filtro
      const provinces = await Participant.findAll({
        attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('province')), 'province']],
        raw: true
      });

      res.render('admin/participants', {
        title: 'Gestión de Participantes',
        participants,
        provinces: provinces.map(p => p.province),
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalCount: count,
        filters: req.query
      });

    } catch (error) {
      console.error('Error listando participantes:', error);
      res.render('admin/participants', {
        title: 'Gestión de Participantes',
        participants: [],
        provinces: [],
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        filters: {},
        error: 'Error cargando participantes'
      });
    }
  }

  // Obtener métricas en JSON (para AJAX)
  async getMetrics(req, res) {
    try {
      const stats = await Participant.getStats();

      // Métricas adicionales
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayParticipants = await Participant.count({
        where: {
          created_at: {
            [require('sequelize').Op.gte]: today,
            [require('sequelize').Op.lt]: tomorrow
          }
        }
      });

      res.json({
        success: true,
        data: {
          ...stats,
          today_participants: todayParticipants
        }
      });

    } catch (error) {
      console.error('Error obteniendo métricas:', error);
      res.status(500).json({
        success: false,
        message: 'Error obteniendo métricas'
      });
    }
  }

  // Ver detalle de participante
  async showParticipant(req, res) {
    try {
      const { id } = req.params;
      const participant = await Participant.findByPk(id);

      if (!participant) {
        return res.render('admin/participants', {
          title: 'Participante no encontrado',
          error: 'Participante no encontrado'
        });
      }

      res.render('admin/participant-detail', {
        title: `Detalle - ${participant.name} ${participant.last_name}`,
        participant
      });

    } catch (error) {
      console.error('Error obteniendo participante:', error);
      res.render('admin/participants', {
        title: 'Error',
        error: 'Error obteniendo participante'
      });
    }
  }
}

module.exports = new AdminController();