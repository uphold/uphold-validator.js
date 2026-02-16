import type { ValidatorJSAsserts } from 'validator.js-asserts';

/**
 * Known assert class names produced by the core `validator.js` library.
 * Each assert sets `this.__class__` to one of these when instantiated
 * (e.g., `this.__class__ = 'HaveProperty'`).
 */
type CoreAssertClassName =
  | 'Assert'
  | 'HaveProperty'
  | 'Blank'
  | 'Callback'
  | 'Choice'
  | 'Collection'
  | 'Count'
  | 'Email'
  | 'EqualTo'
  | 'GreaterThan'
  | 'GreaterThanOrEqual'
  | 'InstanceOf'
  | 'IsString'
  | 'Length'
  | 'LessThan'
  | 'LessThanOrEqual'
  | 'NotNull'
  | 'NotBlank'
  | 'NotEqualTo'
  | 'Null'
  | 'Range'
  | 'Regexp'
  | 'Required'
  | 'Unique'
  | 'When';

/**
 * Assert class name — one of the core names or any custom string
 * (from `validator.js-asserts` or user-supplied extra asserts).
 */
type AssertClassName = CoreAssertClassName | (string & {});

/**
 * The plain-object summary returned by `Violation.show()`.
 *
 * @example
 * ```ts
 * violation.show();
 * // => { assert: 'HaveProperty', value: {}, violation: { value: 'tags' } }
 * ```
 */
interface ViolationShow {
  /** The `__class__` name of the assert that produced this violation (e.g., `'Integer'`, `'Required'`). */
  assert: AssertClassName;
  /** The value that was tested and failed validation. */
  value: unknown;
  /** Optional details about the violation. Only present when the assert provides extra context. */
  violation?: Record<string, unknown>;
}

/**
 * A Violation object — produced by `validator.js` when an Assert's
 * `.validate()` method fails.
 *
 * Violations carry the assert that produced them, the value that was
 * tested, and optional structured details about why the assert failed.
 *
 * Runtime shape (example from a `HaveProperty` violation):.
 *
 * ```json
 * {
 *   "__class__": "Violation",
 *   "assert": {
 *     "__class__": "HaveProperty",
 *     "__parentClass__": "Assert",
 *     "groups": [],
 *     "node": "tags"
 *   },
 *   "value": {},
 *   "violation": { "value": "tags" }
 * }
 * ```
 *
 * @example
 * ```ts
 * const result = is.integer().check('not a number');
 * if (result !== true) {
 *   result.show();
 *   // => { assert: 'Integer', value: 'not a number' }
 * }
 * ```
 */
interface Violation {
  /** Always `'Violation'` — identifies this object as a Violation instance at runtime. */
  readonly __class__: 'Violation';

  /**
   * The Assert instance that produced this violation.
   * Contains the assert's `__class__` (e.g., `'HaveProperty'`), its `groups`, and
   * any assert-specific properties (e.g., `node`, `threshold`, `reference`).
   */
  assert: AssertInstance;

  /** The value that was tested and failed validation. */
  value: unknown;

  /**
   * Optional structured details about why the assert failed.
   *
   * The shape varies by assert type:
   *
   * - `HaveProperty` → `{ value: 'propertyName' }`.
   * - `GreaterThan` → `{ threshold: 10 }`.
   * - `Choice`      → `{ choices: ['a', 'b'] }`.
   * - `Length`      → `{ min: 1 }` or `{ max: 100 }` or `{ min: 1, max: 100 }`.
   * - `Regexp`      → `{ regexp: '...', flag: 'i' }`.
   * - `Count`       → `{ count: 5 }`.
   * - `Callback`    → `{ result: false }` or `{ error: Error }`.
   */
  violation?: Record<string, unknown>;

  /**
   * Returns a plain-object summary of this violation, suitable for
   * serialisation or logging.
   */
  show(): ViolationShow;

  /**
   * Returns a human-readable string describing the violation.
   *
   * @example `'Integer assert failed for "hello"'`.
   */
  __toString(): string;

  /**
   * Extracts the single constraint/expected pair from `this.violation`.
   * Iterates the violation's keys — the last key/value pair wins.
   *
   * @returns An object with `constraint` (the key) and `expected` (the value).
   *
   * @example
   * ```ts
   * // Given violation: { threshold: 10 }.
   * v.getViolation(); // => { constraint: 'threshold', expected: 10 }
   * ```
   */
  getViolation(): { constraint: string; expected: unknown };
}

/**
 * A recursive map of validation failures, keyed by property name.
 *
 * Returned by `Constraint.check()` when validation fails
 * (returns `true` on success).
 *
 * Each property maps to:
 *
 * - A single `Violation` — when a property-level check (e.g., `HaveProperty`) fails.
 * - A `Violation[]` — when one or more asserts on that property fail.
 * - A nested `ValidationErrors` — when a nested constraint or `Collection` assert fails.
 *
 * This is also the shape of the `errors` property on thrown
 * `AssertionError` / `ValidationError` instances.
 *
 * @example
 * ```ts
 * // Single violations per field (HaveProperty).
 * {
 *   tags: Violation,
 *   userId: Violation
 * }
 *
 * // Multiple asserts on one field.
 * {
 *   name: [Violation]
 * }
 * ```
 */
type ValidationErrors = {
  [property: string]: Violation | Violation[] | ValidationErrors;
};

/**
 * The instance‐side of an Assert (no static factory methods).
 *
 * All core `is.X()` methods and custom asserts produce this.
 * At runtime every assert has `__class__`, `__parentClass__`, and `groups`
 * properties in addition to the methods below.
 */
interface AssertInstance {
  /** The assert's class name (e.g., `'Required'`, `'Integer'`, `'HaveProperty'`). Set by each assert factory. */
  readonly __class__: AssertClassName;

  /** Always `'Assert'` — the parent class identifier. */
  readonly __parentClass__: 'Assert';

  /** The validation groups this assert belongs to. Empty array means it responds to the `'Default'` group. */
  groups: string[];

  /**
   * Returns `true` if the value passes the assert, otherwise returns
   * the `Violation` that describes the failure.
   *
   * Unlike `validate()`, this method does **not** throw — it catches
   * the violation internally and returns it.
   */
  check(value: unknown, group?: string | string[], context?: unknown): true | Violation;

  /**
   * Validates the value. Returns `true` on success.
   * Throws a `Violation` on failure.
   */
  validate(value: unknown, group?: string | string[], context?: unknown): true;

  /**
   * Returns `true` if this assert should run for the given validation group(s).
   *
   * - If a group is specified and this assert is not in that group → `false`.
   * - If no group is specified and this assert has explicit groups → `false`.
   * - Otherwise → `true`.
   */
  requiresValidation(group?: string | string[]): boolean;

  /**
   * Checks whether this assert belongs to the given group.
   * All asserts respond to the `'Any'` group.
   * Asserts with no explicit groups respond to the `'Default'` group.
   */
  hasGroup(group: string | string[]): boolean;

  /** Returns `true` if this assert belongs to at least one of the provided groups. */
  hasOneOf(groups: string[]): boolean;

  /** Returns `true` if this assert has been assigned to one or more groups. */
  hasGroups(): boolean;
}

/**
 * Helper type for typing the `this` context inside a custom assert factory.
 *
 * Use this as the `this` parameter type in TypeScript assert functions.
 * For JavaScript projects, you can either:
 * - Add a companion `.d.ts` file declaring your assert's signature.
 * - Use a JSDoc `@this` tag:
 *   `@this {import('@uphold/validator.js').CustomAssertThis<'Name'>}`.
 *
 * The `ClassName` generic should match both:
 * 1. The value assigned to `this.__class__` inside the assert body.
 * 2. The PascalCase key used when registering via `extraAsserts`.
 *
 * When registered, the key is `Uncapitalize`d for the `is` method
 * (e.g., `{ ReasonDetails }` → `is.reasonDetails()`).
 *
 * Unlike `AssertInstance`, the `__class__` property is writable here,
 * allowing assignment inside the factory function body.
 *
 * @template ClassName - The assert's `__class__` string (e.g., `'ReasonDetails'`).
 *
 * @example TypeScript custom assert:
 * ```ts
 * import type { CustomAssertThis } from '@uphold/validator.js';
 * import { Violation } from 'validator.js';
 *
 * function ReasonDetails(
 *   this: CustomAssertThis<'ReasonDetails'>,
 *   analysis: TransactionAnalysis
 * ) {
 *   this.__class__ = 'ReasonDetails';
 *   this.validate = (value: unknown) => {
 *     if (!isValid(value)) throw new Violation(this, value);
 *     return true;
 *   };
 *   return this;
 * }
 *
 * const { is } = validator({ extraAsserts: { ReasonDetails } });
 * is.reasonDetails(analysis);           // Parameter typed as TransactionAnalysis
 * is.reasonDetails(analysis).__class__; // Narrowed to 'ReasonDetails'
 * ```
 *
 * @example JavaScript companion .d.ts for a custom assert:
 * ```ts
 * // node-assert.d.ts
 * import type { CustomAssertThis } from '@uphold/validator.js';
 * declare function NodeAssert(this: CustomAssertThis<'Node'>): CustomAssertThis<'Node'>;
 * export = NodeAssert;
 * ```
 */
type CustomAssertThis<ClassName extends string = string> = Omit<AssertInstance, '__class__' | 'validate' | 'check'> & {
  /** The assert's class name — writable during construction, readonly after. */
  __class__: ClassName;

  /**
   * Validation function — assign your implementation inside the factory body.
   * Accepts any signature; the framework calls it as `(value, group?, context?)`.
   */
  validate: (value: unknown, ...args: unknown[]) => true | boolean;

  /**
   * Check function — typically inherited from the base Assert and not overridden,
   * but writable here for flexibility.
   */
  check: (value: unknown, ...args: unknown[]) => true | Violation;
};

/**
 * The instance‐side of a Constraint.
 *
 * A Constraint is a named map of property → Assert(s) or nested Constraint.
 * `Constraint.check(object)` validates each property and returns `true`
 * on success or a `ValidationErrors` map on failure.
 */
interface ConstraintInstance {
  /** Always `'Constraint'` — identifies this object at runtime. */
  readonly __class__: 'Constraint';

  /** The internal nodes map: property name → Assert, Assert[], or nested Constraint. */
  nodes: Record<string, AssertInstance | AssertInstance[] | ConstraintInstance>;

  /** Options passed when the Constraint was created. */
  options: { deepRequired?: boolean; strict?: boolean };

  /**
   * Checks every property in this constraint against the given object.
   *
   * @returns `true` if all checks pass, or a `ValidationErrors` map
   *          keyed by property name.
   */
  check(object: Record<string, unknown>, group?: string | string[]): true | ValidationErrors;

  /** Adds a node (Assert, Assert[], or nested mapping) to this constraint. */
  add(node: string, object: AssertInstance | AssertInstance[] | Record<string, ConstraintValue>): this;

  /** Returns `true` if the given node exists in this constraint (or in `nodes` if provided). */
  has(node: string, nodes?: Record<string, unknown>): boolean;

  /** Gets the Assert(s) or nested Constraint for the given node name, or `placeholder` if not found. */
  get(
    node: string,
    placeholder?: AssertInstance | AssertInstance[] | ConstraintInstance | null
  ): AssertInstance | AssertInstance[] | ConstraintInstance | null;

  /** Removes a node from this constraint. */
  remove(node: string): this;

  /**
   * Returns `true` if the given property has a `Required` assert (optionally
   * searching nested constraints when `deepRequired` is `true`).
   */
  isRequired(property: string, group?: string | string[], deepRequired?: boolean): boolean;
}

/**
 * Valid types that can appear as a value in a constraint mapping.
 *
 * - A single `AssertInstance` — e.g., `is.required()`.
 * - An array of `AssertInstance` — e.g., `[is.required(), is.email()]`.
 * - A `ConstraintInstance` — a pre-built Constraint object.
 * - A nested plain object mapping (recursively the same shape) — for nested validation.
 */
type ConstraintValue = AssertInstance | AssertInstance[] | ConstraintInstance | { [key: string]: ConstraintValue };

/**
 * Converts a union type to an intersection via contravariant inference.
 *
 * @example
 * ```ts
 * UnionToIntersection<{} | string>  // => {} & string => string
 * UnionToIntersection<string | number>  // => string & number => never
 * ```
 */
type UnionToIntersection<U> = (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Extracts the phantom `__type__` brand from a constraint value.
 *
 * Branch evaluation order (first match wins):
 *
 * 1. **Phantom brand** — value has `__type__`, extract `T`.
 * 2. **Array of asserts** — extract each element's `__type__`, intersect via `UnionToIntersection`.
 *    This handles `[is.required(), is.string()]` → `{} & string` → `string`.
 * 3. **`ConstraintInstance`** — pre-built constraint, type is `Record<string, unknown>`.
 * 4. **Bare `AssertInstance`** — no phantom brand, falls back to `unknown`.
 * 5. **Nested object** — recurse into each property.
 * 6. **Fallback** — `unknown`.
 */
type InferFromConstraintValue<V> = V extends { readonly __type__: infer T }
  ? T
  : V extends readonly (infer E)[]
    ? UnionToIntersection<InferFromConstraintValue<E>>
    : V extends { readonly __class__: 'Constraint' }
      ? Record<string, unknown>
      : V extends { readonly __parentClass__: 'Assert' }
        ? unknown
        : V extends Record<string, ConstraintValue>
          ? { [K in keyof V]: InferFromConstraintValue<V[K]> }
          : unknown;

/**
 * Force TypeScript to eagerly evaluate/distribute a type, stripping `readonly` modifiers.
 *
 * This helper prevents type aliases from being preserved in their nominal form,
 * forcing structural resolution for type equality checks. The `-readonly` modifier
 * removes readonly from properties added by the `const` type parameter.
 *
 * Recursively evaluates nested objects.
 */
type Evaluate<T> = T extends infer O
  ? { -readonly [K in keyof O]: O[K] extends Record<string, unknown> ? Evaluate<O[K]> : O[K] }
  : never;

/**
 * Infers the full validated type from a constraint mapping.
 *
 * Given a constraints object like:
 * ```ts
 * { name: [is.required(), is.string()], age: is.integer() }
 * ```
 * Produces: `{ name: string; age: number }`.
 *
 * @template C - The constraint mapping object type.
 */
type InferValidatedType<C extends Record<string, ConstraintValue>> = Evaluate<{
  [K in keyof C]: InferFromConstraintValue<C[K]>;
}>;

/**
 * Applies the phantom `__type__` narrowing from a single constraint to the original property type.
 *
 * Uses **intersection** (`Original & Phantom`) so that:
 *
 * - `is.string()` (`__type__: string`): `(string | undefined) & string` → `string`.
 * - `is.required()` (`__type__: {}`): `(string | undefined) & {}` → `string`.
 * - `is.integer()` (`__type__: number`): `(number | undefined) & number` → `number`.
 *
 * For arrays of asserts, extracts and intersects all phantom types via `UnionToIntersection`.
 * For nested object constraints, recurses into sub-properties.
 *
 * Branch evaluation order (first match wins):
 *
 * 1. **Single assert with phantom brand** — intersect `Original & T`.
 * 2. **Array of asserts** — extract each element's `__type__`, intersect all via `UnionToIntersection`.
 * 3. **`ConstraintInstance`** — pre-built constraint, no narrowing (returns `Original`).
 * 4. **Bare `AssertInstance`** — no phantom brand, no narrowing (returns `Original`).
 * 5. **Nested object** — recurse into sub-properties via `NarrowByConstraints`.
 * 6. **Fallback** — returns `Original` unchanged.
 */
type ApplyNarrowing<Original, Constraint> = Constraint extends { readonly __type__: infer N }
  ? Original & N
  : Constraint extends readonly (infer E)[]
    ? Original & UnionToIntersection<E extends { readonly __type__: infer N } ? N : unknown>
    : Constraint extends { readonly __class__: 'Constraint' }
      ? Original
      : Constraint extends { readonly __parentClass__: 'Assert' }
        ? Original
        : Constraint extends Record<string, ConstraintValue>
          ? Original extends Record<string, unknown>
            ? NarrowByConstraints<Original, Constraint>
            : Original
          : Original;

/**
 * Narrows each property of `T` based on the constraint mapping `C`.
 *
 * For each key in `T` that also exists in `C`, applies `ApplyNarrowing`
 * to intersect the original property type with the constraint's phantom brand.
 * Keys not present in `C` retain their original type unchanged.
 *
 * Falls through to `T` unchanged when `T` is `any` (detected via `0 extends 1 & T`).
 *
 * @template T - The original data type (e.g., a domain entity).
 * @template C - The constraint mapping with phantom `__type__` brands.
 *
 * @example
 * ```ts
 * type Original = { name: string | undefined; age: number | undefined };
 * type Constraints = { name: AssertInstance & { __type__: string }; age: AssertInstance & { __type__: number } };
 * type Result = NarrowByConstraints<Original, Constraints>;
 * // => { name: string; age: number }
 * ```
 */

type NarrowByConstraints<T, C> = 0 extends 1 & T
  ? T
  : Evaluate<{ [K in keyof T]: K extends keyof C ? ApplyNarrowing<T[K], C[K]> : T[K] }>;

/**
 * All core `validator.js` assert factories.
 *
 * These are the built-in asserts from the `validator.js` library,
 * exposed as camelCase methods on `is` (e.g., `is.haveProperty('foo')`).
 *
 * Each method's return type includes a phantom `__type__` brand that carries
 * the validated type through the type system for automatic return type inference.
 */
interface BaseValidatorJSAsserts {
  /** Object must have the given property. Throws `HaveProperty` violation if missing. */
  haveProperty(node: string): AssertInstance & { readonly __type__: unknown };

  /** Alias for `haveProperty`. */
  propertyDefined(node: string): AssertInstance & { readonly __type__: unknown };

  /** String must be empty or contain only whitespace. Throws `Blank` violation otherwise. */
  blank(): AssertInstance & { readonly __type__: string };

  /**
   * Run a custom callback function that returns `true` on success.
   * Additional arguments are forwarded to the callback after the value.
   * Throws `Callback` violation with `{ result }` or `{ error }` on failure.
   */
  callback(
    fn: (value: unknown, ...args: unknown[]) => boolean,
    ...args: unknown[]
  ): AssertInstance & { readonly __type__: unknown };

  /**
   * Value must be one of the supplied choices.
   * Accepts a static array or a function returning an array.
   * Throws `Choice` violation with `{ choices: [...] }` on failure.
   */
  choice(list: unknown[] | (() => unknown[])): AssertInstance & { readonly __type__: unknown };

  /**
   * Each element of an array must pass the given Assert or Constraint.
   * Throws `Collection` violation if the value is not an array.
   * Returns a `ValidationErrors` map indexed by array position for
   * elements that fail.
   */
  collection(
    assertOrConstraint: AssertInstance | ConstraintInstance | { [key: string]: ConstraintValue }
  ): AssertInstance & { readonly __type__: unknown[] };

  /**
   * Array must have exactly `count` items.
   * Accepts a number or a function that computes the expected count from the array.
   * Throws `Count` violation with `{ count }` on failure.
   */
  count(count: number | ((arr: unknown[]) => number)): AssertInstance & { readonly __type__: unknown[] };

  /** Valid email address (regex-based). Throws `Email` violation on failure. */
  email(): AssertInstance & { readonly __type__: string };

  /**
   * Value must equal the reference value.
   * Accepts a static value or a function that computes the expected value.
   * Throws `EqualTo` violation with `{ value: reference }` on failure.
   */
  equalTo(reference: unknown | ((value: unknown) => unknown)): AssertInstance & { readonly __type__: unknown };

  /**
   * Numeric value must be strictly greater than the threshold.
   * Throws `GreaterThan` violation with `{ threshold }` on failure.
   */
  greaterThan(threshold: number): AssertInstance & { readonly __type__: number };

  /**
   * Numeric value must be greater than or equal to the threshold.
   * Throws `GreaterThanOrEqual` violation with `{ threshold }` on failure.
   */
  greaterThanOrEqual(threshold: number): AssertInstance & { readonly __type__: number };

  /**
   * Value must be an `instanceof` the specified class.
   * Throws `InstanceOf` violation with `{ classRef }` on failure.
   */
  instanceOf(classRef: new (...args: unknown[]) => unknown): AssertInstance & { readonly __type__: unknown };

  /** Value must be a string. Throws `IsString` violation on failure. */
  string(): AssertInstance & { readonly __type__: string };

  /**
   * String or array length must be within the given `[min, max]` boundaries.
   * At least one of `min` or `max` must be specified.
   * Throws `Length` violation with `{ min }` and/or `{ max }` on failure.
   */
  length(boundaries: { min?: number; max?: number }): AssertInstance & { readonly __type__: string | unknown[] };

  /** Alias for `length()`. */
  ofLength(boundaries: { min?: number; max?: number }): AssertInstance & { readonly __type__: string | unknown[] };

  /**
   * Numeric value must be strictly less than the threshold.
   * Throws `LessThan` violation with `{ threshold }` on failure.
   */
  lessThan(threshold: number): AssertInstance & { readonly __type__: number };

  /**
   * Numeric value must be less than or equal to the threshold.
   * Throws `LessThanOrEqual` violation with `{ threshold }` on failure.
   */
  lessThanOrEqual(threshold: number): AssertInstance & { readonly __type__: number };

  /** Value must not be `null` or `undefined`. Throws `NotNull` violation on failure. */
  /* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
  notNull(): AssertInstance & { readonly __type__: {} };

  /** String must contain at least one non-whitespace character. Throws `NotBlank` violation on failure. */
  notBlank(): AssertInstance & { readonly __type__: string };

  /**
   * Value must not equal the reference.
   * Accepts a static value or a function that computes the reference.
   * Throws `NotEqualTo` violation with `{ value: reference }` on failure.
   */
  notEqualTo(reference: unknown | ((value: unknown) => unknown)): AssertInstance & { readonly __type__: unknown };

  /** Value must be exactly `null`. Throws `Null` violation on failure. */
  null(): AssertInstance & { readonly __type__: null };

  /**
   * Number, string, or array must lie within `[min, max]`.
   * For strings/arrays, validates length; for numbers, validates the value itself.
   * Throws `Range` violation on failure.
   */
  range(min: number, max: number): AssertInstance & { readonly __type__: number | string | unknown[] };

  /**
   * String must match the given regular expression.
   * Throws `Regexp` violation with `{ regexp, flag }` on failure.
   */
  regexp(regexp: string | RegExp, flag?: string): AssertInstance & { readonly __type__: string };

  /**
   * Value must be defined (not `undefined`). Throws `Required` violation on failure.
   *
   * Phantom type is `{}` (non-null non-undefined) rather than `unknown` to prevent
   * union collapse in arrays: `UnionToIntersection<{} | string>` = `string`,
   * whereas `UnionToIntersection<unknown>` = `unknown`.
   */
  /* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
  required(): AssertInstance & { readonly __type__: {} };

  /**
   * Array items must be unique (optionally compared by a `key` property on each element).
   * Throws `Unique` violation with `{ value }` on failure.
   */
  unique(opts?: { key: string }): AssertInstance & { readonly __type__: unknown[] };

  /**
   * Conditional assert: if `context[ref]` satisfies `options.is`, run `options.then`;
   * otherwise run `options.otherwise`.
   *
   * At least one of `then` or `otherwise` must be provided.
   * Each can be a Constraint, Assert, or plain object mapping.
   */
  when(
    ref: string,
    options: {
      is: ConstraintValue;
      then?: ConstraintValue;
      otherwise?: ConstraintValue;
    }
  ): AssertInstance & { readonly __type__: unknown };
}

/**
 * Type narrowing overrides for all `validator.js-asserts` methods.
 *
 * These override the return types from `ValidatorJSAsserts<AssertInstance>` to include
 * phantom `__type__` brands for automatic return type inference by `NarrowByConstraints`.
 *
 * Methods listed here have their original signatures from `ValidatorJSAsserts` replaced
 * in `AssertStatic` via `Omit` + intersection, so the phantom brand takes effect
 * when the assert is used inside a constraint mapping.
 */
interface NarrowingValidatorJSAsserts {
  /** Value is a boolean. Narrows to `boolean`. */
  boolean(): AssertInstance & { readonly __type__: boolean };

  /** Valid integer. Narrows to `number`. */
  integer(): AssertInstance & { readonly __type__: number };

  /** Valid email address (extended). Narrows to `string`. */
  email(): AssertInstance & { readonly __type__: string };

  /** Value is an IP address. Narrows to `string`. */
  ip(): AssertInstance & { readonly __type__: string };

  /** Value is a JSON string. Narrows to `string`. */
  json(): AssertInstance & { readonly __type__: string };

  /** Value is a plain object. Narrows to `Record<string, unknown>`. */
  plainObject(): AssertInstance & { readonly __type__: Record<string, unknown> };

  /** Valid UUID. Narrows to `string`. */
  uuid(version?: '3' | '4' | '5' | '7' | 'max' | 'nil'): AssertInstance & { readonly __type__: string };

  /** Value is not empty. Narrows to `{}` (non-nullish). */
  /* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
  notEmpty(): AssertInstance & { readonly __type__: {} };

  /** Value is null or a boolean. Narrows to `boolean | null`. */
  nullOrBoolean(): AssertInstance & { readonly __type__: boolean | null };

  /** Value is null or a string. Narrows to `string | null`. */
  nullOrString(boundaries?: { min?: number; max?: number }): AssertInstance & { readonly __type__: string | null };

  /** Valid hash string. Narrows to `string`. */
  hash(algorithm: 'sha1' | 'sha256' | 'sha512'): AssertInstance & { readonly __type__: string };

  /** Valid Canadian ZIP code. Narrows to `string`. */
  caZipCode(): AssertInstance & { readonly __type__: string };

  /** Valid US ZIP code. Narrows to `string`. */
  usZipCode(): AssertInstance & { readonly __type__: string };

  /** Valid credit card number. Narrows to `string`. */
  creditCard(): AssertInstance & { readonly __type__: string };

  /** Valid CPF number. Narrows to `string`. */
  cpfNumber(): AssertInstance & { readonly __type__: string };

  /** Valid CURP number. Narrows to `string`. */
  curpNumber(): AssertInstance & { readonly __type__: string };

  /** Valid RFC number. Narrows to `string`. */
  rfcNumber(): AssertInstance & { readonly __type__: string };

  /** Valid ABA routing number. Narrows to `string`. */
  abaRoutingNumber(): AssertInstance & { readonly __type__: string };

  /** Valid BIC code. Narrows to `string`. */
  bankIdentifierCode(): AssertInstance & { readonly __type__: string };

  /** Valid IBAN. Narrows to `string`. */
  internationalBankAccountNumber(): AssertInstance & { readonly __type__: string };

  /** Valid ISO 3166 country code. Narrows to `string`. */
  iso3166Country(): AssertInstance & { readonly __type__: string };

  /** Valid TIN. Narrows to `string`. */
  taxpayerIdentificationNumber(): AssertInstance & { readonly __type__: string };

  /** Valid phone number. Narrows to `string`. */
  phone(options?: { countryCode?: string }): AssertInstance & { readonly __type__: string };

  /** Valid URI. Narrows to `string`. */
  uri(constraints?: Record<string, unknown>): AssertInstance & { readonly __type__: string };

  /** Valid US subdivision code. Narrows to `string`. */
  usSubdivision(options?: { categories?: string[]; alpha2Only?: boolean }): AssertInstance & {
    readonly __type__: string;
  };

  /** Run a custom callback function with class name. No narrowing. */
  callback(fn: (value: unknown) => boolean, customClass: string): AssertInstance & { readonly __type__: unknown };

  /** Valid `BigNumber`. Narrows to `string | number`. */
  bigNumber(options?: { validateSignificantDigits?: boolean }): AssertInstance & {
    readonly __type__: string | number;
  };

  /** `BigNumber` equal to the given value. Narrows to `string | number`. */
  bigNumberEqualTo(
    value: string | number,
    options?: { validateSignificantDigits?: boolean }
  ): AssertInstance & { readonly __type__: string | number };

  /** `BigNumber` > threshold. Narrows to `string | number`. */
  bigNumberGreaterThan(
    threshold: string | number,
    options?: { validateSignificantDigits?: boolean }
  ): AssertInstance & { readonly __type__: string | number };

  /** `BigNumber` ≥ threshold. Narrows to `string | number`. */
  bigNumberGreaterThanOrEqualTo(
    threshold: string | number,
    options?: { validateSignificantDigits?: boolean }
  ): AssertInstance & { readonly __type__: string | number };

  /** `BigNumber` < threshold. Narrows to `string | number`. */
  bigNumberLessThan(
    threshold: string | number,
    options?: { validateSignificantDigits?: boolean }
  ): AssertInstance & { readonly __type__: string | number };

  /** `BigNumber` ≤ threshold. Narrows to `string | number`. */
  bigNumberLessThanOrEqualTo(
    threshold: string | number,
    options?: { validateSignificantDigits?: boolean }
  ): AssertInstance & { readonly __type__: string | number };

  /** Valid date (with optional format). Narrows to `string | Date`. */
  date(options?: { format?: string }): AssertInstance & { readonly __type__: string | Date };

  /** Date difference > threshold. Narrows to `string | Date`. */
  dateDiffGreaterThan(
    threshold: number,
    options?: { absolute?: boolean; asFloat?: boolean; fromDate?: Date | string | null; unit?: string }
  ): AssertInstance & { readonly __type__: string | Date };

  /** Date difference ≥ threshold. Narrows to `string | Date`. */
  dateDiffGreaterThanOrEqualTo(
    threshold: number,
    options?: { absolute?: boolean; asFloat?: boolean; fromDate?: Date | string | null; unit?: string }
  ): AssertInstance & { readonly __type__: string | Date };

  /** Date difference < threshold. Narrows to `string | Date`. */
  dateDiffLessThan(
    threshold: number,
    options?: { absolute?: boolean; asFloat?: boolean; fromDate?: Date | string | null; unit?: string }
  ): AssertInstance & { readonly __type__: string | Date };

  /** Date difference ≤ threshold. Narrows to `string | Date`. */
  dateDiffLessThanOrEqualTo(
    threshold: number,
    options?: { absolute?: boolean; asFloat?: boolean; fromDate?: Date | string | null; unit?: string }
  ): AssertInstance & { readonly __type__: string | Date };

  /** Value is null or a date. Narrows to `Date | null`. */
  nullOrDate(): AssertInstance & { readonly __type__: Date | null };

  /** Value is null or passes the provided assert. No narrowing (runtime-only). */
  nullOr(assert: AssertInstance): AssertInstance & { readonly __type__: unknown };

  /** Object has exactly the specified keys. Narrows to `Record<string, unknown>`. */
  equalKeys(...keys: string[] | [string[]]): AssertInstance & { readonly __type__: Record<string, unknown> };

  /** Valid UK bank account with modulus checking. Narrows to `string`. */
  ukModulusChecking(): AssertInstance & { readonly __type__: string };
}

/**
 * Maps user-supplied extra asserts to `Uncapitalize`d method names on `is`.
 *
 * The `_prettify` function in `validator.js` converts `PascalCase` prototype
 * methods to `camelCase` static methods, so `AlwaysValid` becomes `is.alwaysValid()`.
 *
 * - Function parameter types are preserved from the assert factory signature.
 * - The `__class__` property is narrowed to the PascalCase key name.
 * - TypeScript `this` parameters are automatically stripped from the signature.
 *
 * @example
 * ```ts
 * const { is } = validator({
 *   extraAsserts: { ReasonDetails, Node: NodeAssert }
 * });
 *
 * is.reasonDetails(analysis);           // Parameter type inferred
 * is.reasonDetails(analysis).__class__; // Narrowed to 'ReasonDetails'
 * is.node().__class__;                  // Narrowed to 'Node'
 * ```
 */
type ExtraAsserts<EA> =
  EA extends Record<string, unknown>
    ? {
        [K in keyof EA as Uncapitalize<string & K>]: EA[K] extends (...args: infer A) => unknown
          ? (...args: A) => AssertInstance & { readonly __class__: string & K } & { readonly __type__: unknown }
          : () => AssertInstance & { readonly __class__: string & K } & { readonly __type__: unknown };
      }
    : Record<string, never>;

/** Callable/newable `Assert` constructor — `new is()` or `is()` creates a bare `AssertInstance`. */
interface BaseAssertStatic {
  new (group?: string | string[]): AssertInstance;
  (group?: string | string[]): AssertInstance;
}

/**
 * The full shape of the `is` export.
 *
 * - The base factory (`new is()` or `is()`) for creating bare asserts with groups.
 * - All core `validator.js` assert factories (`haveProperty`, `blank`, `email`, …).
 * - All `validator.js-asserts` extra asserts (`integer`, `boolean`, `uuid`, …).
 * - Any user-supplied `extraAsserts`, exposed as `Uncapitalize`d methods.
 *
 * The `callback` assert from `validator.js-asserts` takes priority over the core one
 * (it accepts a custom class name as the second parameter), hence the `Omit`.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
type AssertStatic<EA = {}> = BaseAssertStatic &
  Omit<BaseValidatorJSAsserts, 'callback'> &
  Omit<ValidatorJSAsserts<AssertInstance>, keyof NarrowingValidatorJSAsserts> &
  NarrowingValidatorJSAsserts &
  ExtraAsserts<EA>;

/**
 * The constraint mapping passed to `validate()` / `assert()`.
 *
 * Maps each property of `T` to a `ConstraintValue`.
 *
 * @example
 * ```ts
 * validate(data, {
 *   tags: [is.required(), is.collection(is.string())],
 *   userId: [is.required(), is.integer()],
 *   address: {
 *     street: is.required(),
 *     zip: is.usZipCode(),
 *   },
 * });
 * ```
 */
type ConstraintMapping<T = Record<string, unknown>> =
  | { [P in keyof T]?: ConstraintValue }
  | Record<string, ConstraintValue>;

/**
 * Signature of `assert(data, constraints)` and `validate(data, constraints)`.
 *
 * Two overloads:
 *
 * 1. **Inferred** (default) — phantom `__type__` brands on each assert are extracted
 *    and composed into the return type automatically. Uses `const` type parameter
 *    to preserve the narrow constraint types.
 *
 * 2. **Explicit `<T>`** — backward-compatible overload for callers that provide an
 *    explicit type parameter: `validate<User>(data, constraints)`.
 *
 * - On success, returns the original `data` (or masked subset when `mask: true`).
 * - On failure, throws the configured Error with `errors: ValidationErrors`.
 */
type ValidateFunction = {
  /**
   * **Automatic inference** — resolves the return type from the data type and
   * constraint phantom brands.
   *
   * - If `T` is a concrete type (not `{}` or `unknown`) and shares keys with `C`,
   *   each matching property is **narrowed** via intersection (`T[K] & __type__`)
   *   using `NarrowByConstraints`. This is the "data-type-aware" path.
   * - Otherwise, the return type is **inferred entirely from the constraints**
   *   using `InferValidatedType`. This is the "constraint-only" path and is
   *   triggered when `data` is untyped (`unknown`) or an empty literal `{}`.
   *
   * @example Data-type-aware narrowing:
   * ```ts
   * type User = { name: string | undefined; age: number | undefined };
   * const user: User = { name: 'Alice', age: 30 };
   * const result = validate(user, { name: is.string(), age: is.integer() });
   * // result: { name: string; age: number }
   * ```
   *
   * @example Constraint-only inference:
   * ```ts
   * const result = validate(data, { age: is.integer(), name: is.string() });
   * // result: { age: number; name: string }
   * ```
   */
  <T, const C extends Record<string, ConstraintValue>>(
    data: T,
    constraints: C
  ): T extends Record<string, unknown>
    ? [Extract<keyof C, keyof T>] extends [never]
      ? InferValidatedType<C>
      : NarrowByConstraints<T, C>
    : InferValidatedType<C>;

  /**
   * **Explicit type parameter** — backward-compatible overload for callers
   * that provide an explicit type parameter: `validate<User>(data, constraints)`.
   */
  <T>(data: unknown, constraints: Record<string, ConstraintValue>): T;
};

/**
 * An Error constructor / class that accepts a `ValidationErrors` map as its
 * first argument.
 *
 * The thrown error is expected to expose the validation failures (typically
 * as an `errors` property), but the exact shape depends on the Error class
 * supplied by the consumer (e.g., `AssertionFailedError`, `ValidationFailedError`).
 *
 * Uses a broad constructor signature to accommodate Error subclasses from
 * packages without TypeScript declarations (e.g., `standard-http-error`),
 * where the full prototype chain may not be statically resolvable.
 *
 * @example
 * ```ts
 * class ValidationFailedError extends Error {
 *   errors: ValidationErrors;
 *   constructor(errors: ValidationErrors) {
 *     super('Validation Failed');
 *     this.errors = errors;
 *   }
 * }
 * ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValidatorErrorType = new (...args: any[]) => object;

/**
 * A logging function called with the (potentially obfuscated) validation errors
 * just before the error is thrown. Defaults to a no-op.
 */
type ValidatorLogger = (errors: ValidationErrors) => void;

/**
 * An obfuscation function that can transform/redact the `errors` map before
 * it is passed to the logger and to the Error constructor.
 * Must return an object with the same `{ errors }` shape.
 * Defaults to the identity function.
 */
type ValidatorObfuscator = (input: { errors: ValidationErrors }) => { errors: ValidationErrors };

/**
 * Common options shared by all overloads of the `validator()` factory.
 */
interface ValidatorBaseOptions {
  /**
   * Called with the (optionally obfuscated) `ValidationErrors` map just before
   * the configured Error is thrown. Useful for logging validation failures.
   *
   * @default No-op.
   */
  logger?: ValidatorLogger;

  /**
   * Transform / redact the errors map before it is passed to the logger
   * and to the Error constructor. Must return `{ errors: ... }`.
   *
   * @default Identity function.
   */
  obfuscator?: ValidatorObfuscator;

  /**
   * When `true`, the returned data is masked to only include the properties
   * present in the constraint mapping (using `json-mask`).
   *
   * @default false.
   */
  mask?: boolean;
}

/** Base export — you always get `is` (the assert factory). */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface BaseValidatorExports<EA = {}> {
  /** The assert factory with all built-in, extra, and custom asserts. */
  is: AssertStatic<EA>;
}

/** When `AssertionError` is provided, `assert()` is also exported. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ValidatorExportsWithAssert<EA = {}> extends BaseValidatorExports<EA> {
  /**
   * Validates data against the constraint mapping.
   * Throws the configured `AssertionError` on failure with a `ValidationErrors` payload.
   * Returns the (optionally masked) data on success.
   */
  assert: ValidateFunction;
}

/** When `ValidationError` is provided, `validate()` is also exported. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ValidatorExportsWithValidate<EA = {}> extends BaseValidatorExports<EA> {
  /**
   * Validates data against the constraint mapping.
   * Throws the configured `ValidationError` on failure with a `ValidationErrors` payload.
   * Returns the (optionally masked) data on success.
   */
  validate: ValidateFunction;
}

/** When both error types are provided, both `assert()` and `validate()` are exported. */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface ValidatorExportsWithBoth<EA = {}> extends BaseValidatorExports<EA> {
  /** Validates data; throws `AssertionError` on failure. */
  assert: ValidateFunction;
  /** Validates data; throws `ValidationError` on failure. */
  validate: ValidateFunction;
}

/**
 * Create a new validator instance.
 *
 * TypeScript will infer `EA` from the shape of `options.extraAsserts`.
 * The return type depends on which Error constructors are supplied:
 *
 * - Both `AssertionError` + `ValidationError` → `{ is, assert, validate }`.
 * - Only `AssertionError` → `{ is, assert }`.
 * - Only `ValidationError` → `{ is, validate }`.
 * - Neither → `{ is }`.
 *
 * @param options - Configuration for the validator instance.
 * @returns The validator exports object.
 */
declare function validator<EA extends Record<string, unknown>>(
  options: {
    AssertionError: ValidatorErrorType;
    ValidationError: ValidatorErrorType;
    extraAsserts: EA;
  } & ValidatorBaseOptions
): ValidatorExportsWithBoth<EA>;

declare function validator(
  options: {
    AssertionError: ValidatorErrorType;
    ValidationError: ValidatorErrorType;
    extraAsserts?: undefined;
  } & ValidatorBaseOptions
): ValidatorExportsWithBoth;

declare function validator<EA extends Record<string, unknown>>(
  options: {
    AssertionError: ValidatorErrorType;
    extraAsserts: EA;
  } & ValidatorBaseOptions
): ValidatorExportsWithAssert<EA>;

declare function validator(
  options: {
    AssertionError: ValidatorErrorType;
    extraAsserts?: undefined;
  } & ValidatorBaseOptions
): ValidatorExportsWithAssert;

declare function validator<EA extends Record<string, unknown>>(
  options: {
    ValidationError: ValidatorErrorType;
    extraAsserts: EA;
  } & ValidatorBaseOptions
): ValidatorExportsWithValidate<EA>;

declare function validator(
  options: {
    ValidationError: ValidatorErrorType;
    extraAsserts?: undefined;
  } & ValidatorBaseOptions
): ValidatorExportsWithValidate;

declare function validator<EA extends Record<string, unknown>>(
  options: {
    extraAsserts: EA;
  } & ValidatorBaseOptions
): BaseValidatorExports<EA>;

declare function validator(options?: ValidatorBaseOptions): BaseValidatorExports;

export = validator;

/**
 * Re-export all types for external use.
 *
 * Attached to the `validator` namespace so they are accessible
 * from CJS consumers via `import type { ... } from '@uphold/validator.js'`
 * without conflicting with `export =`.
 */
declare namespace validator {
  export {
    /** Any assert class name (core or custom). */
    AssertClassName,
    /** The instance produced by assert factories like `is.required()`. */
    AssertInstance,
    /** The static assert class like `is`. */
    AssertStatic,
    /** Base exports (just `is`). */
    BaseValidatorExports,
    /** The instance produced by `new Constraint(mapping)`. */
    ConstraintInstance,
    /** The constraint mapping passed to `validate()` / `assert()`. */
    ConstraintMapping,
    /** A value in a constraint mapping — Assert, Assert[], Constraint, or nested mapping. */
    ConstraintValue,
    /** Known core assert class names from `validator.js`. */
    CoreAssertClassName,
    /** Helper for typing `this` inside custom assert factory functions. */
    CustomAssertThis,
    /** Extracts the phantom `__type__` brand from a constraint value. */
    InferFromConstraintValue,
    /** Infers the full validated type from a constraint mapping. */
    InferValidatedType,
    /** Narrows each property of T based on constraint phantom brands. */
    NarrowByConstraints,
    /** Applies a single constraint's phantom narrowing to a property type. */
    ApplyNarrowing,
    /** Type narrowing overrides for validator.js-asserts methods. */
    NarrowingValidatorJSAsserts,
    /** Converts a union type to an intersection via contravariant inference. */
    UnionToIntersection,
    /** Signature of the `validate()` and `assert()` functions. */
    ValidateFunction,
    /** Recursive map of validation failures keyed by property name. */
    ValidationErrors,
    /** Common validator options. */
    ValidatorBaseOptions,
    /** An Error constructor accepting `ValidationErrors`. */
    ValidatorErrorType,
    /** Exports when both error types are provided. */
    ValidatorExportsWithBoth,
    /** Exports when only AssertionError is provided. */
    ValidatorExportsWithAssert,
    /** Exports when only ValidationError is provided. */
    ValidatorExportsWithValidate,
    /** Logger callback type. */
    ValidatorLogger,
    /** Obfuscator callback type. */
    ValidatorObfuscator,
    /** A single validation violation — returned by `Assert.check()` on failure. */
    Violation,
    /** The plain-object summary from `Violation.show()`. */
    ViolationShow
  };
}
