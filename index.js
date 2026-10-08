'use strict';

/**
 * Module dependencies.
 */

const { Assert: BaseAssert, Constraint, Validator } = require('validator.js');
const _ = require('lodash');
const asserts = require('validator.js-asserts');
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

  // `Object.keys`, not `for…in`: the inherited enumerable properties of a constraint object are
  // not part of its schema, and including them would build a mask path that selects data the
  // caller never asked to validate.
  for (const key of Object.keys(object)) {
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
      // The obfuscator is caller-supplied and its return value was never checked. A malformed
      // return (`{}`, `undefined`, a primitive) left `obfuscated` empty, so the thrown
      // `ValidationError` carried no `errors` payload even though the `try` path reported
      // success — and every documented consumer (`e.errors.foo.map(error => error.show())`) then
      // failed with a TypeError instead of reporting the validation failure.
      const result = obfuscator({ errors });

      if (result === null || typeof result !== 'object' || typeof result.errors !== 'object' || result.errors === null) {
        throw new TypeError(
          'Expected the `obfuscator` to return an object with an `errors` object, ' +
            `but received ${_.isPlainObject(result) ? 'an object without `errors`' : typeof result}`
        );
      }

      const { errors: obfuscated } = result;

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
  mask = false,
  obfuscator = identity
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
