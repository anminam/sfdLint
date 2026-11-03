# std-lint 사용법

파일 경로 배열을 받아 ESLint 검사 결과를 반환합니다. JS 소스를 고치거나 Uglify를 직접 실행하지 않습니다. 포함된 ESLint 버전은 10.14.0입니다.

처음 사용하는 경우 [예제 실행 가이드](examples/README.md)부터 읽으세요. `examples/`에는 설치 없이 실행할 수 있는 CommonJS·ESM·JSON 출력·파이프라인 예제가 들어 있습니다.

목록을 `temp_files.txt`로 받고 `npm run`/`execSync`로 실행하려면 [CLI 및 빌드 명령 연결 가이드](CLI.md)를 참고하세요. 쉼표·줄바꿈 혼합 목록과 프로젝트 폴더 이름을 포함한 경로를 지원합니다.

## Node.js 버전

2026-11-02 확인 기준, [Node.js 공식 2026-10-21 보안 공지](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)에 따른 계열별 최소 버전은 다음과 같습니다. 이 공지에는 Brotli 디코더, DNS, TLS 등의 취약점 수정이 포함됩니다.

| 사용 계열 | 최소 보안 수정 버전 | 이 모듈의 지원 범위 |
| --- | --- | --- |
| Node.js 22 | 22.23.4 | `>=22.23.4 <23` |
| Node.js 24 | 24.22.1 | `>=24.22.1 <25` |
| Node.js 26 | 26.12.1 | `>=26.12.1 <27` |

새로 구성하는 개발 환경은 **24.22.2 LTS**를 권장합니다. [공식 24.22.2 릴리스](https://nodejs.org/en/blog/release/v24.22.2)는 보안 수정 버전 이후의 업데이트입니다. 향후에도 사용하는 LTS 계열의 최신 보안 패치를 유지하세요. 이 최소 버전 표가 미래의 취약점 수정까지 보장하지는 않습니다.

[공식 지원 상태](https://nodejs.org/en/about/previous-releases)에 따라 Node.js 20과 25 등 지원 종료 계열은 이 모듈의 지원 범위에서 제외합니다. 단순히 `22 이상`이면 되는 것이 아니라 **각 계열의 수정 버전 이상**이어야 합니다.

빌드가 실제로 실행되는 PC/CI에서 다음 명령으로 확인하세요.

```sh
node --version
node -p "process.execPath"
```

저장소의 `.nvmrc`는 24.22.2를 지정합니다. nvm을 사용하는 개발 환경에서는 `nvm install` 후 `nvm use`로 선택할 수 있습니다. 프로젝트에서 오프라인 설치가 필요하면 승인된 경로로 해당 Node.js 배포본을 받아 설치하세요. 이 모듈 폴더에는 Node.js 실행 파일이 포함되어 있지 않습니다.

`package.json`의 `engines.node`에도 지원 범위를 명시했습니다. **폴더를 복사해서 실행하는 방식에서는 engines가 실행을 자동으로 막지 않으므로**, 프로젝트 빌드 환경의 Node.js 버전을 직접 확인해야 합니다. 시스템에 설치된 Node.js를 이 모듈이 자동으로 변경하지 않습니다.

## 설정

프로젝트에 `stdLintConfig.js`를 만드세요. CommonJS 프로젝트에서는 다음처럼 작성합니다.

```js
module.exports = {
  env: { browser: true, es2020: true },
  globals: { STD: 'readonly' },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': 'warn',
  },
};
```

`package.json`에 `"type": "module"`이 있으면 `export default { ... }`로 작성하세요. 파일 확장자로 형식을 명시하려면 `stdLintConfig.cjs` 또는 `stdLintConfig.mjs`를 사용할 수 있습니다. 설정 파일은 실행되는 JavaScript이므로 신뢰할 수 있는 파일을 사용해야 합니다.

설정에서 `parserOptions.ecmaVersion`과 `sourceType`을 대상 코드에 맞추세요. `env`는 사용 가능한 전역 이름 등을 정의하는 설정이며, Uglify 실행 성공까지 보장하지는 않습니다. 위 예제의 `sourceType: 'module'`은 대상 JS의 `import`/`export`를 허용합니다. 검사 실행기나 설정 파일이 `.cjs`여도 이 옵션을 사용할 수 있습니다. ES module은 엄격 모드로 검사되므로 기존 script의 동작까지 모두 같아지는 것은 아닙니다.

일부 파일만 기존 script로 검사해야 하면 파일 범위에 맞춰 다음 `overrides`를 추가할 수 있습니다.

```js
overrides: [
  {
    files: ['legacy/**/*.js'],
    parserOptions: { sourceType: 'script' },
  },
],
```

`sourceType: 'module'`은 검사 시 파싱 방식이며, 코드를 변환하거나 Uglify의 지원 문법을 바꾸지는 않습니다.

`env`, `globals`, `rules`, `parserOptions`, `overrides`, `ignorePatterns`, `extends: ['eslint:recommended']`/`['eslint:all']` 등 기존 eslintrc 형식을 지원합니다. 최신 flat config 배열을 직접 받는 API는 아닙니다. 설정을 자동 병합하지 않으며, 파일별로 가장 가까운 설정 하나를 선택합니다. 해당 설정의 `extends`/`overrides`는 ESLint 방식으로 적용됩니다.

배포본에는 ESLint 기본 규칙과 기본 파서만 포함되어 있습니다. 별도 플러그인, TypeScript/Babel 파서, 외부 공유 설정은 추가로 vendor에 포함하고 호환성을 검증해야 사용할 수 있습니다. 플러그인 전용 env는 현재 지원하지 않습니다. ESLint 10에서 제거된 예전 규칙도 그대로 사용할 수는 없습니다.

## 함수 하나로 검사하기: checkFiles

`checkFiles(filePaths, options)`는 `lintFiles()`와 같은 인자를 받고 결과 객체를 반환합니다. **알림 목적이므로 문법·규칙 오류가 있어도 예외를 던지지 않고 다음 단계로 진행합니다.** 파일 읽기·설정 실패도 `report.issues`에 기록합니다. 콘솔 출력은 호출자가 처리합니다.

```js
const { checkFiles } = require('./tools/std-lint');

checkFiles(['src/app.js'], {
  cwd: __dirname,
  configFile: './config/project-lint.cjs',
})
  .then(report => {
    console.log('검사 결과 알림:', report.summary);
    // 기존 Uglify 호출을 여기에 넣으세요.
  })
  .catch(error => {
    console.error(error.message);
    process.exitCode = 2; // 검사 대상의 문법·규칙 위반에는 적용하지 않음
  });
```

ESM에서는 `import { checkFiles } from './tools/std-lint/index.mjs'`로 불러와 `await checkFiles(files, options)`를 사용합니다. 오류가 있어도 반환된 `report`에서 결과를 확인합니다. `failOnWarning: true`는 경고를 report의 `passed: false`, `exitCode: 1`로 분류할 뿐 예외나 빌드 중단을 발생시키지 않습니다. 잘못된 API 인자는 `TypeError`를 던집니다.

실행 예제: [one-call.cjs](examples/one-call.cjs) / [one-call.mjs](examples/one-call.mjs).

## 결과 출력과 다음 단계 연결: CommonJS / Uglify 파이프라인

```js
const { lintFiles, formatReport } = require('./tools/std-lint');

async function build(files) {
  const report = await lintFiles(files, {
    cwd: __dirname,
    configFile: './stdLintConfig.js',
    failOnWarning: false,
  });

  console.log(formatReport(report));

  // 이 지점에 기존 Uglify 호출 코드를 넣습니다.
  // await runExistingUglify(files);
  return report;
}

build(['src/app.js', 'src/common.js']).catch(error => {
  console.error(error.message);
  process.exitCode = 2; // 검사 대상의 문법·규칙 위반에는 적용하지 않음
});
```

`lintFiles()`와 `checkFiles()`는 검사 오류를 report로 반환합니다. 결과를 기록한 뒤 Uglify를 계속 호출하면 됩니다. 예제에서는 `report.exitCode`를 프로세스 종료 코드로 적용하지 않습니다. Uglify 자체의 파싱·실행 오류는 Uglify 호출 코드에서 별도로 처리해야 합니다.

## ESM

로컬 폴더의 ESM import는 진입 파일을 지정합니다.

```js
import { lintFiles, formatReport } from './tools/std-lint/index.mjs';

const report = await lintFiles(['src/app.js'], {
  configFile: './stdLintConfig.js',
});
console.log(formatReport(report));
```

## 입력 및 설정 탐색

- `filePaths`: 실제 파일 경로의 배열입니다. 상대 경로는 `options.cwd` 기준이며, 기본값은 `process.cwd()`입니다. glob이나 폴더 경로는 확장하지 않습니다.
- 중복된 절대 경로는 한 번만 검사하고 입력 순서를 유지합니다. 빈 배열은 성공입니다. 심볼릭 링크의 별칭까지 중복 제거하지는 않습니다.
- `configFile`: 선택 사항입니다. 상대 경로는 `cwd` 기준입니다. 지정하면 모든 파일에 동일한 설정을 적용합니다. 프로젝트 빌드에서는 이 옵션으로 설정을 명시하는 것을 권장합니다.
- 생략하면 각 대상 파일의 폴더부터 파일시스템 루트까지 올라가며 가장 가까운 `stdLintConfig.js`, `.cjs`, `.mjs`를 찾습니다. 같은 폴더에 여러 개면 이 순서로 선택합니다. 설정이 없으면 실패합니다.
- 파일 읽기·설정 오류가 있어도 나머지 파일을 계속 검사합니다. 자동 수정은 하지 않습니다. 일반 ESLint inline 주석은 ESLint 기준으로 적용됩니다.
- `ignorePatterns`나 ESLint 기본 제외 대상 때문에 입력 파일이 검사되지 않으면 `FILE_NOT_LINTED` 실패로 처리합니다. 검사에서 제외할 파일은 호출자가 배열에서 빼주세요.
- 설정 진입 파일은 호출마다 다시 읽습니다. 설정에서 import/require한 보조 모듈은 Node.js 캐시를 따르므로 보조 모듈 변경 후에는 프로세스를 재시작하세요.

## 반환 형식

실제 예제 파일을 검사한 정상·규칙 오류·문법 오류·경고·파일/설정 실패 결과와 콘솔 출력은 [report 결과 예시](REPORT_EXAMPLES.md)에 있습니다. 아래는 필드를 설명하기 위한 형식 예시입니다.

파싱 가능한 실제 응답 파일은 [examples/reports/](examples/reports/), 입력·옵션 목록은 [index.json](examples/reports/index.json)에 있습니다. 반환 형식은 [report.schema.json](report.schema.json)(JSON Schema Draft-07)으로 제공합니다. 스키마는 필드 구조를 검증하며 오류 수의 합계나 실제 빌드 실행 여부까지 검증하지는 않습니다. `index.json`의 실행 정책 정보는 report 응답 필드와 구분됩니다.

CLI에서만 간단한 응답이 필요하면 `--format compact-json`을 지정하세요. summary까지 유지하고 `report: { isError, errorFiles: [{ filePath, errorMessage }] }`를 반환합니다. 경고는 상세 목록에서 제외하고 같은 파일의 오류는 줄바꿈으로 합칩니다. [CLI 사용법과 JSON 예시](CLI.md#오류-파일만-담은-전용-json), [전용 스키마](compact-report.schema.json)를 참고하세요.

```js
{
  version: 1,                 // 결과 스키마 버전
  passed: false,
  exitCode: 1,
  summary: {
    fileCount: 1,
    lintedFileCount: 1,
    failedFileCount: 0,
    errorCount: 1,
    warningCount: 0,
    fatalErrorCount: 0,
  },
  files: [{
    filePath: '/project/src/app.js',
    configFile: '/project/stdLintConfig.js',
    status: 'linted',          // 또는 failed
    errorCount: 1,
    warningCount: 0,
    fatalErrorCount: 0,
    messages: [{
      ruleId: 'no-undef',
      severity: 2,           // 1: warning, 2: error
      message: "'unknownName' is not defined.",
      line: 1,
      column: 1,
      // 그 외 ESLint가 반환하는 endLine, endColumn, suggestions 등
    }],
  }],
  issues: [],                // 파일/설정/검사 실행 실패
}
```

위 코드는 형식을 보여주는 예시입니다. `messages`는 ESLint 원본 메시지이며, 문법 오류의 `ruleId`는 `null`일 수 있습니다. 줄과 열은 1부터 시작합니다. `fatalErrorCount`는 `errorCount`에 포함된 문법 분석 실패 수입니다.

`issues` 항목은 `{ filePath, configFile, stage, code, message }`입니다. `stage`는 `read`, `config`, `lint` 중 하나이며 `configFile`은 아직 찾지 못했으면 `null`입니다. `failed` 파일의 오류 개수는 0이고 실행 실패는 `failedFileCount`와 `issues`로 따로 집계합니다. JSON으로 직렬화할 수 있습니다.

| exitCode | 의미 |
| --- | --- |
| 0 | 통과. 기본적으로 경고는 허용 |
| 1 | 문법/규칙 오류, 또는 `failOnWarning: true`일 때 경고 |
| 2 | 파일 읽기 실패, 설정 실패, 검사 누락, 검사 실행 실패 |

여러 종류의 문제가 함께 있으면 2가 우선입니다. `exitCode`는 결과 분류 값이며 프로세스를 종료시키지 않습니다. 알림 목적의 사용에서는 `process.exitCode = report.exitCode`를 적용하지 마세요. PASS/FAIL 표기도 검사 기준 충족 여부를 뜻하며 다음 단계 실행을 막지 않습니다.

`formatReport(report)`는 경로·줄·열·심각도·규칙·메시지와 전체 요약을 담은 문자열입니다. ESLint 원본 메시지는 영어로 표시됩니다.

기존 `assertPassed(report)`는 report를 그대로 반환하는 deprecated 호환 함수로 유지하며, 2.0.0부터는 오류가 있어도 예외를 던지지 않습니다. 새 코드에서는 호출할 필요가 없습니다. 기존 `StdLintError` 클래스도 export는 유지하지만 검사 결과 때문에 이 오류를 생성하거나 던지지 않습니다. 1.1.0에서 `checkFiles()`의 실패를 catch로 받던 코드는 2.0.0부터 반환된 `report`에서 읽도록 바꿔야 합니다.

## 업데이트와 고지

이 폴더를 통째로 교체해 업데이트합니다. 프로젝트별 설정은 이 폴더 밖에서 관리하세요. `vendor/node_modules` 안의 의존성 파일과 LICENSE/저작권 고지를 삭제하지 마세요. 외부 패키지 버전과 무결성 해시는 `vendor/package-lock.json`에 기록되어 있습니다.

의존성 보안 점검에서 확인된 minimatch advisory와 실제 프로젝트 환경에서 추가 확인할 항목은 [KNOWN_ISSUES.md](KNOWN_ISSUES.md)를 참고하세요.
