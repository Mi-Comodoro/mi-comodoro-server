// eslint.config.js

import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config({
  files: ['**/*.ts'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
    },
  },
  plugins: {
    '@typescript-eslint': tseslint.plugin,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
  ignores: ['dist', 'node_modules'],
  extends: [ ...tseslint.configs.recommended, prettier],
});
