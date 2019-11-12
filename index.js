'use strict';

/**
 * Module dependencies.
 */

const { Assert: BaseAssert, Constraint, Validator } = require('validator.js');
const asserts = require('validator.js-asserts');

/**
 * No operation function.
 */

const noop = () => {};

/**
 * Validate.
 */

function validate(ValidationError, logger) {
  const validator = new Validator();

  return (data, constraints) => {
    const errors = validator.validate(data, new Constraint(constraints, { deepRequired: true }));

    if (errors !== true) {
      logger(errors);

      throw new ValidationError(errors);
    }
  };
}

/**
 * Export.
 */

module.exports = ({ AssertionError, ValidationError, extraAsserts, logger = noop } = {}) => {
  const exports = {
    is: BaseAssert.extend({ ...asserts, ...extraAsserts })
  };

  if (AssertionError) {
    exports.assert = validate(AssertionError, logger);
  }

  if (ValidationError) {
    exports.validate = validate(ValidationError, logger);
  }

  return exports;
};
