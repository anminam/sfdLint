'use strict';

const { checkFiles } = require('..');

const files = process.argv.slice(2);

// 검사와 실패 처리를 함수 한 번 호출로 수행합니다.
checkFiles(files.length ? files : ['src/valid.js'], {
  cwd: __dirname,
  configFile: './config/project-lint.cjs',
})
  .then(report => {
    console.log('검사 통과:', report.summary);
    // 기존 Uglify 호출은 이 위치에 넣으세요.
  })
  .catch(error => {
    console.error(error.message);
    process.exitCode = error.exitCode || 2;
  });
