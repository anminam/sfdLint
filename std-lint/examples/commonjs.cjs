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
  process.exitCode = report.exitCode;
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = error.exitCode || 2;
});
