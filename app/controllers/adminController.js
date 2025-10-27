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
      console.log(`📝 Datos recibidos - Username: '${username}', Password length: ${password ? password.length : 0}`);

      if (!username || !password) {
        console.log('❌ Login fallido: campos vacíos');
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Usuario y contraseña requeridos'
        });
      }

      // Mostrar configuración actual
      const config = require('../config/env');
      console.log('⚙️ Configuración actual:');
      console.log(`   - ADMIN_USERNAME: '${config.adminUsername}'`);
      console.log(`   - ADMIN_PASSWORD length: ${config.adminPassword ? config.adminPassword.length : 0}`);
      console.log(`   - NODE_ENV: '${config.nodeEnv}'`);

      // Verificar conexión a BD primero
      const { sequelize } = require('../config/database');
      try {
        await sequelize.authenticate();
        console.log('✅ Conexión a BD OK');
      } catch (dbError) {
        console.error('❌ Error de conexión a BD:', dbError.message);
        console.error('Stack BD:', dbError.stack);
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Error de conexión a la base de datos'
        });
      }

      // Verificar si las credenciales coinciden con las variables de entorno
      console.log('🔍 Verificando credenciales contra variables de entorno...');

      if (config.adminUsername && config.adminPassword && username === config.adminUsername) {
        console.log('✅ Credenciales válidas contra variables de entorno');

        // Buscar usuario admin en BD
        console.log('🔍 Buscando usuario en BD...');
        let admin;

        try {
          admin = await AdminUser.findOne({ where: { username } });
          console.log(`✅ Consulta a BD exitosa, resultado: ${admin ? 'encontrado' : 'no encontrado'}`);
        } catch (dbError) {
          console.error('❌ Error consultando BD:', dbError.message);
          console.error('Stack BD:', dbError.stack);
          return res.render('admin/login', {
            title: 'Login Administrador',
            error: 'Error de base de datos'
          });
        }

        if (!admin) {
          console.log(`❌ Usuario '${username}' no encontrado en BD, intentando crear...`);

          try {
            // Crear directamente en lugar de usar el método
            const bcrypt = require('bcrypt');
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(config.adminPassword, saltRounds);

            admin = await AdminUser.create({
              username: config.adminUsername,
              password_hash: hashedPassword
            });

            console.log(`✅ Usuario admin creado exitosamente: ID ${admin.id}`);
          } catch (createError) {
            console.error('❌ Error creando usuario admin:', createError.message);
            console.error('Stack create:', createError.stack);
            return res.render('admin/login', {
              title: 'Login Administrador',
              error: 'Error creando usuario administrador'
            });
          }
        }
      } else {
        console.log('❌ Credenciales no válidas contra variables de entorno');
        console.log(`   adminUsername configurado: ${!!config.adminUsername}`);
        console.log(`   adminPassword configurado: ${!!config.adminPassword}`);
        console.log(`   username coincide: ${username === config.adminUsername}`);
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Credenciales inválidas'
        });
      }

      console.log(`✅ Usuario encontrado: ${admin.username}, ID: ${admin.id}`);

      // Verificar contraseña
      console.log('🔐 Verificando contraseña...');
      const isValidPassword = await admin.checkPassword(password);
      if (!isValidPassword) {
        console.log(`❌ Login fallido: contraseña incorrecta para usuario '${username}'`);
        console.log(`   Contraseña proporcionada length: ${password.length}`);
        console.log(`   Hash almacenado: ${admin.password_hash.substring(0, 20)}...`);
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Credenciales inválidas'
        });
      }

      console.log(`✅ Contraseña válida para usuario '${username}'`);

      // Crear sesión
      req.session.adminId = admin.id;
      req.session.adminUsername = admin.username;
      req.session.adminLoggedIn = true;

      console.log(`🎉 Login exitoso: usuario '${username}' autenticado, redirigiendo a dashboard`);
      console.log(`   Sesión creada: adminId=${admin.id}, adminUsername='${admin.username}'`);

      // Forzar guardado de sesión antes de redirigir
      req.session.save((err) => {
        if (err) {
          console.error('❌ Error guardando sesión:', err);
          console.error('Stack session:', err.stack);
          return res.render('admin/login', {
            title: 'Login Administrador',
            error: 'Error interno del servidor'
          });
        }
        console.log('💾 Sesión guardada correctamente');

        // Verificar que la sesión se guardó correctamente
        console.log('🔍 Verificando sesión después de guardar:', {
          adminId: req.session.adminId,
          adminUsername: req.session.adminUsername,
          adminLoggedIn: req.session.adminLoggedIn
        });

        // Redirigir con headers para forzar recarga
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');

        // Usar setTimeout para asegurar que la sesión se guarde completamente
        setTimeout(() => {
          console.log('⏰ Redirigiendo a dashboard después de timeout...');
          res.redirect('/admin/dashboard');
        }, 100);
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
      console.log('📊 Acceso a dashboard - Sesión:', {
        adminId: req.session.adminId,
        adminUsername: req.session.adminUsername,
        adminLoggedIn: req.session.adminLoggedIn
      });

      // Verificar que la sesión sea válida
      if (!req.session.adminId || !req.session.adminLoggedIn) {
        console.log('❌ Sesión inválida, redirigiendo a login');
        return res.redirect('/admin');
      }

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
        adminUsername: req.session.adminUsername,
        stats,
        recentParticipants,
        webhookInfo
      });

    } catch (error) {
      console.error('❌ Error cargando dashboard:', error);
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
        adminUsername: req.session.adminUsername || 'Admin',
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