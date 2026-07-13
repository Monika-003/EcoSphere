'use strict';

const router  = require('express').Router();
const ctrl    = require('../../controllers/auth.controller');
const { authenticate }       = require('../../middleware/auth');
const { authLimiter }        = require('../../middleware/rateLimiter');
const { validate }           = require('../../middleware/validate');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema,
  updateRoleSchema
} = require('../../validations/auth.validation');

/* ── Public routes ── */
router.post('/register',        authLimiter, validate(registerSchema),       ctrl.register);
router.post('/login',           authLimiter, validate(loginSchema),          ctrl.login);
router.post('/refresh-token',   authLimiter, validate(refreshTokenSchema),   ctrl.refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), ctrl.forgotPassword);
router.post('/reset-password',  authLimiter, validate(resetPasswordSchema),  ctrl.resetPassword);

/* ── Protected routes ── */
router.post('/logout',           authenticate,                                      ctrl.logout);
router.get ('/me',               authenticate,                                      ctrl.getMe);
router.put ('/change-password',  authenticate, validate(changePasswordSchema),      ctrl.changePassword);
router.put ('/profile',          authenticate, validate(updateProfileSchema),       ctrl.updateProfile);
router.patch('/role',            authenticate, validate(updateRoleSchema),           ctrl.updateRole);

module.exports = router;
