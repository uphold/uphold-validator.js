/**
 * Module dependencies.
 */

import { createJavaScriptConfig, createTypeScriptConfig } from 'eslint-config-uphold/configs';
import { defineConfig } from 'eslint/config';

/**
 * `ESLint` configuration.
 */

export default defineConfig([
  createJavaScriptConfig('commonjs', { ecmaVersion: 2024 }),
  {
    extends: [await createTypeScriptConfig('commonjs', { ecmaVersion: 2024 })],
    files: ['**/*.ts']
  }
]);
