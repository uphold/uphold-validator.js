'use strict';

/**
 * Module dependencies.
 */

const { Assert: BaseAssert, Constraint, Validator } = require('validator.js');
const asserts = require('validator.js-asserts');

/**
 * Identity function.
 */

const identity = arg => arg;

/**
 * No operation function.
 */

const noop = () => {};

/**
 * Validate.
 */

function validate(ValidationError, logger, obfuscator) {
  const validator = new Validator();

  return (data, constraints) => {
    const errors = validator.validate(data, new Constraint(constraints, { deepRequired: true }));

    if (errors !== true) {
      const { errors: obfuscated } = obfuscator({ errors });

      logger(obfuscated);

      throw new ValidationError(obfuscated);
    }
  };
}

/**
 * Export.
 */

module.exports = ({ AssertionError, ValidationError, extraAsserts, logger = noop, obfuscator = identity } = {}) => {
  const exports = {
    is: BaseAssert.extend({ ...asserts, ...extraAsserts })
  };

  if (AssertionError) {
    exports.assert = validate(AssertionError, logger, obfuscator);
  }

  if (ValidationError) {
    exports.validate = validate(ValidationError, logger, obfuscator);
  }

  return exports;
};
