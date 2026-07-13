'use strict';

const { prisma } = require('../config/database');
const { logger } = require('../config/logger');

/**
 * Middleware to automatically log audit trails
 * Usage: router.post('/...', authenticate, auditLog('CREATE','Report'), controller)
 */
function auditLog(action, entityType) {
  return async (req, _res, next) => {
    req._auditAction     = action;
    req._auditEntityType = entityType;
    next();
  };
}

/**
 * Log audit entry after response
 * Call this from services after successful DB operations
 */
async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  description,
  oldData,
  newData,
  ipAddress,
  userAgent,
  requestId,
  duration,
  statusCode,
  errorMessage,
  metadata
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        description,
        oldData:      oldData  ? oldData  : undefined,
        newData:      newData  ? newData  : undefined,
        ipAddress,
        userAgent,
        requestId,
        duration,
        statusCode,
        errorMessage,
        metadata
      }
    });
  } catch (err) {
    logger.error('[Audit] Failed to write audit log:', err.message);
  }
}

/**
 * Express response interceptor — logs after response sent
 */
function responseAuditMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', async () => {
    if (!req._auditAction || !req._auditEntityType) return;

    try {
      await createAuditLog({
        userId:      req.user?.id,
        action:      req._auditAction,
        entityType:  req._auditEntityType,
        entityId:    req._auditEntityId || req.params?.id,
        description: `${req._auditAction} ${req._auditEntityType}`,
        ipAddress:   req.ip,
        userAgent:   req.get('User-Agent'),
        requestId:   req.requestId,
        duration:    Date.now() - start,
        statusCode:  res.statusCode,
        metadata:    req._auditMeta
      });
    } catch {}
  });

  next();
}

module.exports = { auditLog, createAuditLog, responseAuditMiddleware };
