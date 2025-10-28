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
      console.log(`   Variables de entorno cargadas: ADMIN_USERNAME='${process.env.ADMIN_USERNAME || '[NOT SET]'}', ADMIN_PASSWORD='${process.env.ADMIN_PASSWORD ? '[SET]' : '[NOT SET]'}`);
      console.log(`   Configuración cargada: adminUsername='${config.adminUsername}', adminPassword='${config.adminPassword ? '[SET]' : '[NOT SET]'}`);

      let admin;

      if (config.adminUsername && config.adminPassword && username === config.adminUsername) {
        console.log('✅ Credenciales válidas contra variables de entorno');

        // Buscar usuario admin en BD
        console.log('🔍 Buscando usuario en BD...');

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

        // Verificar que admin esté definido antes de continuar
        if (!admin) {
          console.log('❌ Error: Variable admin no está definida después de búsqueda/creación');
          return res.render('admin/login', {
            title: 'Login Administrador',
            error: 'Error interno del servidor'
          });
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

      // Verificar contraseña
      console.log('🔐 Verificando contraseña...');
      console.log(`✅ Usuario encontrado: ${admin ? admin.username : 'UNDEFINED'}, ID: ${admin ? admin.id : 'UNDEFINED'}`);
      console.log(`🔍 Verificando contraseña para usuario: ${admin ? admin.username : 'UNDEFINED'}`);
      console.log(`🔍 Tipo de admin: ${typeof admin}, admin es null: ${admin === null}, admin es undefined: ${admin === undefined}`);

      if (!admin) {
        console.log('❌ ERROR CRÍTICO: Variable admin es null/undefined antes de checkPassword');
        return res.render('admin/login', {
          title: 'Login Administrador',
          error: 'Error interno del servidor - usuario no encontrado'
        });
      }

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

        // Redirigir inmediatamente sin timeout
        console.log('🚀 Redirigiendo inmediatamente a dashboard...');
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

      // Información del webhook de respuesta (donde n8n debe enviar la respuesta)
      const config = require('../config/env');
      const webhookInfo = {
        responseUrl: `${req.protocol}://${req.get('host')}/api/webhook/validation-response`,
        n8nWebhookUrl: config.n8nWebhookUrl,
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

  // Listar participantes agrupados por cédula con filtros y paginación
  async listParticipants(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 50;
      const offset = (page - 1) * limit;

      // Construir filtros para la consulta agrupada
      let whereClause = '';
      const replacements = {};

      if (req.query.province) {
        whereClause += ' AND p.province = :province';
        replacements.province = req.query.province;
      }

      if (req.query.validated !== undefined) {
        whereClause += ' AND p.ticket_validated = :validated';
        replacements.validated = req.query.validated === 'true';
      }

      if (req.query.search) {
        whereClause += ` AND (
          p.name ILIKE :search OR
          p.last_name ILIKE :search OR
          p.cedula ILIKE :search OR
          p.phone ILIKE :search OR
          p.ticket_number ILIKE :search
        )`;
        replacements.search = `%${req.query.search}%`;
      }

      // Consulta SQL para agrupar participantes por cédula
      const query = `
        SELECT
          p.cedula,
          p.name,
          p.last_name,
          p.phone,
          p.province,
          COUNT(*) as ticket_count,
          STRING_AGG(p.ticket_number::text, ', ' ORDER BY p.created_at) as ticket_numbers,
          STRING_AGG(p.created_at::text, ', ' ORDER BY p.created_at) as registration_dates,
          STRING_AGG(p.ticket_image_url, ', ' ORDER BY p.created_at) as ticket_images,
          STRING_AGG(p.id::text, ', ' ORDER BY p.created_at) as participant_ids,
          MIN(p.created_at) as first_registration,
          MAX(p.created_at) as last_registration
        FROM participants p
        WHERE 1=1 ${whereClause}
        GROUP BY p.cedula, p.name, p.last_name, p.phone, p.province
        ORDER BY MAX(p.created_at) DESC
        LIMIT :limit OFFSET :offset
      `;

      const countQuery = `
        SELECT COUNT(DISTINCT cedula) as total
        FROM participants p
        WHERE 1=1 ${whereClause}
      `;

      // Ejecutar consultas
      const [participantsResult] = await require('../config/database').sequelize.query(query, {
        replacements: { ...replacements, limit, offset }
      });

      const [countResult] = await require('../config/database').sequelize.query(countQuery, {
        replacements
      });

      // Obtener lista de provincias para filtro
      const provinces = await Participant.findAll({
        attributes: [[require('sequelize').fn('DISTINCT', require('sequelize').col('province')), 'province']],
        raw: true
      });

      // Transformar resultados para la vista
      const participants = participantsResult.map(p => ({
        cedula: p.cedula,
        name: p.name,
        last_name: p.last_name,
        phone: p.phone,
        province: p.province,
        ticket_count: parseInt(p.ticket_count),
        ticket_numbers: p.ticket_numbers,
        registration_dates: p.registration_dates,
        ticket_images: p.ticket_images,
        participant_ids: p.participant_ids,
        first_registration: p.first_registration,
        last_registration: p.last_registration
      }));

      res.render('admin/participants', {
        title: 'Gestión de Participantes',
        participants,
        provinces: provinces.map(p => p.province),
        currentPage: page,
        totalPages: Math.ceil(countResult[0].total / limit),
        totalCount: countResult[0].total,
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

  // Ver detalle de participante (todos los tickets de una cédula)
  async showParticipant(req, res) {
    try {
      const { id } = req.params;
      console.log(`🔍 Buscando participante con ID: ${id}`);

      // Si el ID contiene coma, es una lista de IDs (múltiples tickets)
      if (id.includes(',')) {
        const participantIds = id.split(',').map(id => parseInt(id.trim()));
        console.log(`📋 Mostrando múltiples tickets - IDs: ${participantIds.join(', ')}`);

        // Obtener todos los tickets de esta cédula
        const participants = await Participant.findAll({
          where: { id: participantIds },
          order: [['created_at', 'ASC']]
        });

        if (!participants || participants.length === 0) {
          console.log(`❌ No se encontraron tickets para IDs: ${participantIds.join(', ')}`);
          return res.render('admin/participants', {
            title: 'Participante no encontrado',
            error: 'Participante no encontrado',
            participants: [],
            provinces: [],
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            filters: {}
          });
        }

        // Usar el primer participante para información básica
        const mainParticipant = participants[0];

        console.log(`✅ Encontrados ${participants.length} tickets para: ${mainParticipant.name} ${mainParticipant.last_name}`);

        res.render('admin/participant-detail', {
          title: `Detalle - ${mainParticipant.name} ${mainParticipant.last_name}`,
          participant: mainParticipant,
          allTickets: participants, // Todos los tickets de esta persona
          adminUsername: req.session.adminUsername
        });
      } else {
        // Vista individual (por compatibilidad)
        const participantId = parseInt(id);
        if (isNaN(participantId)) {
          console.log(`❌ ID inválido: ${id}`);
          return res.render('admin/participants', {
            title: 'ID inválido',
            error: 'ID de participante inválido',
            participants: [],
            provinces: [],
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            filters: {}
          });
        }

        const participant = await Participant.findByPk(participantId);

        if (!participant) {
          console.log(`❌ Participante con ID ${participantId} no encontrado`);
          return res.render('admin/participants', {
            title: 'Participante no encontrado',
            error: 'Participante no encontrado',
            participants: [],
            provinces: [],
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            filters: {}
          });
        }

        console.log(`✅ Participante encontrado: ${participant.name} ${participant.last_name}`);
        console.log(`📸 URL de imagen: ${participant.ticket_image_url}`);

        res.render('admin/participant-detail', {
          title: `Detalle - ${participant.name} ${participant.last_name}`,
          participant,
          allTickets: [participant], // Solo este ticket
          adminUsername: req.session.adminUsername
        });
      }

    } catch (error) {
      console.error('❌ Error obteniendo participante:', error);
      console.error('Stack trace:', error.stack);
      res.render('admin/participants', {
        title: 'Error',
        error: 'Error obteniendo participante',
        participants: [],
        provinces: [],
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        filters: {}
      });
    }
  }

  // Mostrar página de configuración
  async showConfiguracion(req, res) {
    try {
      console.log('⚙️ Acceso a página de configuración');

      // Información del webhook de respuesta (donde n8n debe enviar la respuesta)
      const config = require('../config/env');
      const webhookInfo = {
        responseUrl: `${req.protocol}://${req.get('host')}/api/webhook/validation-response`,
        n8nWebhookUrl: config.n8nWebhookUrl,
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

      res.render('admin/configuracion', {
        title: 'Configuración del Sistema',
        adminUsername: req.session.adminUsername,
        webhookInfo
      });

    } catch (error) {
      console.error('❌ Error cargando configuración:', error);
      console.error('Stack trace:', error.stack);

      res.render('admin/configuracion', {
        title: 'Configuración del Sistema',
        adminUsername: req.session.adminUsername || 'Admin',
        webhookInfo: null,
        error: 'Error cargando configuración del sistema'
      });
    }
  }

  // Eliminar un ticket específico (no todo el usuario)
  async deleteTicket(req, res) {
    try {
      const { id } = req.params;
      console.log(`🗑️ Eliminando ticket con ID: ${id}`);

      const participant = await Participant.findByPk(id);

      if (!participant) {
        console.log(`❌ Ticket con ID ${id} no encontrado`);
        return res.status(404).json({
          success: false,
          message: 'Ticket no encontrado'
        });
      }

      // Guardar información para logging
      const ticketInfo = {
        cedula: participant.cedula,
        name: participant.name,
        lastName: participant.last_name,
        ticketNumber: participant.ticket_number
      };

      // Eliminar el ticket
      await participant.destroy();

      console.log(`✅ Ticket eliminado: ${ticketInfo.ticketNumber} - ${ticketInfo.name} ${ticketInfo.lastName} (${ticketInfo.cedula})`);

      res.json({
        success: true,
        message: `Ticket ${ticketInfo.ticketNumber} eliminado exitosamente`,
        deletedTicket: ticketInfo
      });

    } catch (error) {
      console.error('❌ Error eliminando ticket:', error);
      console.error('Stack trace:', error.stack);
      res.status(500).json({
        success: false,
        message: 'Error eliminando ticket'
      });
    }
  }
}

module.exports = new AdminController();