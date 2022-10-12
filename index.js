'use strict';

/**
 * Module dependencies.
 */

const { Assert: BaseAssert, Constraint, Validator } = require('validator.js');
const asserts = require('validator.js-asserts');
const _ = require('lodash');
const maskObject = require('json-mask');

/**
 * Identity function.
 */

const identity = arg => arg;

/**
 * No operation function.
 */

const noop = () => {};

/**
 * Get mask from object.
 */

function getMask(object) {
  const mask = [];

  for (const key in object) {
    if (_.isPlainObject(object[key])) {
      mask.push(`${key}(${getMask(object[key])})`);
    } else {
      mask.push(key);
    }
  }

  return mask.join(',');
}

/**
 * Validate.
 */

function validate(ValidationError, logger, obfuscator, mask) {
  const validator = new Validator();

  return (data, constraints) => {
    if (mask) {
      const keys = getMask(constraints);

      data = maskObject(data, keys) || {};
    }

    const errors = validator.validate(data, new Constraint(constraints, { deepRequired: true }));

    if (errors !== true) {
      const { errors: obfuscated } = obfuscator({ errors });

      logger(obfuscated);

      throw new ValidationError(obfuscated);
    }

    return data;
  };
}

/**
 * Export.
 */

module.exports = ({
  AssertionError,
  ValidationError,
  extraAsserts,
  logger = noop,
  obfuscator = identity,
  mask = false
} = {}) => {
  const exports = {
    is: BaseAssert.extend({ ...asserts, ...extraAsserts })
  };

  if (AssertionError) {
    exports.assert = validate(AssertionError, logger, obfuscator, mask);
  }

  if (ValidationError) {
    exports.validate = validate(ValidationError, logger, obfuscator, mask);
  }

  return exports;
};
