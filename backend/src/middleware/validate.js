'use strict';

/**
 * validate.js — Joi validation middleware factory
 *
 * Usage:
 *   const { validate } = require('../middleware/validate');
 *   const { loginSchema } = require('../validations/auth.validation');
 *
 *   router.post('/login', validate(loginSchema), authController.login);
 *
 * The factory returns an Express middleware that:
 *   1. Validates req.body (default) or a custom target (body/query/params)
 *   2. Strips unknown fields (allowUnknown: false strips silently with stripUnknown)
 *   3. Aborts early on first error for performance (abortEarly: false to collect all)
 *   4. Throws a 400 AppError with a structured message when validation fails
 */

const { AppError } = require('./errorHandler');

/**
 * @param {import('joi').Schema} schema  — Joi schema to validate against
 * @param {'body'|'query'|'params'} [target='body'] — part of req to validate
 * @param {object} [options] — Joi options overrides
 */
function validate(schema, target = 'body', options = {}) {
  return (req, res, next) => {
    const data = req[target];

    const { error, value } = schema.validate(data, {
      abortEarly:    false,          // collect all errors, not just the first
      stripUnknown:  true,           // silently remove extra fields
      allowUnknown:  false,
      ...options
    });

    if (error) {
      // Flatten Joi's details array into a readable message
      const message = error.details
        .map(d => d.message.replace(/['"]/g, ''))   // strip Joi's surrounding quotes
        .join('; ');

      return next(new AppError(message, 400));
    }

    // Replace the validated target with the stripped + coerced value
    req[target] = value;
    next();
  };
}

module.exports = { validate };
