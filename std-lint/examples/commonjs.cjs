'use strict';

const { lintFiles, formatReport } = require('..');

async function main() {
  // 인자가 없으면 정상 예제를 검사합니다. 상대 경로는 아래 cwd 기준입니다.
  const files = process.argv.slice(2);
  const report = await lintFiles(files.length ? files : ['src/valid.js'], {
    cwd: __dirname,
    configFile: './config/project-lint.cjs',
    failOnWarning: false,
  });
  console.log(formatReport(report));
  // report.exitCode는 알림용 분류 값이며 프로세스 종료 코드로 적용하지 않습니다.
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 2; // 잘못된 API 호출 등 예상하지 못한 실행 오류
});
