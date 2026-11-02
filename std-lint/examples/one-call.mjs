import { fileURLToPath } from 'node:url';
import { checkFiles, formatReport } from '../index.mjs';

const files = process.argv.slice(2);

try {
  // 문법·규칙 오류도 report로 반환하므로 다음 단계로 계속 진행합니다.
  const report = await checkFiles(files.length ? files : ['src/valid.js'], {
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    configFile: './config/project-lint.mjs',
  });
  console.log(formatReport(report));
  console.log('검사 결과 알림 완료: 다음 빌드 단계로 진행합니다.');
  // 기존 Uglify 호출은 이 위치에 넣으세요.
} catch (error) {
  console.error(error.message);
  // 검사 대상의 문법 오류가 아닌 API 호출 오류 등을 처리합니다.
  process.exitCode = 2;
}
