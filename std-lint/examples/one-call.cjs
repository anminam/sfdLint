'use strict';

const { checkFiles, formatReport } = require('..');

const files = process.argv.slice(2);

// 문법·규칙 오류도 report로 반환하며 아래 then으로 진행합니다.
checkFiles(files.length ? files : ['src/valid.js'], {
  cwd: __dirname,
  configFile: './config/project-lint.cjs',
})
  .then(report => {
    console.log(formatReport(report));
    console.log('검사 결과 알림 완료: 다음 빌드 단계로 진행합니다.');
    // 기존 Uglify 호출은 이 위치에 넣으세요.
  })
  .catch(error => {
    console.error(error.message);
    // 검사 대상의 문법 오류는 여기에 들어오지 않습니다. API 호출 오류 등만 처리합니다.
    process.exitCode = 2;
  });
