'use strict';

const { Server } = require('socket.io');
const { logger } = require('../config/logger');
const { isTokenBlacklisted } = require('../config/redis');
const jwt = require('jsonwebtoken');

let _io = null;

/**
 * Initialize Socket.IO server attached to an HTTP server instance.
 * @param {import('http').Server} httpServer
 * @returns {import('socket.io').Server}
 */
function initSocket(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin:      process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : '*',
      methods:     ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout:  5000
  });

  /* ── JWT auth middleware for Socket.IO ── */
  _io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication token required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET, {
        issuer:   process.env.JWT_ISSUER   || 'ecosphere-api',
        audience: process.env.JWT_AUDIENCE || 'ecosphere-client'
      });

      /* Check blacklist */
      if (decoded.jti) {
        const blacklisted = await isTokenBlacklisted(decoded.jti);
        if (blacklisted) return next(new Error('Token has been revoked'));
      }

      socket.user = {
        id:          decoded.sub,
        role:        decoded.role,
        orgId:       decoded.orgId,
        labId:       decoded.labId,
        authorityId: decoded.authorityId
      };

      next();
    } catch (err) {
      logger.warn('Socket auth failed:', err.message);
      next(new Error('Authentication failed'));
    }
  });

  _io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${socket.id} | user: ${user.id} | role: ${user.role}`);

    /* ── Auto-join rooms based on role ── */
    if (user.orgId)       socket.join(`org:${user.orgId}`);
    if (user.labId)       socket.join('lab');
    if (user.authorityId) socket.join('regulatory');
    if (user.role === 'SUPER_ADMIN') socket.join('admin');

    /* ── Client can also join specific rooms ── */
    socket.on('join:org', (orgId) => {
      if (user.orgId === orgId || user.role === 'SUPER_ADMIN') {
        socket.join(`org:${orgId}`);
        logger.debug(`Socket ${socket.id} joined org:${orgId}`);
      }
    });

    socket.on('join:station', (stationId) => {
      socket.join(`station:${stationId}`);
    });

    /* ── Monitoring handlers ── */
    socket.on('monitoring:subscribe', (payload) => {
      const { orgId, stationId } = payload || {};
      if (orgId && user.orgId === orgId) socket.join(`org:${orgId}:monitoring`);
      if (stationId) socket.join(`station:${stationId}`);
    });

    /* ── Ping/pong ── */
    socket.on('ping', () => socket.emit('pong', { ts: Date.now() }));

    /* ── Disconnect ── */
    socket.on('disconnect', (reason) => {
      logger.debug(`Socket disconnected: ${socket.id} reason: ${reason}`);
    });
  });

  logger.info('Socket.IO server initialized');
  return _io;
}

/**
 * Get the initialized Socket.IO instance.
 * Returns null if not yet initialized (safe to call from controllers).
 */
function getIo() {
  return _io;
}

/**
 * Emit to a specific organization room.
 */
function emitToOrg(orgId, event, data) {
  if (_io) _io.to(`org:${orgId}`).emit(event, data);
}

/**
 * Emit to all lab users.
 */
function emitToLab(event, data) {
  if (_io) _io.to('lab').emit(event, data);
}

/**
 * Emit to all regulatory users.
 */
function emitToRegulatory(event, data) {
  if (_io) _io.to('regulatory').emit(event, data);
}

/**
 * Emit to all admin users.
 */
function emitToAdmin(event, data) {
  if (_io) _io.to('admin').emit(event, data);
}

module.exports = { initSocket, getIo, emitToOrg, emitToLab, emitToRegulatory, emitToAdmin };
