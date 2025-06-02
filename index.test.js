'use strict';

/**
 * Module dependencies.
 */

const { AssertionFailedError, ValidationFailedError } = require('@uphold/http-errors');
const { describe, it } = require('node:test');
const _ = require('lodash');
const asserts = require('validator.js-asserts');
const validator = require('./index.js');

/**
 * Extra asserts.
 */

function AlwaysValid() {
  // eslint-disable-next-line no-underscore-dangle
  this.__class__ = 'AlwaysValid';

  this.validate = function() {
    return true;
  };

  return this;
}

function AlwaysInvalid() {
  // eslint-disable-next-line no-underscore-dangle
  this.__class__ = 'AlwaysInvalid';

  this.validate = function() {
    return false;
  };

  return this;
}

/**
 * Test `Validator`.
 */

describe('Validator', () => {
  it('should expose `assert`, `is` and `validate` functions', test => {
    const { assert, is, validate } = validator({
      AssertionError: AssertionFailedError,
      ValidationError: ValidationFailedError
    });

    test.assert.ok(assert instanceof Function);
    test.assert.ok(is instanceof Function);
    test.assert.ok(validate instanceof Function);
  });

  it('should expose custom asserts', test => {
    const { is } = validator({
      AssertionError: AssertionFailedError,
      ValidationError: ValidationFailedError
    });

    for (const assertName in asserts) {
      test.assert.deepEqual(is.prototype[assertName], asserts[assertName]);
    }
  });

  it('should expose extra asserts', test => {
    const { is } = validator({
      AssertionError: AssertionFailedError,
      ValidationError: ValidationFailedError,
      extraAsserts: { AlwaysInvalid, AlwaysValid }
    });

    test.assert.deepEqual(is.prototype.AlwaysValid, AlwaysValid);
    test.assert.deepEqual(is.prototype.AlwaysInvalid, AlwaysInvalid);
  });

  describe('assert()', () => {
    it('should throw an error if assertion fails', test => {
      const { assert, is } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError
      });

      try {
        assert({ name: 'Foo' }, { name: is.integer() });

        test.assert.fail('Expected error to be thrown');
      } catch (e) {
        test.assert.ok(e instanceof AssertionFailedError);
        test.assert.equal(e.errors.name.length, 1);
        test.assert.deepEqual(e.errors.name[0].show().assert, 'Integer');
      }
    });

    it('should not mask data by default', test => {
      const { assert, is } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError
      });
      const data = {
        foo: {
          bar: 'qux',
          biz: 'bar'
        },
        qux: 'biz'
      };
      const assertedData = assert(data, {
        foo: {
          bar: is.required(),
          biz: is.required()
        }
      });

      test.assert.deepEqual(assertedData, data);
    });

    it('should mask data if `options.mask` is `true`', test => {
      const { assert, is } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        mask: true
      });
      const data = {
        foo: 'bar',
        qux: 'biz'
      };
      const assertedData = assert(data, {
        foo: is.required()
      });

      test.assert.deepEqual(assertedData, { foo: 'bar' });
    });

    it('should call obfuscate', test => {
      const obfuscator = test.mock.fn(_.identity);
      const { assert, is } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        obfuscator
      });

      try {
        assert({}, { foo: is.required() });

        test.assert.fail('Expected error to be thrown');
      } catch (e) {
        test.assert.equal(obfuscator.mock.callCount(), 1);
        test.assert.deepEqual(obfuscator.mock.calls[0].arguments, [{ errors: e.errors }]);
      }
    });

    it('should call logger', test => {
      const logger = test.mock.fn();
      const { assert, is } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        logger
      });

      try {
        assert({}, { foo: is.required() });

        test.assert.fail('Expected error to be thrown');
      } catch (e) {
        test.assert.equal(logger.mock.callCount(), 1);
        test.assert.deepEqual(logger.mock.calls[0].arguments, [e.errors]);
      }
    });
  });

  describe('validate()', () => {
    it('should throw an error if validation fails', test => {
      const { is, validate } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError
      });

      try {
        validate({ name: 'Foo' }, { name: is.integer() });

        test.assert.fail('Expected error to be thrown');
      } catch (e) {
        test.assert.ok(e instanceof ValidationFailedError);
        test.assert.equal(e.errors.name.length, 1);
        test.assert.deepEqual(e.errors.name[0].show().assert, 'Integer');
      }
    });

    it('should not mask data by default', test => {
      const { is, validate } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError
      });
      const data = {
        foo: {
          bar: 'qux',
          biz: 'bar'
        },
        qux: 'biz'
      };
      const validatedData = validate(data, {
        foo: {
          bar: is.required(),
          biz: is.required()
        }
      });

      test.assert.deepEqual(validatedData, { foo: { bar: 'qux', biz: 'bar' }, qux: 'biz' });
    });

    it('should mask data if `options.mask` is `true`', test => {
      const { is, validate } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        mask: true
      });
      const data = {
        foo: 'bar',
        qux: 'biz'
      };
      const validatedData = validate(data, {
        foo: is.required()
      });

      test.assert.deepEqual(validatedData, { foo: 'bar' });
    });

    it('should call obfuscate', test => {
      const obfuscator = test.mock.fn(_.identity);
      const { is, validate } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        obfuscator
      });

      try {
        validate({}, { foo: is.required() });

        test.assert.fail('Expected error to be thrown');
      } catch (e) {
        test.assert.equal(obfuscator.mock.callCount(), 1);
        test.assert.deepEqual(obfuscator.mock.calls[0].arguments, [{ errors: e.errors }]);
      }
    });

    it('should call logger', test => {
      const logger = test.mock.fn();
      const { is, validate } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        logger
      });

      try {
        validate({}, { foo: is.required() });

        test.assert.fail('Expected error to be thrown');
      } catch (e) {
        test.assert.equal(logger.mock.callCount(), 1);
        test.assert.deepEqual(logger.mock.calls[0].arguments, [e.errors]);
      }
    });
  });
});
