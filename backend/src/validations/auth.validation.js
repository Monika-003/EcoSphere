'use strict';

/**
 * auth.validation.js — Joi schemas for all auth endpoints
 */

const Joi = require('joi');

/* ── Password policy ── */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#])[A-Za-z\d@$!%*?&^#]{8,128}$/;
const PASSWORD_MESSAGE = 'Password must be 8-128 characters and contain uppercase, lowercase, digit, and special character';

const password = () =>
  Joi.string().pattern(PASSWORD_REGEX).min(8).max(128).required().messages({
    'string.pattern.base': PASSWORD_MESSAGE,
    'string.min':          'Password must be at least 8 characters',
    'string.max':          'Password cannot exceed 128 characters',
    'any.required':        'Password is required'
  });

/* ── Role whitelist ── */
const VALID_ROLES = [
  'ENV_OFFICER','ADMIN','ENV_ENGINEER','PRODUCTION_HEAD','QUALITY_HEAD','HR_HEAD',
  'LAB_ADMIN','LAB_ANALYST','LAB_SENIOR_REVIEWER','LAB_QUALITY_MANAGER',
  'REG_OFFICER','REG_INSPECTOR','REG_REGIONAL_OFFICER','REG_GOVERNMENT_AUTHORITY',
  'SUPER_ADMIN','CONSULTANT','AUDITOR'
];

/* ════════════════════════════════════════════════════
   REGISTER
════════════════════════════════════════════════════ */
exports.registerSchema = Joi.object({
  firstName:      Joi.string().trim().min(1).max(50).required()
                   .messages({ 'any.required': 'First name is required' }),

  lastName:       Joi.string().trim().min(1).max(50).required()
                   .messages({ 'any.required': 'Last name is required' }),

  email:          Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required()
                   .messages({
                     'string.email':  'Must be a valid email address',
                     'any.required':  'Email is required'
                   }),

  password:       password(),

  phone:          Joi.string().trim().pattern(/^\+?[1-9]\d{6,14}$/).optional().allow('', null)
                   .messages({ 'string.pattern.base': 'Phone must be a valid international number (e.g. +91xxxxxxxxxx)' }),

  role:           Joi.string().valid(...VALID_ROLES).default('ENV_ENGINEER')
                   .messages({ 'any.only': `Role must be one of: ${VALID_ROLES.join(', ')}` }),

  organizationId: Joi.string().uuid().optional().allow(null),
  laboratoryId:   Joi.string().uuid().optional().allow(null),
  authorityId:    Joi.string().uuid().optional().allow(null),

  designation:    Joi.string().trim().max(100).optional().allow('', null),
  department:     Joi.string().trim().max(100).optional().allow('', null),
});

/* ════════════════════════════════════════════════════
   LOGIN
════════════════════════════════════════════════════ */
exports.loginSchema = Joi.object({
  email:      Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required()
               .messages({
                 'string.email': 'Must be a valid email address',
                 'any.required': 'Email is required'
               }),

  password:   Joi.string().min(1).max(256).required()
               .messages({ 'any.required': 'Password is required' }),

  rememberMe: Joi.boolean().default(false)
});

/* ════════════════════════════════════════════════════
   REFRESH TOKEN
════════════════════════════════════════════════════ */
exports.refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().min(10).required()
                 .messages({ 'any.required': 'Refresh token is required' })
});

/* ════════════════════════════════════════════════════
   FORGOT PASSWORD
════════════════════════════════════════════════════ */
exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required()
          .messages({
            'string.email': 'Must be a valid email address',
            'any.required': 'Email is required'
          })
});

/* ════════════════════════════════════════════════════
   RESET PASSWORD
════════════════════════════════════════════════════ */
exports.resetPasswordSchema = Joi.object({
  token:           Joi.string().min(10).required()
                    .messages({ 'any.required': 'Reset token is required' }),

  password:        password(),

  confirmPassword: Joi.string().valid(Joi.ref('password')).required()
                    .messages({ 'any.only': 'Passwords do not match', 'any.required': 'Please confirm your password' })
});

/* ════════════════════════════════════════════════════
   CHANGE PASSWORD (authenticated user)
════════════════════════════════════════════════════ */
exports.changePasswordSchema = Joi.object({
  currentPassword: Joi.string().min(1).required()
                    .messages({ 'any.required': 'Current password is required' }),

  newPassword:     password(),

  confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
                    .messages({ 'any.only': 'Passwords do not match', 'any.required': 'Please confirm your new password' })
}).with('newPassword', 'confirmPassword');

/* ════════════════════════════════════════════════════
   UPDATE PROFILE
════════════════════════════════════════════════════ */
exports.updateRoleSchema = Joi.object({
  role: Joi.string().valid(
    'ENV_OFFICER','ADMIN','ENV_ENGINEER',
    'PRODUCTION_HEAD','QUALITY_HEAD','HR_HEAD'
  ).required()
});

exports.updateProfileSchema = Joi.object({
  firstName:   Joi.string().trim().min(1).max(50).optional(),
  lastName:    Joi.string().trim().min(1).max(50).optional(),
  phone:       Joi.string().trim().pattern(/^\+?[1-9]\d{6,14}$/).optional().allow('', null),
  designation: Joi.string().trim().max(100).optional().allow('', null),
  department:  Joi.string().trim().max(100).optional().allow('', null),
  avatar:      Joi.string().uri().optional().allow('', null)
});
