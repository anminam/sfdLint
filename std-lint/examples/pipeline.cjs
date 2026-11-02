'use strict';

const path = require('node:path');
const { lintFiles, formatReport, assertPassed } = require('..');

// runUglify는 회사에서 이미 사용하는 함수입니다. 동기/비동기 모두 가능합니다.
async function build(files, runUglify, options = {}) {
  if (typeof runUglify !== 'function') throw new TypeError('기존 Uglify 실행 함수를 전달하세요.');
  const cwd = path.resolve(options.cwd || process.cwd());
  const report = await lintFiles(files, { ...options, cwd });
  console.log(formatReport(report));
  assertPassed(report); // 실패 시 throw: 아래 Uglify 함수는 호출되지 않습니다.

  // 검사한 경로와 Uglify에 전달하는 경로가 동일한 기준을 사용하게 합니다.
  return await runUglify(files.map(file => path.resolve(cwd, file)));
}

module.exports = { build };

if (require.main === module) {
  const files = process.argv.slice(2);
  build(
    files.length ? files : ['src/valid.js'],
    async resolvedFiles => {
      // 실행 순서를 보여주는 대체 함수입니다. 실제 압축은 수행하지 않습니다.
      console.log('[예제] 검사 통과 → Uglify 연결 지점:', resolvedFiles);
    },
    { cwd: __dirname, configFile: './config/company-lint.cjs' },
  ).catch(error => {
    if (error.code === 'STD_LINT_FAILED') console.error('검사 실패로 Uglify 실행을 중단했습니다.');
    else console.error(error.message);
    process.exitCode = error.exitCode || 2;
  });
}
