// 기본 탐색 이름과 달라도 configFile로 지정하면 사용할 수 있습니다.
module.exports = {
  env: { browser: true, es2020: true },
  globals: { STD: 'readonly' },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2020, sourceType: 'script' },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': 'warn',
  },
};
