'use strict';

/**
 * Module dependencies.
 */

const { Assert: BaseAssert, Constraint, Validator } = require('validator.js');
const asserts = require('validator.js-asserts');
const log = require('debugnyan')('validator');

/**
 * Validate.
 */

function validate(ValidationError) {
  const validator = new Validator();

  return (data, constraints) => {
    const errors = validator.validate(data, new Constraint(constraints, { deepRequired: true }));

    if (errors !== true) {
      log.warn({ errors }, 'Validation failed');

      throw new ValidationError(errors);
    }
  };
}

/**
 * Export.
 */

module.exports = ({ AssertionError, ValidationError, extraAsserts } = {}) => {
  const exports = {
    is: BaseAssert.extend({ ...asserts, ...extraAsserts })
  };

  if (AssertionError) {
    exports.assert = validate(AssertionError);
  }

  if (ValidationError) {
    exports.validate = validate(ValidationError);
  }

  return exports;
};
