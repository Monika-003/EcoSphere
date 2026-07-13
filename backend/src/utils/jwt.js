'use strict';

const jwt    = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const { prisma } = require('../config/database');
const { blacklistToken } = require('../config/redis');

const ACCESS_EXPIRY  = process.env.JWT_ACCESS_EXPIRY  || '15m';
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

/* ── Generate Access Token ── */
function generateAccessToken(user) {
  const jti = uuid();
  const token = jwt.sign(
    {
      sub:    user.id,
      email:  user.email,
      role:   user.role,
      orgId:  user.orgId   || null,
      labId:  user.labId   || null,
      authId: user.authorityId || null,
      jti
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: ACCESS_EXPIRY,
      issuer:    process.env.JWT_ISSUER,
      audience:  process.env.JWT_AUDIENCE
    }
  );
  return { token, jti };
}

/* ── Generate Refresh Token ── */
function generateRefreshToken(userId) {
  const jti = uuid();
  const token = jwt.sign(
    { sub: userId, jti, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
  return { token, jti };
}

/* ── Save Refresh Token to DB ── */
async function saveRefreshToken(userId, token, ipAddress, userAgent) {
  const decoded = jwt.decode(token);
  const expiresAt = new Date(decoded.exp * 1000);

  return prisma.refreshToken.create({
    data: { userId, token, expiresAt, ipAddress, userAgent }
  });
}

/* ── Rotate Refresh Token ── */
async function rotateRefreshToken(oldToken, userId, ipAddress, userAgent) {
  /* Invalidate old */
  await prisma.refreshToken.updateMany({
    where: { token: oldToken, userId },
    data:  { isRevoked: true }
  });

  const newRefresh = generateRefreshToken(userId);
  await saveRefreshToken(userId, newRefresh.token, ipAddress, userAgent);
  return newRefresh;
}

/* ── Revoke all user tokens (logout all) ── */
async function revokeAllTokens(userId) {
  await prisma.refreshToken.updateMany({
    where: { userId, isRevoked: false },
    data:  { isRevoked: true }
  });
}

/* ── Decode without verify (for token info) ── */
function decodeToken(token) {
  return jwt.decode(token);
}

/* ── Verify Refresh Token ── */
async function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  const stored  = await prisma.refreshToken.findUnique({ where: { token } });

  if (!stored || stored.isRevoked || new Date() > stored.expiresAt) {
    throw new Error('Refresh token invalid or expired');
  }
  return decoded;
}

/* ── Compute expiry seconds for Redis ── */
function getExpirySeconds(token) {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) return 900;
  return Math.max(0, Math.floor(decoded.exp - Date.now() / 1000));
}

module.exports = {
  generateAccessToken, generateRefreshToken,
  saveRefreshToken, rotateRefreshToken, revokeAllTokens,
  verifyRefreshToken, decodeToken, getExpirySeconds
};
