# Uphold Validator.js

Extensive validations built on top of validator.js.

Improvements over validator.js:
 - extended set of asserts
 - logging with debugnyan
 - throwing specific errors on validation failures

## Install

Add to your package.json dependencies:

```json
"@uphold/validator.js": "git+ssh://git@github.com/uphold/uphold-validator.js"
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
  extraAsserts: asserts
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

## Release

```sh
$ yarn release [<newversion> | major | minor | patch]
```

## License

MIT