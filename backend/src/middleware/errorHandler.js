'use strict';

const { logger } = require('../config/logger');

/* ─── Custom Application Error ─── */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name       = 'AppError';
    this.statusCode = statusCode;
    this.code       = code;
    this.details    = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/* ─── Validation Error ─── */
class ValidationError extends AppError {
  constructor(errors) {
    super('Validation failed', 422, 'VALIDATION_ERROR', errors);
    this.name = 'ValidationError';
  }
}

/* ─── 404 Not Found ─── */
function notFound(req, _res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404, 'NOT_FOUND'));
}

/* ─── Global Error Handler ─── */
function errorHandler(err, req, res, _next) {
  let { statusCode = 500, message, code = 'INTERNAL_ERROR', details } = err;

  /* Prisma errors */
  if (err.code === 'P2002') {
    statusCode = 409;
    code       = 'DUPLICATE_ENTRY';
    message    = `Duplicate value for: ${err.meta?.target?.join(', ') || 'field'}`;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    code       = 'NOT_FOUND';
    message    = 'Record not found';
  } else if (err.code === 'P2003') {
    statusCode = 400;
    code       = 'FOREIGN_KEY_ERROR';
    message    = 'Related record not found';
  }

  /* JWT errors */
  if (err.name === 'JsonWebTokenError') { statusCode = 401; code = 'INVALID_TOKEN'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; code = 'TOKEN_EXPIRED'; message = 'Token expired'; }

  /* Multer errors */
  if (err.code === 'LIMIT_FILE_SIZE')  { statusCode = 413; code = 'FILE_TOO_LARGE'; message = 'File size exceeds limit'; }
  if (err.code === 'LIMIT_FILE_COUNT') { statusCode = 400; code = 'TOO_MANY_FILES'; message = 'Too many files uploaded'; }

  /* Log server errors */
  if (statusCode >= 500) {
    logger.error({
      message:   err.message,
      stack:     err.stack,
      url:       req.originalUrl,
      method:    req.method,
      requestId: req.requestId,
      userId:    req.user?.id
    });
  }

  const response = {
    success:   false,
    code,
    message,
    requestId: req.requestId,
    timestamp: new Date().toISOString(),
  };

  if (details) response.details = details;

  if (process.env.NODE_ENV === 'development' && statusCode >= 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

module.exports = { AppError, ValidationError, notFound, errorHandler };
