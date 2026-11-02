export default {
  env: { browser: true, es2020: true },
  globals: { STD: 'readonly' },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2020, sourceType: 'script' },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': 'warn',
  },
};
