import { fileURLToPath } from 'node:url';
import { checkFiles } from '../index.mjs';

const files = process.argv.slice(2);

try {
  // 오류가 있으면 throw하므로 아래의 다음 단계로 진행하지 않습니다.
  const report = await checkFiles(files.length ? files : ['src/valid.js'], {
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    configFile: './config/project-lint.mjs',
  });
  console.log('검사 통과:', report.summary);
  // 기존 Uglify 호출은 이 위치에 넣으세요.
} catch (error) {
  console.error(error.message);
  process.exitCode = error.exitCode || 2;
}
