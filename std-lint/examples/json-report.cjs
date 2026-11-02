'use strict';

const { lintFiles } = require('..');

async function main() {
  const files = process.argv.slice(2);
  const report = await lintFiles(files.length ? files : ['src/invalid.js'], {
    cwd: __dirname,
    configFile: './config/project-lint.cjs',
  });
  // stdout은 JSON만 출력합니다. 파일로 저장하거나 다른 도구에 전달할 수 있습니다.
  console.log(JSON.stringify(report, null, 2));
  process.exitCode = report.exitCode;
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = error.exitCode || 2;
});
