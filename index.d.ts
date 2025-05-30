import type { Assert as BaseAssert, Constraint as BaseConstraint } from 'validator.js';

/**
 * Valid values for constraint mapping
 */
type ConstraintValue =
  | BaseAssert
  | BaseConstraint
  | Record<string, unknown>
  | Array<BaseAssert | BaseConstraint | Record<string, unknown>>
  | unknown;

/**
 * All core `validator.js` assert factories.
 */
interface CoreAssertsMap {
  /** An object must have the given property. */
  haveProperty(node: string): ConstraintValue;

  /** Alias for `haveProperty`. */
  propertyDefined(node: string): ConstraintValue;

  /** A string must be empty or only whitespace. */
  blank(): ConstraintValue;

  /** Run a custom callback that returns true on success. */
  callback(fn: (value: unknown, ...args: unknown[]) => boolean, ...args: unknown[]): ConstraintValue;

  /** Value must be one of the provided list. */
  choice(list: unknown[] | (() => unknown[])): ConstraintValue;

  /** Validate each element of an array. */
  collection(assertOrConstraint: ConstraintValue | BaseConstraint | object): ConstraintValue;

  /** Array must have exactly N items. */
  count(count: number | ((arr: unknown[]) => number)): ConstraintValue;

  /** Valid email address. */
  email(): ConstraintValue;

  /** Value must equal reference or match function. */
  equalTo(reference: unknown | ((value: unknown) => unknown)): ConstraintValue;

  /** Numeric value must be > threshold. */
  greaterThan(threshold: number): ConstraintValue;

  /** Numeric value must be ≥ threshold. */
  greaterThanOrEqual(threshold: number): ConstraintValue;

  /** Value must be `instanceof` the given class. */
  instanceOf(classRef: new (...args: unknown[]) => unknown): ConstraintValue;

  /** Value must be a string. */
  string(): ConstraintValue;

  /** String/array length must be within `[min, max]`. */
  length(boundaries: { min?: number; max?: number }): ConstraintValue;

  /** Alias for `length()`. */
  ofLength(boundaries: { min?: number; max?: number }): ConstraintValue;

  /** Numeric value must be < threshold. */
  lessThan(threshold: number): ConstraintValue;

  /** Numeric value must be ≤ threshold. */
  lessThanOrEqual(threshold: number): ConstraintValue;

  /** Value must not be null or undefined. */
  notNull(): ConstraintValue;

  /** String must contain ≥1 non-whitespace character. */
  notBlank(): ConstraintValue;

  /** Value must not equal reference or match fn. */
  notEqualTo(reference: unknown | ((value: unknown) => unknown)): ConstraintValue;

  /** Value must be exactly null. */
  null(): ConstraintValue;

  /** `Number`/`String`/`Array` must fall within `[min, max]`. */
  range(min: number, max: number): ConstraintValue;

  /** `String` must match the given `RegExp`. */
  regexp(regexp: string | RegExp, flag?: string): ConstraintValue;

  /** Value must be defined (not `undefined`). */
  required(): ConstraintValue;

  /** Array items must be unique (by `key` if given). */
  unique(opts?: { key: string }): ConstraintValue;

  /** If `context[ref]` passes `is`, run `then` else `otherwise`. */
  when(
    ref: string,
    options: {
      is: ConstraintValue | object;
      then?: ConstraintValue | object;
      otherwise?: ConstraintValue | object;
    }
  ): ConstraintValue;
}

type ExtraAssertType = {
  [key: string]: ConstraintValue;
};

/**
 * Map runtime‐passed `extraAsserts` into uncapitalized methods.
 * This can include both built‐ins *and* entirely custom keys.
 */
type ExtraAsserts<EA extends ExtraAssertType> = {
  [K in keyof EA as Uncapitalize<string & K>]: EA[K];
};

/** Callable/newable `Assert` constructor. */
interface BaseAssertStatic {
  new (group?: string | string[]): BaseAssert;
  (group?: string | string[]): BaseAssert;
}

/**
 * The full `is` API:
 *  - BaseAssert constructor.
 *  - core `validator.js` asserts.
 *  - all `validator.js-asserts` (camelCased).
 *  - any `extraAsserts` passed at runtime.
 */
type AssertStatic<EA extends ExtraAssertType> = BaseAssertStatic & CoreAssertsMap & ExtraAsserts<EA> & ExtraAssertType;

/** Map a data type to `validator.js` constraints. */
type ConstraintMapping<T> =
  | { [P in keyof T]?: ConstraintValue | ConstraintValue[] }
  | Record<string, ConstraintValue | ConstraintValue[]>;

/** `validate`/`assert` function signature. */
type ValidateFunction = <T>(data: T, constraints: ConstraintMapping<T> | Record<string, ConstraintValue>) => T;

/** Type of `Error` to pass to `AssertionError`/`ValidationError`. */
type ValidatorErrorType = new (...args: any[]) => Error;

/** Options for creating a validator. */
interface ValidatorOptions<EA extends ExtraAssertType = ExtraAssertType> {
  AssertionError?: ValidatorErrorType;
  ValidationError?: ValidatorErrorType;
  extraAsserts?: EA;
  logger?: (errors: any) => void;
  obfuscator?: (input: { errors: any }) => { errors: any };
  mask?: boolean;
}

/**
 * Base exports with just `is`.
 */
interface BaseValidatorExports<EA extends ExtraAssertType = ExtraAssertType> {
  is: AssertStatic<EA>;
}

/**
 * Exports with `assert` added when `AssertionError` is provided.
 */
interface ValidatorExportsWithAssert<EA extends ExtraAssertType = ExtraAssertType> extends BaseValidatorExports<EA> {
  assert: ValidateFunction;
}

/**
 * Exports with `validate` added when `ValidationError` is provided.
 */
interface ValidatorExportsWithValidate<EA extends ExtraAssertType = ExtraAssertType> extends BaseValidatorExports<EA> {
  validate: ValidateFunction;
}

/**
 * Exports with both `assert` and `validate` when both errors are provided.
 */
interface ValidatorExportsWithBoth<EA extends ExtraAssertType = ExtraAssertType> extends BaseValidatorExports<EA> {
  assert: ValidateFunction;
  validate: ValidateFunction;
}

/**
 * Factory function to create a `validator` instance.
 */
declare function validator<EA extends ExtraAssertType = ExtraAssertType>(
  options: ValidatorOptions<EA> & { AssertionError: ValidatorErrorType; ValidationError: ValidatorErrorType }
): ValidatorExportsWithBoth<EA>;

declare function validator<EA extends ExtraAssertType = ExtraAssertType>(
  options: ValidatorOptions<EA> & { AssertionError: ValidatorErrorType }
): ValidatorExportsWithAssert<EA>;

declare function validator<EA extends ExtraAssertType = ExtraAssertType>(
  options: ValidatorOptions<EA> & { ValidationError: ValidatorErrorType }
): ValidatorExportsWithValidate<EA>;

declare function validator<EA extends ExtraAssertType = ExtraAssertType>(
  options?: ValidatorOptions<EA>
): BaseValidatorExports<EA>;

/**
 * Export `validator`.
 */

export = validator;
