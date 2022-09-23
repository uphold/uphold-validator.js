# Uphold Validator.js

Extensive validations built on top of validator.js.

Improvements over validator.js:
 - extended set of asserts
 - logging with debugnyan
 - throwing specific errors on validation failures
 - mask validated data

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

## Release

```sh
$ yarn release [<newversion> | major | minor | patch]
```

## License

MIT
