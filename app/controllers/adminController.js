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

      if (!username || !password) {
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Usuario y contraseña requeridos'
        });
      }

      // Buscar usuario admin
      const admin = await AdminUser.findOne({ where: { username } });
      if (!admin) {
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Credenciales inválidas'
        });
      }

      // Verificar contraseña
      const isValidPassword = await admin.checkPassword(password);
      if (!isValidPassword) {
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Credenciales inválidas'
        });
      }

      // Crear sesión
      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;

      res.redirect('/admin/dashboard');

    } catch (error) {
      console.error('Error en login:', error);
      res.render('admin/login', {
        title: 'Login Administrador',
        error: 'Error interno del servidor'
      });
    }
  }

  // Logout
  logout(req, res) {
    req.session.destroy((err) => {
      if (err) {
        console.error('Error cerrando sesión:', err);
      }
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

      res.render('admin/dashboard', {
        title: 'Dashboard Administrador',
        stats,
        recentParticipants
      });

    } catch (error) {
      console.error('Error cargando dashboard:', error);
      res.render('admin/dashboard', {
        title: 'Dashboard Administrador',
        stats: { total_participants: 0, validated_tickets: 0, rejected_tickets: 0, provinces_count: 0 },
        recentParticipants: [],
        error: 'Error cargando datos'
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