'use strict';

const jwt                  = require('jsonwebtoken');
const { prisma }           = require('../config/database');
const { isTokenBlacklisted } = require('../config/redis');
const { AppError }         = require('./errorHandler');

/* ─── Verify Access Token ─── */
async function authenticate(req, res, next) {
  /* Support token in query param for direct download URLs (?token=JWT) */
  const authHeader = req.headers.authorization;
  const rawToken   = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.split(' ')[1]
    : (req.query.token || null);

  if (!rawToken) {
    return next(new AppError('Access token required', 401, 'NO_TOKEN'));
  }

  const token = rawToken;

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      issuer:   process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError')  return next(new AppError('Token expired',   401, 'TOKEN_EXPIRED'));
    if (err.name === 'JsonWebTokenError')  return next(new AppError('Invalid token',   401, 'INVALID_TOKEN'));
    return next(new AppError('Token verification failed', 401, 'TOKEN_ERROR'));
  }

  /* Check blacklist (revoked tokens) */
  if (decoded.jti && await isTokenBlacklisted(decoded.jti)) {
    return next(new AppError('Token has been revoked', 401, 'TOKEN_REVOKED'));
  }

  /* Load user from DB */
  const user = await prisma.user.findUnique({
    where:  { id: decoded.sub },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, isActive: true, isEmailVerified: true,
      orgId: true, labId: true, authorityId: true,
      passwordChangedAt: true
    }
  });

  if (!user)          return next(new AppError('User not found',      401, 'USER_NOT_FOUND'));
  if (!user.isActive) return next(new AppError('Account is disabled', 403, 'ACCOUNT_DISABLED'));

  /* Check if password changed after token issued */
  if (user.passwordChangedAt) {
    const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (decoded.iat < changedAt) {
      return next(new AppError('Password changed — please login again', 401, 'PASSWORD_CHANGED'));
    }
  }

  req.user    = user;
  req.tokenId = decoded.jti;
  next();
}

/* ─── Optional Auth (public + auth routes) ─── */
async function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();
  try {
    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user    = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (user && user.isActive) req.user = user;
  } catch {}
  next();
}

module.exports = { authenticate, optionalAuth };
