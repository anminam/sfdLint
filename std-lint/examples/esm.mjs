import { fileURLToPath } from 'node:url';
import { lintFiles, formatReport } from '../index.mjs';

try {
  const files = process.argv.slice(2);
  const report = await lintFiles(files.length ? files : ['src/valid.js'], {
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    configFile: './config/project-lint.mjs',
    failOnWarning: false,
  });
  console.log(formatReport(report));
  // report.exitCode는 알림용 분류 값이며 프로세스 종료 코드로 적용하지 않습니다.
} catch (error) {
  console.error(error.message);
  process.exitCode = 2; // 잘못된 API 호출 등 예상하지 못한 실행 오류
}
