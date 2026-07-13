'use strict';

const bcrypt  = require('bcryptjs');
const crypto  = require('crypto');
const { prisma }  = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');
const jwtUtils = require('../utils/jwt');
const { createAuditLog } = require('../middleware/auditLogger');
const { blacklistToken, getRedis } = require('../config/redis');
const notificationService = require('../services/notification.service');

/* ══════════════════════════════════════
   REGISTER (any portal type)
══════════════════════════════════════ */
exports.register = async (req, res) => {
  const { email, password, firstName, lastName, phone, role } = req.body;

  /* Prevent direct super admin creation */
  if (role === 'SUPER_ADMIN') throw new AppError('Cannot self-register as Super Admin', 403);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');

  const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName, phone, role },
    select: { id: true, email: true, firstName: true, lastName: true, role: true }
  });

  /* Send verification email */
  await notificationService.sendEmailVerification(user.id, user.email, `${user.firstName} ${user.lastName}`);

  await createAuditLog({
    userId:      user.id,
    action:      'CREATE',
    entityType:  'User',
    entityId:    user.id,
    description: `New ${role} registered: ${email}`,
    ipAddress:   req.ip,
    userAgent:   req.get('User-Agent'),
    requestId:   req.requestId
  });

  return created(res, { user }, 'Registration successful. Please verify your email.');
};

/* ══════════════════════════════════════
   LOGIN
══════════════════════════════════════ */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where:  { email },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, passwordHash: true, isActive: true,
      isEmailVerified: true, failedLoginCount: true, lockedUntil: true,
      orgId: true, labId: true, authorityId: true,
      passwordChangedAt: true
    }
  });

  if (!user) throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');

  /* Check account lock */
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const minutes = Math.ceil((user.lockedUntil - new Date()) / 60000);
    throw new AppError(`Account locked. Try again in ${minutes} minute(s)`, 423, 'ACCOUNT_LOCKED');
  }

  /* Verify password */
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    const failedCount = user.failedLoginCount + 1;
    const lockUntil   = failedCount >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
    await prisma.user.update({
      where: { id: user.id },
      data:  { failedLoginCount: failedCount, lockedUntil: lockUntil }
    });
    if (failedCount >= 5) throw new AppError('Account locked for 15 minutes after 5 failed attempts', 423, 'ACCOUNT_LOCKED');
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) throw new AppError('Account is disabled. Contact administrator.', 403);

  /* Reset failed login count */
  await prisma.user.update({
    where: { id: user.id },
    data:  { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() }
  });

  /* Generate tokens */
  const { token: accessToken }  = jwtUtils.generateAccessToken(user);
  const { token: refreshToken } = jwtUtils.generateRefreshToken(user.id);
  await jwtUtils.saveRefreshToken(user.id, refreshToken, req.ip, req.get('User-Agent'));

  await createAuditLog({
    userId:      user.id,
    action:      'LOGIN',
    entityType:  'User',
    entityId:    user.id,
    description: `Login successful: ${email}`,
    ipAddress:   req.ip,
    userAgent:   req.get('User-Agent'),
    requestId:   req.requestId,
    statusCode:  200
  });

  const { passwordHash, failedLoginCount, lockedUntil, ...safeUser } = user;

  return success(res, {
    user: safeUser,
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
  }, 'Login successful');
};

/* ══════════════════════════════════════
   REFRESH TOKEN
══════════════════════════════════════ */
exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new AppError('Refresh token required', 400);

  const decoded = await jwtUtils.verifyRefreshToken(refreshToken);

  const user = await prisma.user.findUnique({
    where:  { id: decoded.sub },
    select: { id: true, email: true, role: true, isActive: true, orgId: true, labId: true, authorityId: true }
  });

  if (!user || !user.isActive) throw new AppError('Invalid refresh token', 401);

  /* Rotate */
  const newRefresh  = await jwtUtils.rotateRefreshToken(refreshToken, user.id, req.ip, req.get('User-Agent'));
  const { token: newAccess } = jwtUtils.generateAccessToken(user);

  return success(res, {
    accessToken:  newAccess,
    refreshToken: newRefresh.token,
    expiresIn:    process.env.JWT_ACCESS_EXPIRY || '15m'
  }, 'Token refreshed');
};

/* ══════════════════════════════════════
   LOGOUT
══════════════════════════════════════ */
exports.logout = async (req, res) => {
  const { refreshToken } = req.body;

  /* Blacklist access token */
  if (req.tokenId) {
    const expiry = jwtUtils.getExpirySeconds(req.headers.authorization.split(' ')[1]);
    await blacklistToken(req.tokenId, expiry);
  }

  /* Revoke refresh token */
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data:  { isRevoked: true }
    });
  }

  await createAuditLog({
    userId:      req.user?.id,
    action:      'LOGOUT',
    entityType:  'User',
    entityId:    req.user?.id,
    description: 'User logged out',
    ipAddress:   req.ip,
    requestId:   req.requestId
  });

  return success(res, {}, 'Logged out successfully');
};

/* ══════════════════════════════════════
   FORGOT PASSWORD
══════════════════════════════════════ */
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });

  /* Don't reveal whether user exists */
  if (user) {
    const token     = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt }
    });

    await notificationService.sendPasswordResetEmail(
      email,
      `${user.firstName} ${user.lastName}`,
      `${process.env.FRONTEND_URL}/reset-password?token=${token}`
    );
  }

  return success(res, {}, 'If that email is registered, a reset link has been sent.');
};

/* ══════════════════════════════════════
   RESET PASSWORD
══════════════════════════════════════ */
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new AppError('Reset token is invalid or has expired', 400, 'INVALID_TOKEN');
  }

  const passwordHash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { email: resetToken.email },
      data:  { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null }
    }),
    prisma.passwordResetToken.update({
      where: { token },
      data:  { usedAt: new Date() }
    })
  ]);

  /* Revoke all existing tokens for security */
  const user = await prisma.user.findUnique({ where: { email: resetToken.email } });
  if (user) await jwtUtils.revokeAllTokens(user.id);

  return success(res, {}, 'Password reset successfully. Please login with your new password.');
};

/* ══════════════════════════════════════
   GET ME
══════════════════════════════════════ */
exports.getMe = async (req, res) => {
  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      phone: true, avatar: true, role: true,
      isEmailVerified: true, isPhoneVerified: true,
      orgId: true, labId: true, authorityId: true,
      lastLoginAt: true, createdAt: true
    }
  });
  return success(res, { user });
};

/* ══════════════════════════════════════
   CHANGE PASSWORD
══════════════════════════════════════ */
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: { id: true, passwordHash: true }
  });

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new AppError('Current password is incorrect', 401);

  const passwordHash = await bcrypt.hash(newPassword, parseInt(process.env.BCRYPT_ROUNDS || '12'));
  await prisma.user.update({
    where: { id: user.id },
    data:  { passwordHash, passwordChangedAt: new Date() }
  });

  /* Blacklist current access token */
  if (req.tokenId) {
    const expiry = jwtUtils.getExpirySeconds(req.headers.authorization.split(' ')[1]);
    await blacklistToken(req.tokenId, expiry);
  }

  await createAuditLog({
    userId:      req.user.id,
    action:      'PASSWORD_CHANGE',
    entityType:  'User',
    entityId:    req.user.id,
    description: 'Password changed',
    ipAddress:   req.ip,
    requestId:   req.requestId
  });

  return success(res, {}, 'Password changed successfully. Please login again.');
};

/* ══════════════════════════════════════
   UPDATE PROFILE
══════════════════════════════════════ */
/* ══════════════════════════════════════
   UPDATE OWN ROLE (org-portal self-service)
   Only org roles are selectable; no escalation to SUPER_ADMIN, LAB or REG roles.
══════════════════════════════════════ */
const ORG_SELECTABLE_ROLES = [
  'ENV_OFFICER','ADMIN','ENV_ENGINEER',
  'PRODUCTION_HEAD','QUALITY_HEAD','HR_HEAD'
];

exports.updateRole = async (req, res) => {
  const { role } = req.body;

  if (!ORG_SELECTABLE_ROLES.includes(role)) {
    throw new AppError('Invalid role selection', 400, 'INVALID_ROLE');
  }

  // Only org-portal users may self-update role
  if (!ORG_SELECTABLE_ROLES.includes(req.user.role)) {
    throw new AppError('Role update not permitted for your account type', 403, 'FORBIDDEN');
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data:  { role, updatedAt: new Date() },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      role: true, orgId: true, labId: true, authorityId: true
    }
  });

  // Issue fresh tokens embedding the new role in the JWT
  const { token: accessToken }  = jwtUtils.generateAccessToken(updated);
  const { token: refreshToken } = jwtUtils.generateRefreshToken(updated.id);
  await jwtUtils.saveRefreshToken(updated.id, refreshToken, req.ip, req.get('User-Agent'));

  await createAuditLog({
    userId:      req.user.id,
    action:      'UPDATE',
    entityType:  'User',
    entityId:    req.user.id,
    description: `Role updated to ${role}`,
    ipAddress:   req.ip,
    requestId:   req.requestId
  });

  return success(res, { user: updated, accessToken, refreshToken }, 'Role updated');
};

exports.updateProfile = async (req, res) => {
  const { firstName, lastName, phone, designation, department, avatar } = req.body;

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data:  {
      ...(firstName   !== undefined && { firstName }),
      ...(lastName    !== undefined && { lastName }),
      ...(phone       !== undefined && { phone }),
      ...(designation !== undefined && { designation }),
      ...(department  !== undefined && { department }),
      ...(avatar      !== undefined && { avatar }),
      updatedAt: new Date()
    },
    select: {
      id: true, email: true, firstName: true, lastName: true,
      phone: true, designation: true, department: true, avatar: true,
      role: true, updatedAt: true
    }
  });

  await createAuditLog({
    userId:      req.user.id,
    action:      'UPDATE',
    entityType:  'User',
    entityId:    req.user.id,
    description: 'Profile updated',
    ipAddress:   req.ip,
    requestId:   req.requestId
  });

  return success(res, { user: updated }, 'Profile updated successfully');
};
