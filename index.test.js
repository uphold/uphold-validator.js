'use strict';

/**
 * Module dependencies.
 */

const { AssertionFailedError, ValidationFailedError } = require('@uphold/http-errors');
const validator = require('.');
const asserts = require('validator.js-asserts');
const _ = require('lodash');

/**
 * Extra asserts
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
  it('should expose `assert`, `is` and `validate` functions', () => {
    const { assert, is, validate } = validator({
      AssertionError: AssertionFailedError,
      ValidationError: ValidationFailedError
    });

    expect(assert).toBeInstanceOf(Function);
    expect(is).toBeInstanceOf(Function);
    expect(validate).toBeInstanceOf(Function);
  });

  it('should expose custom asserts', () => {
    const { is } = validator({
      AssertionError: AssertionFailedError,
      ValidationError: ValidationFailedError
    });

    for (const assert in asserts) {
      expect(is.prototype).toHaveProperty(assert);
    }
  });

  it('should expose extra asserts', () => {
    const { is } = validator({
      AssertionError: AssertionFailedError,
      ValidationError: ValidationFailedError,
      extraAsserts: { AlwaysInvalid, AlwaysValid }
    });

    expect(is.prototype).toHaveProperty('AlwaysValid');
    expect(is.prototype).toHaveProperty('AlwaysInvalid');
  });

  describe('assert()', () => {
    it('should throw an error if assertion fails', () => {
      const { assert, is } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError
      });

      try {
        assert({ name: 'Foo' }, { name: is.integer() });

        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(AssertionFailedError);
        expect(e.errors.name).toHaveLength(1);
        expect(e.errors.name[0].show().assert).toEqual('Integer');
      }
    });

    it('should not mask data by default', () => {
      const { is, assert } = validator({
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

      expect(assertedData).toEqual(data);
    });

    it('should mask data if `options.mask` is `true`', () => {
      const { is, assert } = validator({
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

      expect(assertedData).toEqual({ foo: 'bar' });
    });

    it('should call obfuscate', () => {
      const obfuscator = jest.fn(_.identity);
      const { is, assert } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        obfuscator
      });

      try {
        assert({}, { foo: is.required() });

        fail();
      } catch (e) {
        expect(obfuscator).toHaveBeenCalledTimes(1);
        expect(obfuscator).toHaveBeenCalledWith({ errors: e.errors });
      }
    });

    it('should call logger', () => {
      const logger = jest.fn();
      const { is, assert } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        logger
      });

      try {
        assert({}, { foo: is.required() });

        fail();
      } catch (e) {
        expect(logger).toHaveBeenCalledTimes(1);
        expect(logger).toHaveBeenCalledWith(e.errors);
      }
    });
  });

  describe('validate()', () => {
    it('should throw an error if validation fails', () => {
      const { is, validate } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError
      });

      try {
        validate({ name: 'Foo' }, { name: is.integer() });

        fail();
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationFailedError);
        expect(e.errors.name).toHaveLength(1);
        expect(e.errors.name[0].show().assert).toEqual('Integer');
      }
    });

    it('should not mask data by default', () => {
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

      expect(validatedData).toEqual({ foo: { bar: 'qux', biz: 'bar' }, qux: 'biz' });
    });

    it('should mask data if `options.mask` is `true`', () => {
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

      expect(validatedData).toEqual({ foo: 'bar' });
    });

    it('should call obfuscate', () => {
      const obfuscator = jest.fn(_.identity);
      const { is, validate } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        obfuscator
      });

      try {
        validate({}, { foo: is.required() });

        fail();
      } catch (e) {
        expect(obfuscator).toHaveBeenCalledTimes(1);
        expect(obfuscator).toHaveBeenCalledWith({ errors: e.errors });
      }
    });

    it('should call logger', () => {
      const logger = jest.fn();
      const { is, validate } = validator({
        AssertionError: AssertionFailedError,
        ValidationError: ValidationFailedError,
        logger
      });

      try {
        validate({}, { foo: is.required() });

        fail();
      } catch (e) {
        expect(logger).toHaveBeenCalledTimes(1);
        expect(logger).toHaveBeenCalledWith(e.errors);
      }
    });
  });
});
