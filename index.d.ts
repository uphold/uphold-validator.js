import type { Assert as BaseAssert, Constraint as BaseConstraint } from 'validator.js';
import type { ValidatorJSAsserts } from 'validator.js-asserts';

/**
 * The instance‐side of an Assert (no static factory methods).
 * All core “is.X()” methods and custom asserts produce this.
 */
interface AssertInstance {
  /** Returns `true` if the value passes, otherwise returns a Violation/object. */
  check(value: unknown, group?: string | string[], context?: unknown): true | any;
  /** Throws on failure; returns `true` if the value passes. */
  validate(value: unknown, group?: string | string[], context?: unknown): true;
  /** Does this assert apply to the given validation group(s)? */
  requiresValidation(group?: string | string[]): boolean;
  /** Is this assert assigned to the given group? */
  hasGroup(group: string | string[]): boolean;
  /** Is this assert in any of the provided groups? */
  hasOneOf(groups: string[]): boolean;
  /** Does this assert belong to at least one group? */
  hasGroups(): boolean;
}

/**
 * The instance‐side of a Constraint (no static/constructor methods).
 * Mirrors the Assert API but for Constraint objects.
 */
interface ConstraintInstance extends BaseConstraint {
  /** Check if value matches the constraint */
  check(value: unknown, group?: string | string[], context?: unknown): true | any;
  /** Validate the value against the constraint */
  validate(value: unknown, group?: string | string[], context?: unknown): true;
  /** Check if the constraint requires validation */
  requiresValidation(group?: string | string[]): boolean;
  /** Check if the constraint belongs to a specific group */
  hasGroup(group: string | string[]): boolean;
  /** Check `hasGroup` over the specified groups */
  hasOneOf(groups: string[]): boolean;
  /** Check if the constraint has any groups */
  hasGroups(): boolean;
}

/**
 * Valid types that can appear in a constraint mapping:
 * - an Assert instance
 * - a Constraint instance
 * - a nested object mapping
 * - an array of any of the above
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
  /** Object must have the given property. */
  haveProperty(node: string): AssertInstance;

  /** Alias for `haveProperty`. */
  propertyDefined(node: string): AssertInstance;

  /** String must be empty or only whitespace. */
  blank(): AssertInstance;

  /** Run a custom function that returns true on success. */
  callback(fn: (value: unknown, ...args: unknown[]) => boolean, ...args: unknown[]): AssertInstance;

  /** Value must be one of the supplied list. */
  choice(list: unknown[] | (() => unknown[])): AssertInstance;

  /** Each element of an array must match the given Assert/Constraint. */
  collection(assertOrConstraint: ConstraintValue | ConstraintInstance | object): AssertInstance;

  /** Array must have exactly N items (or N computed from a function). */
  count(count: number | ((arr: unknown[]) => number)): AssertInstance;

  /** Valid email address. */
  email(): AssertInstance;

  /** Value must equal the reference or match the provided function. */
  equalTo(reference: unknown | ((value: unknown) => unknown)): AssertInstance;

  /** Numeric value must be > threshold. */
  greaterThan(threshold: number): AssertInstance;

  /** Numeric value must be ≥ threshold. */
  greaterThanOrEqual(threshold: number): AssertInstance;

  /** Value must be `instanceof` the specified class. */
  instanceOf(classRef: new (...args: unknown[]) => unknown): AssertInstance;

  /** Value must be a string. */
  string(): AssertInstance;

  /** String/array length must be within `[min, max]`. */
  length(boundaries: { min?: number; max?: number }): AssertInstance;

  /** Alias for `length()`. */
  ofLength(boundaries: { min?: number; max?: number }): AssertInstance;

  /** Numeric value must be < threshold. */
  lessThan(threshold: number): AssertInstance;

  /** Numeric value must be ≤ threshold. */
  lessThanOrEqual(threshold: number): AssertInstance;

  /** Value must not be null or undefined. */
  notNull(): AssertInstance;

  /** String must contain at least one non-whitespace character. */
  notBlank(): AssertInstance;

  /** Value must not equal the reference or match the provided function. */
  notEqualTo(reference: unknown | ((value: unknown) => unknown)): AssertInstance;

  /** Value must be exactly null. */
  null(): AssertInstance;

  /** `Number`/`String`/`Array` must lie within `[min, max]`. */
  range(min: number, max: number): AssertInstance;

  /** `String` must match the given `RegExp`. */
  regexp(regexp: string | RegExp, flag?: string): AssertInstance;

  /** Value must be defined (not `undefined`). */
  required(): AssertInstance;

  /** Array items must be unique (optionally by `key`). */
  unique(opts?: { key: string }): AssertInstance;

  /**
   * If `context[ref]` satisfies `options.is`, run `options.then`; otherwise `options.otherwise`.
   */
  when(
    ref: string,
    options: {
      is: ConstraintValue | object;
      then?: ConstraintValue | object;
      otherwise?: ConstraintValue | object;
    }
  ): AssertInstance;
}

/**
 * If the user passes an object of `extraAsserts` (e.g. `{ MyFoo: () => new FooAssert() }`),
 * this type will expose each key as a lowercase method returning `AssertInstance`.
 */
type ExtraAsserts<EA> = EA extends Record<string, any>
  ? {
      [K in keyof EA as Uncapitalize<string & K>]: () => AssertInstance;
    }
  : {};

/** Callable/newable `Assert` constructor function itself. */
interface BaseAssertStatic {
  new (group?: string | string[]): AssertInstance;
  (group?: string | string[]): AssertInstance;
}

/**
 * Everything available under `is`:
 * - The base‐factory (`new is()` or `is()`).
 * - All core `validator.js` methods (`haveProperty`, `blank`, `email`, …).
 * - All built‐in `validator.js-asserts` (via `ValidatorJSAsserts`).
 * - Any user‐passed `extraAsserts` (lowercased).
 */
type AssertStatic<EA> = BaseAssertStatic & CoreAssertsMap & ValidatorJSAsserts & ExtraAsserts<EA>;

/**
 * Given a type `T`, map each key to either:
 * - a single `ConstraintValue`, or
 * - an array of `ConstraintValue`.
 *
 * @example `{ foo: is.string(), bar: [is.required(), is.email()] }`
 */
type ConstraintMapping<T> =
  | { [P in keyof T]?: ConstraintValue | ConstraintValue[] }
  | Record<string, ConstraintValue | ConstraintValue[]>;

/** Signature of `assert(data, constraints)` or `validate(data, constraints)`. */
type ValidateFunction = <T>(data: T, constraints: ConstraintMapping<T> | Record<string, ConstraintValue>) => T;

/** Custom Error type for `AssertionError`/`ValidationError`. */
type ValidatorErrorType = new (...args: any[]) => Error;

/** You always get an `{ is: AssertStatic<EA> }` back. */
interface BaseValidatorExports<EA = any> {
  is: AssertStatic<EA>;
}

/** If `AssertionError` was passed, you also get `assert(data, …)`. */
interface ValidatorExportsWithAssert<EA = any> extends BaseValidatorExports<EA> {
  assert: ValidateFunction;
}

/** If `ValidationError` was passed, you also get `validate(data, …)`. */
interface ValidatorExportsWithValidate<EA = any> extends BaseValidatorExports<EA> {
  validate: ValidateFunction;
}

/** If both errors were passed, you get both `assert` and `validate`. */
interface ValidatorExportsWithBoth<EA = any> extends BaseValidatorExports<EA> {
  assert: ValidateFunction;
  validate: ValidateFunction;
}

/**
 * Create a new validator instance.
 * TypeScript will infer `EA` from the shape of `options.extraAsserts`.
 *
 * - If you supply both `AssertionError` and `ValidationError`, you get: `{ is, assert, validate }`
 * - If you supply only one of them, you get exactly that method plus `is`.
 * - If you supply neither, you get only `{ is }`.
 */
declare function validator<EA extends Record<string, any>>(options: {
  AssertionError: ValidatorErrorType;
  ValidationError: ValidatorErrorType;
  extraAsserts: EA;
  logger?: (errors: any) => void;
  obfuscator?: (input: { errors: any }) => { errors: any };
  mask?: boolean;
}): ValidatorExportsWithBoth<EA>;

declare function validator(options: {
  AssertionError: ValidatorErrorType;
  ValidationError: ValidatorErrorType;
  extraAsserts?: undefined;
  logger?: (errors: any) => void;
  obfuscator?: (input: { errors: any }) => { errors: any };
  mask?: boolean;
}): ValidatorExportsWithBoth<{}>;

declare function validator<EA extends Record<string, any>>(options: {
  AssertionError: ValidatorErrorType;
  extraAsserts: EA;
  logger?: (errors: any) => void;
  obfuscator?: (input: { errors: any }) => { errors: any };
  mask?: boolean;
}): ValidatorExportsWithAssert<EA>;

declare function validator(options: {
  AssertionError: ValidatorErrorType;
  extraAsserts?: undefined;
  logger?: (errors: any) => void;
  obfuscator?: (input: { errors: any }) => { errors: any };
  mask?: boolean;
}): ValidatorExportsWithAssert<{}>;

declare function validator<EA extends Record<string, any>>(options: {
  ValidationError: ValidatorErrorType;
  extraAsserts: EA;
  logger?: (errors: any) => void;
  obfuscator?: (input: { errors: any }) => { errors: any };
  mask?: boolean;
}): ValidatorExportsWithValidate<EA>;

declare function validator(options: {
  ValidationError: ValidatorErrorType;
  extraAsserts?: undefined;
  logger?: (errors: any) => void;
  obfuscator?: (input: { errors: any }) => { errors: any };
  mask?: boolean;
}): ValidatorExportsWithValidate<{}>;

declare function validator<EA extends Record<string, any>>(options?: {
  extraAsserts: EA;
  logger?: (errors: any) => void;
  obfuscator?: (input: { errors: any }) => { errors: any };
  mask?: boolean;
}): BaseValidatorExports<EA>;

declare function validator(options?: {
  extraAsserts?: undefined;
  logger?: (errors: any) => void;
  obfuscator?: (input: { errors: any }) => { errors: any };
  mask?: boolean;
}): BaseValidatorExports<{}>;

/**
 * Export `validator`.
 */

export = validator;
