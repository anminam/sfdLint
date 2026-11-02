# std-lint

Uglify 실행 전에 파일 경로 배열을 검사하고 결과를 알리는 Node.js 모듈입니다. 문법·규칙 오류가 있어도 검사 결과를 반환하고 파이프라인을 계속 진행합니다. `stdLintConfig.js`의 기존 ESLint 설정을 공식 `FlatCompat`로 변환하고 ESLint로 검사합니다.

## 빠른 시작: 프로젝트에서 사용하기

### 1. 폴더 복사하기

GitHub의 **Code → Download ZIP**으로 내려받거나 이 저장소를 clone합니다. 내려받은 저장소 안에서 **`vendor`가 들어 있는 `std-lint/` 폴더 전체**를 프로젝트의 `tools/std-lint/`로 복사하세요. `vendor/node_modules`도 반드시 포함합니다. 프로젝트에서 npm 설치나 네트워크 접속은 필요 없습니다.

```text
my-project/
├── build.cjs                   ← 검사 실행 코드
├── config/
│   └── project-lint.cjs         ← 프로젝트별 설정 (이름·경로 자유)
├── src/
│   └── app.js                  ← 검사할 코드
└── tools/
    └── std-lint/               ← 이 폴더 전체 복사
        ├── index.cjs
        ├── index.mjs
        ├── package.json
        └── vendor/
            └── node_modules/
```

실행 환경에는 Node.js가 필요합니다. 지원 버전은 **22.23.4 이상인 22.x / 24.22.1 이상인 24.x / 26.12.1 이상인 26.x**이며, 권장 개발 버전은 **24.22.2 LTS**입니다. `node --version`으로 확인하세요. 이후에도 사용하는 계열의 최신 보안 패치를 유지하세요. [공식 보안 공지와 버전 안내](std-lint/README.md#nodejs-버전)

### 2. 설정 파일 만들기

`config/project-lint.cjs`를 만듭니다. 기존 ESLint 설정처럼 작성하세요.

```js
module.exports = {
  env: { browser: true, es2020: true },
  globals: { STD: 'readonly' },
  extends: ['eslint:recommended'],
  parserOptions: { ecmaVersion: 2020, sourceType: 'script' },
  rules: {
    'no-undef': 'error',
    'no-unused-vars': 'warn',
  },
};
```

- `env`: 사용 환경의 전역 이름을 허용합니다. 위 설정은 `window`, `document` 등을 허용합니다.
- `globals`: 프로젝트 코드의 전역 이름을 등록합니다. 위 설정의 `STD`를 프로젝트에서 쓰는 이름으로 바꾸세요. `readonly`는 대입을 금지합니다.
- `extends`: ESLint 권장 규칙을 적용합니다.
- `parserOptions`: 허용할 문법 버전과 script/module 형식입니다. 프로젝트 Uglify가 처리할 수 있는 문법에 맞추세요.
- `rules`: 규칙별로 `off`, `warn`, `error`를 지정합니다.

이 예제는 `.cjs`를 사용하므로 프로젝트의 `type: module` 여부와 관계없이 `module.exports`로 작성할 수 있습니다. `.mjs` 설정은 `export default { ... }`로 작성합니다.

### 3. 함수 하나로 검사하기 (CommonJS)

프로젝트 루트의 `build.cjs`에 다음처럼 작성하면 됩니다. **`checkFiles()`는 알림용이며, 문법·규칙 오류가 있어도 결과를 반환하고 `.then()`으로 진행합니다.**

```js
const { checkFiles } = require('./tools/std-lint');

checkFiles(['src/app.js', 'src/common.js'], {
  cwd: __dirname,
  configFile: './config/project-lint.cjs',
})
  .then(report => {
    console.log('검사 결과 알림:', report.summary);
    // 문법·규칙 오류가 있어도 기존 Uglify 호출을 여기에 넣으면 실행됩니다.
  })
  .catch(error => {
    console.error(error.message);
    process.exitCode = 2; // 검사 대상의 문법·규칙 위반에는 적용하지 않음
  });
```

위 코드를 사용할 때는 `src/app.js`, `src/common.js`를 실제 검사할 파일 경로로 바꾸세요. 문법·규칙 오류는 `report.files[].messages`, 파일·설정 실패는 `report.issues`에 담아 반환합니다. 이 결과 때문에 `catch`로 이동하지 않습니다. 잘못된 API 인자 같은 호출 오류는 `catch`에서 처리합니다.

ESM에서는 `import { checkFiles } from './tools/std-lint/index.mjs'`로 불러와 `await checkFiles(files, options)`를 호출하면 됩니다. 실행 가능한 예제: [CommonJS](std-lint/examples/one-call.cjs) / [ESM](std-lint/examples/one-call.mjs).

### 4. 결과 출력 형식을 직접 구성하기

콘솔에 줄·열·규칙·메시지를 출력하고 다음 단계로 진행하려면 다음 `build.cjs` 예제를 사용하세요.

```js
const path = require('node:path');
const { lintFiles, formatReport } = require('./tools/std-lint');

async function main() {
  // 검사할 파일 경로 배열입니다. 폴더나 glob은 넣지 않습니다.
  const files = ['src/app.js'].map(file => path.resolve(__dirname, file));

  const report = await lintFiles(files, {
    cwd: __dirname,
    configFile: './config/project-lint.cjs',
    failOnWarning: false,
  });

  console.log(formatReport(report));

  // 기존 Uglify 호출을 이 위치로 옮기고 files를 전달하세요.
  // await runExistingUglify(files);
  console.log('검사 결과 알림 완료: 다음 빌드 단계로 진행합니다.');
}

main().catch(error => {
  console.error(error.message); // API 호출 오류 등만 처리
  process.exitCode = 2; // 검사 대상의 문법·규칙 위반에는 적용하지 않음
});
```

파일이 여러 개면 `['src/app.js', 'src/common.js']`처럼 배열에 추가하면 됩니다. `lintFiles()`와 `checkFiles()` 모두 검사 결과를 반환합니다. 결과를 출력한 후 그대로 다음 단계로 진행하세요. 알림 목적의 파이프라인에서는 `assertPassed()`를 호출하거나 `report.exitCode`를 프로세스 종료 코드로 적용하지 마세요.

### 5. 실행하고 결과 확인하기

아래는 4단계의 `build.cjs`로 정상·오류 출력을 확인하는 과정입니다.

먼저 `src/app.js`에 다음 코드를 넣어 정상 동작을 확인합니다.

```js
window.alert(STD.version);
```

프로젝트 루트에서 실행합니다. 예제의 소스는 lint가 읽기만 하므로 브라우저나 `STD` 객체를 실제로 실행 환경에 만들 필요는 없습니다.

```sh
node build.cjs
```

```text
std-lint: PASS | files 1, linted 1, errors 0, warnings 0, failed 0
검사 결과 알림 완료: 다음 빌드 단계로 진행합니다.
```

이제 `src/app.js`를 다음처럼 바꾸고 다시 실행해 보세요.

```js
window.alert(notRegistered);
```

파일 경로는 실행 환경에 따라 달라집니다. 검사 결과에는 `passed: false`, `exitCode: 1`이 기록되지만 예제 프로세스는 정상 종료(0)하고 다음 단계도 실행됩니다. Uglify 자체가 문법 오류를 처리하지 못하는 경우는 기존 Uglify 코드에서 별도로 처리해야 합니다.

```text
/.../src/app.js:1:14 error 'notRegistered' is not defined. (no-undef)
std-lint: FAIL | files 1, linted 1, errors 1, warnings 0, failed 0
검사 결과 알림 완료: 다음 빌드 단계로 진행합니다.
```

## import로 사용하기 (ESM)

위 폴더 배치와 설정을 그대로 두고 `build.mjs`를 다음처럼 작성할 수 있습니다. 로컬 ESM import는 `index.mjs`까지 지정합니다.

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintFiles, formatReport } from './tools/std-lint/index.mjs';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

async function main() {
  const files = ['src/app.js'].map(file => path.resolve(projectRoot, file));
  const report = await lintFiles(files, {
    cwd: projectRoot,
    configFile: './config/project-lint.cjs',
    failOnWarning: false,
  });

  console.log(formatReport(report));

  // await runExistingUglify(files);
  console.log('검사 결과 알림 완료: 다음 빌드 단계로 진행합니다.');
}

main().catch(error => {
  console.error(error.message); // API 호출 오류 등만 처리
  process.exitCode = 2; // 검사 대상의 문법·규칙 위반에는 적용하지 않음
});
```

```sh
node build.mjs
```

## 이름·경로·결과 분류 옵션 바꾸기

호출 코드의 옵션만 수정하면 됩니다. 설정 이름과 경로가 바뀌어도 모듈 내부를 수정할 필요가 없습니다.

```js
const report = await lintFiles(files, {
  cwd: projectRoot,
  configFile: './settings/team-lint.cjs',
  failOnWarning: true,
});
```

| 옵션 | 사용 방법 |
| --- | --- |
| `cwd` | 입력 파일과 `configFile`의 상대 경로 기준. 생략하면 `process.cwd()` |
| `configFile` | 사용할 설정의 이름·경로. 절대 경로도 가능 |
| `failOnWarning` | `true`면 경고도 report의 passed=false/exitCode=1로 분류. 예외나 빌드 중단은 발생하지 않음 |

`configFile`을 생략하면 각 대상 파일의 폴더부터 상위 폴더로 올라가며 가장 가까운 `stdLintConfig.js`, `.cjs`, `.mjs`를 찾습니다. 프로젝트 빌드에서는 `configFile`을 명시하는 것을 권장합니다.

## 결과를 프로그램에서 사용하기

`checkFiles()`와 `lintFiles()`는 같은 형식의 JSON 직렬화 가능한 결과를 반환합니다. 오류가 있어도 `.then(report)` 또는 `await`의 반환값에서 결과를 읽습니다.

| 항목 | 의미 |
| --- | --- |
| `report.passed` | 검사 기준 충족 여부. false여도 다음 단계는 계속 진행 |
| `report.exitCode` | 알림용 분류: 0: 기준 충족, 1: 문법·규칙 위반, 2: 파일·설정·검사 실행 실패. 프로세스 종료 코드와 별개 |
| `report.summary` | 검사 파일 수, 오류 수, 경고 수 |
| `report.files[].messages` | 파일별 줄·열·규칙·메시지 |
| `report.issues` | 없는 파일, 잘못된 설정 등 실행 실패 정보 |

`formatReport(report)`는 콘솔에 출력할 문자열을 만듭니다. 출력의 PASS/FAIL은 검사 기준에 따른 표시이며 빌드 중단을 의미하지 않습니다. 라이브러리는 검사 결과를 이유로 프로세스를 종료하지 않습니다. [반환 객체 전체 예시](std-lint/README.md#반환-형식)

### 실제 report는 이렇게 나옵니다

정상 파일 1개를 검사한 경우의 핵심 값입니다. 전체 결과에는 파일별 `files`와 `issues`도 포함됩니다.

```json
{
  "passed": true,
  "exitCode": 0,
  "summary": {
    "fileCount": 1,
    "lintedFileCount": 1,
    "failedFileCount": 0,
    "errorCount": 0,
    "warningCount": 0,
    "fatalErrorCount": 0
  }
}
```

다음은 예제 `src/invalid.js`의 `window.alert(notRegistered);`를 검사한 **전체 report**입니다. 첫 줄은 주석이라 오류 위치가 2행입니다. 절대 경로는 읽기 쉽도록 `/project`로 바꿨습니다.

```json
{
  "version": 1,
  "passed": false,
  "exitCode": 1,
  "summary": {
    "fileCount": 1,
    "lintedFileCount": 1,
    "failedFileCount": 0,
    "errorCount": 1,
    "warningCount": 0,
    "fatalErrorCount": 0
  },
  "files": [
    {
      "filePath": "/project/src/invalid.js",
      "configFile": "/project/config/project-lint.cjs",
      "status": "linted",
      "errorCount": 1,
      "warningCount": 0,
      "fatalErrorCount": 0,
      "messages": [
        {
          "ruleId": "no-undef",
          "severity": 2,
          "message": "'notRegistered' is not defined.",
          "line": 2,
          "column": 14,
          "messageId": "undef",
          "endLine": 2,
          "endColumn": 27
        }
      ]
    }
  ],
  "issues": []
}
```

같은 결과를 `formatReport(report)`로 출력하면 다음과 같습니다.

```text
/project/src/invalid.js:2:14 error 'notRegistered' is not defined. (no-undef)
std-lint: FAIL | files 1, linted 1, errors 1, warnings 0, failed 0
```

| 상황 | passed | exitCode | 확인할 위치 |
| --- | --- | --- | --- |
| 정상 | true | 0 | files의 messages가 빈 배열 |
| 문법·규칙 오류 | false | 1 | files의 messages |
| 경고만 있음 (기본값) | true | 0 | warningCount와 messages |
| 경고 + failOnWarning: true | false | 1 | warningCount와 messages |
| 파일·설정·검사 실행 실패 | false | 2 | issues와 failedFileCount |

`status: 'linted'`는 검사를 수행했다는 뜻입니다. `passed`는 검사 기준 충족 여부이며 빌드 진행 여부와 별개입니다. `fatalErrorCount`는 `errorCount`에 포함되므로 두 수를 더하지 않습니다.

`checkFiles()`의 오류 알림도 다음처럼 반환값에서 확인합니다.

```js
const { checkFiles } = require('./tools/std-lint');

checkFiles(['src/app.js'], { configFile: './config/project-lint.cjs' })
  .then(report => {
    console.log(JSON.stringify(report, null, 2));
    // 문법·규칙 오류가 있어도 다음 빌드 단계로 진행합니다.
  })
  .catch(error => {
    console.error(error.message); // 잘못된 API 인자 등의 호출 오류
    process.exitCode = 2; // 검사 대상의 문법·규칙 위반에는 적용하지 않음
  });
```

정상·규칙 오류·문법 오류·경고·파일 실패·설정 실패의 **전체 JSON과 콘솔 출력**은 [report 결과 예시](std-lint/REPORT_EXAMPLES.md)에 있습니다.

## JSON 결과 파일과 스키마

결과를 직접 내려받아 UI·로그·다른 도구에 연결할 수 있도록 **실제 API 응답을 `.json` 파일로 제공**합니다. 각 report의 데이터 구조는 [report.schema.json](std-lint/report.schema.json)으로 검증했습니다.

| 상황 | 실제 응답 JSON |
| --- | --- |
| 정상 | [01-success.json](std-lint/examples/reports/01-success.json) |
| 규칙 오류 | [02-rule-error.json](std-lint/examples/reports/02-rule-error.json) |
| 문법 오류 | [03-syntax-error.json](std-lint/examples/reports/03-syntax-error.json) |
| 경고 | [04-warning.json](std-lint/examples/reports/04-warning.json) |
| 경고를 위반으로 분류 | [05-warning-classified.json](std-lint/examples/reports/05-warning-classified.json) |
| 파일 없음 | [06-missing-file.json](std-lint/examples/reports/06-missing-file.json) |
| 설정 없음 | [07-missing-config.json](std-lint/examples/reports/07-missing-config.json) |
| 여러 파일의 정상·오류·경고 혼합 | [08-mixed.json](std-lint/examples/reports/08-mixed.json) |

혼합 예시에서는 파일 5개 중 4개를 검사하고 1개는 읽지 못했습니다. 결과의 핵심 값은 다음과 같습니다. 전체 응답의 `files`에는 파일별 위치·규칙·메시지가, `issues`에는 읽기 실패 정보가 들어 있습니다.

```json
{
  "version": 1,
  "passed": false,
  "exitCode": 2,
  "summary": {
    "fileCount": 5,
    "lintedFileCount": 4,
    "failedFileCount": 1,
    "errorCount": 2,
    "warningCount": 1,
    "fatalErrorCount": 1
  }
}
```

위 JSON은 핵심 필드만 발췌한 예시이며, 스키마 검증에는 링크한 **전체 응답 JSON**을 사용합니다. 문법 오류 1건은 `errorCount: 2`에 포함되므로 `fatalErrorCount`를 별도로 더하지 않습니다. 이 결과에서도 **다음 단계는 계속 진행하며 예제 프로세스 종료 코드는 0**입니다.

[index.json](std-lint/examples/reports/index.json)에는 예시별 입력 파일, 옵션, 예상 결과와 실행 정책을 함께 적었습니다. 이 파일은 report 자체가 아닌 **예시 목록 메타데이터**입니다. 다음 정보도 포함되어 있어 결과 분류와 파이프라인 진행을 구분할 수 있습니다.

```json
{
  "usage": {
    "purpose": "notification",
    "continuePipelineOnFindings": true,
    "applyReportExitCodeToProcess": false
  }
}
```

현재 프로젝트에서 새 JSON을 생성하려면 다음처럼 실행합니다. 첫 번째 명령은 실제 파일을 검사해 stdout에 순수 JSON을 출력하며, 오류가 있어도 정상 종료(0)합니다.

```sh
node std-lint/examples/json-report.cjs src/valid.js src/invalid.js src/syntax-error.js src/warning.js > lint-report.json
npm run examples:reports
```

`npm run examples:reports`는 저장소 개발용 명령으로, 제공된 8개 시나리오를 다시 검사하고 JSON Schema 및 집계를 검증한 뒤 `std-lint/examples/reports/`에 저장합니다. 경로는 공유하기 쉽도록 `/project`로 치환합니다. 런타임 API와 `json-report.cjs`는 실제 절대 경로를 반환합니다. 외부 패키지 설치는 필요 없습니다.

## 매뉴얼과 실행 예제

저장소에는 아래 예제가 이미 들어 있습니다. 저장소 루트에서 바로 실행해 볼 수 있습니다.

```sh
node std-lint/examples/commonjs.cjs
node std-lint/examples/esm.mjs
node std-lint/examples/commonjs.cjs src/invalid.js
node std-lint/examples/one-call.cjs
node std-lint/examples/one-call.mjs src/invalid.js
```

| 필요한 내용 | 문서 / 예제 |
| --- | --- |
| 예제별 명령과 예상 결과, 문제 해결 | [예제 실행 가이드](std-lint/examples/README.md) |
| 전체 API와 설정 동작 | [사용 매뉴얼](std-lint/README.md) |
| 함수 한 번 호출로 검사 결과 알림 | [one-call.cjs](std-lint/examples/one-call.cjs) / [one-call.mjs](std-lint/examples/one-call.mjs) |
| `require()` / `import` 예제 | [commonjs.cjs](std-lint/examples/commonjs.cjs) / [esm.mjs](std-lint/examples/esm.mjs) |
| 기존 Uglify 함수를 전달하는 연결 예제 | [pipeline.cjs](std-lint/examples/pipeline.cjs) |
| JSON 결과 출력 | [json-report.cjs](std-lint/examples/json-report.cjs) |
| 실제 JSON 결과 8종과 입력·옵션 목록 | [reports/](std-lint/examples/reports) / [index.json](std-lint/examples/reports/index.json) |
| JSON 필드 타입과 필수 항목 | [report.schema.json](std-lint/report.schema.json) |
| 설정 파일 | [project-lint.cjs](std-lint/examples/config/project-lint.cjs) |

포함된 엔진은 ESLint 10.14.0이며 기본 규칙과 기본 파서를 제공합니다. 외부 플러그인·파서·공유 설정은 별도 vendor 구성이 필요합니다. 기존 ESLint 버전과의 결과 비교, 의존성 보안 점검 등은 [확인된 제한 사항](std-lint/KNOWN_ISSUES.md)을 참고하세요.

## 개발 및 배포

```sh
npm test
npm run release
```

테스트와 배포에도 npm 의존성 설치가 필요 없습니다. `npm run release`는 `dist/std-lint-2.0.0/std-lint/` 폴더와 `dist/std-lint-2.0.0.tar.gz`를 만듭니다. 복사해서 쓸 코드는 `std-lint/` 안에만 있습니다.

## Git으로 업데이트하기

`vendor/node_modules`는 외부 설치가 불가능한 사용 환경을 위해 의도적으로 Git에 포함합니다. 의존성의 LICENSE와 고지 파일을 유지하세요. Git 호스팅에서 받은 소스 압축파일에서도 모듈을 바로 사용할 수 있습니다.

1. 소스와 테스트를 수정합니다.
2. `npm test`를 실행합니다.
3. 배포 시 `std-lint/package.json` 버전을 올리고 변경 사항을 `std-lint/CHANGELOG.md`에 기록합니다.
4. `npm run release` 후 Git 커밋과 버전 태그를 만듭니다.
5. 프로젝트에서는 해당 버전의 `tools/std-lint` 폴더 **전체를 교체**합니다. 프로젝트별 설정 파일은 이 폴더 밖에 두세요.

의존성을 업데이트할 때만 인터넷이 되는 개발 환경에서 다음을 실행합니다. 버전은 검토한 정확한 버전으로 지정하고, 변경된 lockfile과 vendor 폴더도 커밋합니다.

```sh
npm install --prefix std-lint/vendor --save-exact eslint@<version> @eslint/eslintrc@<version> @eslint/js@<version> --omit=dev --ignore-scripts
npm test
```

lockfile로 vendor를 다시 구성하려면 `npm ci --prefix std-lint/vendor --omit=dev --ignore-scripts`를 사용합니다. 이 명령은 개발 환경에서만 실행합니다. 프로젝트에서 실행할 명령이 아닙니다.
