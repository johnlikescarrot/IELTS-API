import js from '@eslint/js';
import json from '@eslint/json';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'data/**', 'scripts/**', 'super-linter-output/**'],
  },
  { ...js.configs.recommended, files: ['**/*.{js,mjs,cjs,ts}'] },
  prettier,
  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    rules: json.configs.recommended.rules,
  },
  {
    // npm lockfile v3 identifies the root package with the required empty key.
    files: ['package-lock.json'],
    rules: { 'json/no-empty-keys': 'off' },
  },
  {
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      'object-shorthand': 'error',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
);
