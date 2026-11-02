'use strict';

const path = require('node:path');
const { checkFiles, formatReport } = require('..');

// runUglify는 프로젝트에서 이미 사용하는 함수입니다. 동기/비동기 모두 가능합니다.
async function build(files, runUglify, options = {}) {
  if (typeof runUglify !== 'function') throw new TypeError('기존 Uglify 실행 함수를 전달하세요.');
  const cwd = path.resolve(options.cwd || process.cwd());
  const report = await checkFiles(files, { ...options, cwd });
  console.log(formatReport(report));
  // 검사 결과는 알림용입니다. 문법·규칙 오류가 있어도 다음 단계를 호출합니다.

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
      console.log('[예제] 검사 결과 알림 후 → Uglify 연결 지점:', resolvedFiles);
    },
    { cwd: __dirname, configFile: './config/project-lint.cjs' },
  ).catch(error => {
    // 잘못된 API 호출이나 Uglify 자체의 실행 오류를 처리합니다.
    console.error(error.message);
    process.exitCode = 2;
  });
}
