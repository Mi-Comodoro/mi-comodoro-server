// eslint.config.js

import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort'


export default tseslint.config({
  files: ['**/*.ts'],
  languageOptions: {
    parserOptions: {
      project: './tsconfig.json',
    },
  },
  plugins: {
    '@typescript-eslint': tseslint.plugin,
    'simple-import-sort': simpleImportSort,
    
  },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/explicit-function-return-type': 'off',
    // Import order
    'simple-import-sort/imports': 'error',
    'simple-import-sort/exports': 'error',
  },
  ignores: ['dist', 'node_modules'],
  extends: [ ...tseslint.configs.recommended, prettier],
});
