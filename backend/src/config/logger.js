'use strict';

const winston     = require('winston');
const DailyRotate = require('winston-daily-rotate-file');
const path        = require('path');

const LOG_DIR  = path.join(__dirname, '../../logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const formats = {
  console: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
      return `${timestamp} [${level}] ${message}${metaStr}`;
    })
  ),
  file: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  )
};

const transports = [
  new winston.transports.Console({
    format: formats.console,
    silent: process.env.NODE_ENV === 'test'
  }),
  new DailyRotate({
    filename:    path.join(LOG_DIR, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level:       'error',
    format:      formats.file,
    maxFiles:    '30d',
    maxSize:     '20m',
    zippedArchive: true
  }),
  new DailyRotate({
    filename:    path.join(LOG_DIR, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    format:      formats.file,
    maxFiles:    '14d',
    maxSize:     '50m',
    zippedArchive: true
  })
];

const logger = winston.createLogger({
  level:      LOG_LEVEL,
  transports,
  exitOnError: false
});

/* HTTP access logger stream */
logger.stream = { write: (message) => logger.http(message.trim()) };

module.exports = { logger };
