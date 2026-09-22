/**
 * Request validation middleware factory
 *
 * Usage: router.post('/route', validate(schema), handler)
 * Validates req.body against a Joi schema; returns 400 on failure.
 */

'use strict';

const Joi = require('joi');

/**
 * @param {Joi.Schema} schema - Joi schema to validate req.body against
 * @returns Express middleware
 */
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map((d) => d.message),
      });
    }
    req.body = value; // replace with sanitized value
    next();
  };
}

module.exports = validate;
