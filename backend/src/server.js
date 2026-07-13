/**
 * EcoSphere — Enterprise Backend Server
 * Node.js + Express.js + Socket.IO + PostgreSQL + Redis
 */

'use strict';

/* Load .env from backend/ regardless of where the process was launched from */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('express-async-errors');

const express     = require('express');
const http        = require('http');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const path        = require('path');

const { logger }       = require('./config/logger');
const { connectRedis } = require('./config/redis');
const { prisma }       = require('./config/database');
const { initSocket }   = require('./socket');
const routes           = require('./routes');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { generalLimiter }        = require('./middleware/rateLimiter');

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 5000;

/* ── Allowed Origins ── */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

/* ══════════════════════════════════════
   GLOBAL MIDDLEWARE
══════════════════════════════════════ */
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    // Non-browser / server-to-server requests have no Origin header — always allow
    if (!origin) return callback(null, true);

    // In development: allow everything so the frontend (file://, localhost:*, etc.) works without configuration
    if (process.env.NODE_ENV !== 'production') return callback(null, true);

    // In production: check against the ALLOWED_ORIGINS whitelist.
    // If the list is empty the admin forgot to configure it — allow all rather than break all.
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods:          ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders:   ['Content-Type','Authorization','X-Request-ID','X-Client-Version'],
  exposedHeaders:   ['X-Request-ID','X-Total-Count','X-Page','X-Limit'],
  credentials:      true,
  maxAge:           86400
}));

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

/* HTTP request logging */
app.use(morgan('combined', {
  stream: { write: (msg) => logger.info(msg.trim()) },
  skip: (req) => req.url === '/health'
}));

/* Request ID */
app.use((req, _res, next) => {
  req.requestId = require('uuid').v4();
  next();
});

/* General rate limit */
app.use('/api/', generalLimiter);

/* ══════════════════════════════════════
   ROUTES
══════════════════════════════════════ */
/* Health check */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'EcoSphere API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  });
});

/* API v1 */
app.use('/api/v1', routes);

/* Swagger docs */
if (process.env.NODE_ENV !== 'production') {
  try {
    const swaggerUi   = require('swagger-ui-express');
    const swaggerSpec  = require('./utils/swagger');
    app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { background: #040d1a }',
      customSiteTitle: 'EcoSphere API Docs'
    }));
    logger.info('📚 Swagger docs available at /api/docs');
  } catch (e) {
    logger.warn('Swagger not available:', e.message);
  }
}

/* ══════════════════════════════════════
   FRONTEND STATIC SERVING
   Serves the EcoSphere frontend directly from the project root.
   Route order: health → api/v1 → swagger → static files → SPA fallback → error
══════════════════════════════════════ */
/* Serve all static files (HTML, CSS, JS, images) from project root.
   In development: disable browser caching so JS/CSS changes are picked up
   immediately without needing a hard refresh. */
const staticOptions = {
  index:        'index.html',
  extensions:   ['html'],
  etag:         process.env.NODE_ENV === 'production',
  lastModified: process.env.NODE_ENV === 'production',
  setHeaders:   process.env.NODE_ENV !== 'production'
    ? (res, filePath) => {
        if (/\.(js|css|html)$/.test(filePath)) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    : undefined
};
app.use(express.static(path.join(__dirname, '../../'), staticOptions));

/* SPA fallback: for any non-API route that didn't match a static file, serve index.html */
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path === '/health') return next();
  res.sendFile(path.join(__dirname, '../../index.html'));
});

/* 404 handler (API routes only) */
app.use(notFound);

/* Global error handler */
app.use(errorHandler);

/* ══════════════════════════════════════
   SOCKET.IO
══════════════════════════════════════ */
initSocket(server);

/* ══════════════════════════════════════
   START SERVER
══════════════════════════════════════ */
async function startServer() {
  /* ── Redis (optional — degrades gracefully in dev) ── */
  try {
    await connectRedis();
  } catch (err) {
    logger.warn('⚠️  Redis unavailable — caching and token blacklisting disabled:', err.message);
  }

  /* ── PostgreSQL (required) ── */
  try {
    await prisma.$connect();
    logger.info('✅ PostgreSQL connected via Prisma');
  } catch (err) {
    logger.error('❌ PostgreSQL connection failed:', err.message);
    logger.error('');
    logger.error('  Please ensure PostgreSQL is running and DATABASE_URL in .env is correct.');
    logger.error('  Quick options:');
    logger.error('    • Local:  Install from https://www.postgresql.org/download/windows/');
    logger.error('    • Cloud:  Free tier at https://neon.tech  (paste connection string into .env)');
    logger.error('    • Docker: docker run -e POSTGRES_PASSWORD=pass -p 5432:5432 postgres:15');
    logger.error('');
    process.exit(1);
  }

  /* ── Start HTTP server ── */
  server.listen(PORT, () => {
    logger.info(`🚀 EcoSphere running on http://localhost:${PORT} [${process.env.NODE_ENV || 'development'}]`);
    logger.info(`🌿 Frontend: http://localhost:${PORT}/`);
    logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    logger.info(`💚 Health:   http://localhost:${PORT}/health`);
  });
}

/* Graceful shutdown */
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('PostgreSQL disconnected');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  (err) => { logger.error('Uncaught exception:', err);  process.exit(1); });
process.on('unhandledRejection', (err) => { logger.error('Unhandled rejection:', err); process.exit(1); });

startServer();

module.exports = { app, server };
