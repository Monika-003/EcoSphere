'use strict';

const { PrismaClient } = require('@prisma/client');
const { logger }       = require('./logger');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'warn',  emit: 'event' },
      ]
    : [
        { level: 'error', emit: 'event' },
      ],
  errorFormat: 'pretty',
});

/* Log slow queries in development */
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 500) {
      logger.warn(`[DB] Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

prisma.$on('error', (e) => {
  logger.error('[DB] Prisma error:', e);
});

/* Transaction helper with retry */
async function withTransaction(fn, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await prisma.$transaction(fn, {
        timeout: 30000,
        maxWait:  5000
      });
    } catch (err) {
      if (i === retries - 1 || !err.message?.includes('deadlock')) throw err;
      await new Promise(r => setTimeout(r, 100 * (i + 1)));
    }
  }
}

module.exports = { prisma, withTransaction };
