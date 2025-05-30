# Uphold Validator.js

Extensive validations built on top of validator.js.

Improvements over validator.js:
 - extended set of asserts
 - logging with debugnyan
 - throwing specific errors on validation failures
 - mask validated data

## Status

[![npm version][npm-image]][npm-url]
[![build status][tests-image]][tests-url]

## Install

Add to your package.json dependencies:

```sh
npm install @uphold/validator.js
```

## Usage

Setup example:

```js
const { ValidationFailedError } = require('@uphold/http-errors');
const validator = require('@uphold/validator.js');
const asserts = require('path/to/asserts');

module.exports = validator({
  AssertionError: Error,
  ValidationError: ValidationFailedError,
  extraAsserts: asserts,
  mask: true
});
```

Throw a 400 error (invalid user input):

```js
const { is, validate } = require('path/to/validator');

try {
  validate({
    foo: 'bar'
  }, {
    foo: is.ofLength({ min: 5 })
  });
} catch (e) {
  console.log({
    name: e.name,
    message: e.message,
    errors: e.errors.foo.map(error => error.show())
  });
  // {
  //   name: 'ValidationFailedError',
  //   message: 'Validation Failed',
  //   errors: [{
  //     assert: 'Length',
  //     value: 'bar',
  //     violation: { min: 5 },
  //   }]
  // }
}
```

Throw a 500 error (invalid code):

```js
const { assert, is } = require('path/to/validator');

try {
  assert({
    foo: 'bar'
  }, {
    foo: is.ofLength({ min: 5 })
  });
} catch (e) {
  console.log({
    name: e.name
  });
  // {
  //   name: 'Error'
  // }
}
```

Return validated properties (masking):

Create a validator with masking enabled by passing the `mask` option set to `true`.

```js
const { assert, is } = require('path/to/validator');

const validatedData = validate({
  foo: 'bar',
  biz: 'baz'
}, {
  foo: is.string()
});

console.log(validatedData);
// { foo: 'bar' }
```

## Release process

The release of a version is automated via the [release](https://github.com/uphold/uphold-validator.js/.github/workflows/release.yml) GitHub workflow.
Run it by clicking the "Run workflow" button.

## License

MIT

[npm-image]: https://img.shields.io/npm/v/@uphold/validator.js.svg
[npm-url]: https://www.npmjs.com/package/@uphold/validator.js
[tests-image]: https://github.com/uphold/uphold-validator.js/actions/workflows/tests.yaml/badge.svg?branch=master
[tests-url]: https://github.com/uphold/uphold-validator.js/actions/workflows/tests.yaml
