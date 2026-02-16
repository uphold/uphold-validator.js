/**
 * Type-level tests for phantom type brand inference.
 *
 * These tests run at compile time using `tsc --noEmit`.
 * If any test fails, TypeScript will report a type error.
 */

/* eslint-disable no-underscore-dangle, @typescript-eslint/no-empty-object-type */

import type { AssertInstance, AssertStatic, InferFromConstraintValue, ValidateFunction } from './index';

/**
 * Type equality helper.
 *
 * Two conditional types with the same structure but different tested types
 * will have different function signatures, making the `extends` check fail.
 * This exploits TypeScript's structural type system to detect type inequality.
 */
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

/** Compile-time assertion — fails if `T` is not `true`. */
type Expect<T extends true> = T;

/**
 * Mock assert static for testing.
 * In real usage, this would be imported from the validator factory.
 */
declare const is: AssertStatic;

/**
 * Mock validate function for testing.
 * In real usage, this would be imported from the validator factory.
 */
declare const validate: ValidateFunction;

// =============================================================================
// Test 1: Phantom brand extraction from individual asserts
// =============================================================================.

type _t1_string = Expect<Equal<ReturnType<typeof is.string>['__type__'], string>>;
type _t2_integer = Expect<Equal<ReturnType<typeof is.integer>['__type__'], number>>;
type _t3_boolean = Expect<Equal<ReturnType<typeof is.boolean>['__type__'], boolean>>;
type _t4_email = Expect<Equal<ReturnType<typeof is.email>['__type__'], string>>;
type _t5_uuid = Expect<Equal<ReturnType<typeof is.uuid>['__type__'], string>>;
type _t6_nullOrString = Expect<Equal<ReturnType<typeof is.nullOrString>['__type__'], string | null>>;
type _t7_nullOrBoolean = Expect<Equal<ReturnType<typeof is.nullOrBoolean>['__type__'], boolean | null>>;
type _t8_plainObject = Expect<Equal<ReturnType<typeof is.plainObject>['__type__'], Record<string, unknown>>>;
type _t9_greaterThan = Expect<Equal<ReturnType<typeof is.greaterThan>['__type__'], number>>;
type _t10_collection = Expect<Equal<ReturnType<typeof is.collection>['__type__'], unknown[]>>;
type _t11_required = Expect<Equal<ReturnType<typeof is.required>['__type__'], {}>>;
type _t12_notNull = Expect<Equal<ReturnType<typeof is.notNull>['__type__'], {}>>;
type _t13_null = Expect<Equal<ReturnType<typeof is.null>['__type__'], null>>;

// =============================================================================
// Test 2: Array intersection — [is.required(), is.string()] → string
// =============================================================================.

type _t20_arrayIntersection = Expect<
  Equal<
    InferFromConstraintValue<
      [AssertInstance & { readonly __type__: {} }, AssertInstance & { readonly __type__: string }]
    >,
    string
  >
>;

// =============================================================================
// Test 3: validate() return type inference — flat object
// =============================================================================.

const _r1 = validate({}, { age: is.integer(), name: is.string() });

type _t30_flat = Expect<Equal<typeof _r1, { age: number; name: string }>>;

// =============================================================================
// Test 4: validate() return type inference — nested object
// =============================================================================.

const _r2 = validate({}, { address: { street: is.string(), zip: is.usZipCode() } });

type _t40_nested = Expect<Equal<typeof _r2, { address: { street: string; zip: string } }>>;

// =============================================================================
// Test 5: validate() return type inference — array of asserts
// =============================================================================.

const _r3 = validate({}, { email: [is.required(), is.email()] });

type _t50_array = Expect<Equal<typeof _r3, { email: string }>>;

// =============================================================================
// Test 6: validate() return type inference — mixed types
// =============================================================================.

const _r4 = validate(
  {},
  {
    id: is.integer(),
    metadata: {
      active: is.boolean(),
      createdAt: is.date()
    },
    name: [is.required(), is.string()],
    tags: is.collection(is.string())
  }
);

type _t60_mixed = Expect<
  Equal<
    typeof _r4,
    {
      id: number;
      metadata: {
        active: boolean;
        createdAt: string | Date;
      };
      name: string;
      tags: unknown[];
    }
  >
>;

// =============================================================================
// Test 7: Explicit type parameter — backward compatibility
// =============================================================================.

interface User {
  name: string;
  email: string;
}

const _r5 = validate<User>({}, { email: is.email(), name: is.required() });

type _t70_explicit = Expect<Equal<typeof _r5, User>>;

// =============================================================================
// Test 8: Edge cases — nullable types
// =============================================================================.

const _r6 = validate({}, { flag: is.nullOrBoolean(), optional: is.nullOrString() });

type _t80_nullable = Expect<Equal<typeof _r6, { flag: boolean | null; optional: string | null }>>;

// =============================================================================
// Test 9: Edge cases — numeric constraints
// =============================================================================.

const _r7 = validate(
  {},
  {
    max: is.lessThanOrEqual(100),
    min: is.greaterThan(0),
    range: is.range(0, 255)
  }
);

type _t90_numeric = Expect<Equal<typeof _r7, { max: number; min: number; range: number | string | unknown[] }>>;

// =============================================================================
// Test 10: Edge cases — string constraints
// =============================================================================.

const _r8 = validate({}, { blank: is.blank(), notBlank: is.notBlank(), pattern: is.regexp(/^\d+$/) });

type _t100_strings = Expect<Equal<typeof _r8, { blank: string; notBlank: string; pattern: string }>>;

// =============================================================================
// Test 11: validator.js-asserts types — bigNumber family
// =============================================================================.

const _r9 = validate(
  {},
  {
    gt: is.bigNumberGreaterThan('100'),
    lte: is.bigNumberLessThanOrEqualTo('1000'),
    value: is.bigNumber()
  }
);

type _t110_bigNumber = Expect<Equal<typeof _r9, { gt: string | number; lte: string | number; value: string | number }>>;

// =============================================================================
// Test 12: validator.js-asserts types — date family
// =============================================================================.

const _r10 = validate(
  {},
  {
    date: is.date(),
    diff: is.dateDiffGreaterThan(7, { unit: 'days' })
  }
);

type _t120_date = Expect<Equal<typeof _r10, { date: string | Date; diff: string | Date }>>;

// =============================================================================
// Test 13: validator.js-asserts types — specialized validators
// =============================================================================.

const _r11 = validate(
  {},
  {
    cpf: is.cpfNumber(),
    iban: is.internationalBankAccountNumber(),
    phone: is.phone({ countryCode: 'US' }),
    uuid: is.uuid('4')
  }
);

type _t130_specialized = Expect<Equal<typeof _r11, { cpf: string; iban: string; phone: string; uuid: string }>>;

// =============================================================================
// Test 14: Complex nested structure
// =============================================================================.

const _r12 = validate(
  {},
  {
    permissions: is.collection(is.string()),
    user: {
      id: is.integer(),
      profile: {
        email: [is.required(), is.email()],
        name: [is.required(), is.string()],
        phone: is.nullOrString()
      }
    }
  }
);

type _t140_deepNested = Expect<
  Equal<
    typeof _r12,
    {
      permissions: unknown[];
      user: {
        id: number;
        profile: {
          email: string;
          name: string;
          phone: string | null;
        };
      };
    }
  >
>;
