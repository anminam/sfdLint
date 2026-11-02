# std-lint

Uglify 실행 전에 파일 경로 배열을 검사하는 Node.js 모듈입니다. `stdLintConfig.js`의 기존 ESLint 설정을 공식 `FlatCompat`로 변환하고 ESLint로 검사합니다.

## 빠른 시작: 회사 프로젝트에서 사용하기

### 1. 폴더 복사하기

GitHub의 **Code → Download ZIP**으로 내려받거나 이 저장소를 clone합니다. 내려받은 저장소 안에서 **`vendor`가 들어 있는 `std-lint/` 폴더 전체**를 회사 프로젝트의 `tools/std-lint/`로 복사하세요. `vendor/node_modules`도 반드시 포함합니다. 회사 프로젝트에서 npm 설치나 네트워크 접속은 필요 없습니다.

```text
my-project/
├── build.cjs                   ← 검사 실행 코드
├── config/
│   └── company-lint.cjs         ← 회사별 설정 (이름·경로 자유)
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

`config/company-lint.cjs`를 만듭니다. 기존 ESLint 설정처럼 작성하세요.

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
- `globals`: 회사 코드의 전역 이름을 등록합니다. 위 설정의 `STD`를 회사에서 쓰는 이름으로 바꾸세요. `readonly`는 대입을 금지합니다.
- `extends`: ESLint 권장 규칙을 적용합니다.
- `parserOptions`: 허용할 문법 버전과 script/module 형식입니다. 회사 Uglify가 처리할 수 있는 문법에 맞추세요.
- `rules`: 규칙별로 `off`, `warn`, `error`를 지정합니다.

이 예제는 `.cjs`를 사용하므로 회사 프로젝트의 `type: module` 여부와 관계없이 `module.exports`로 작성할 수 있습니다. `.mjs` 설정은 `export default { ... }`로 작성합니다.

### 3. 검사 실행 코드 작성하기 (CommonJS)

프로젝트 루트에 `build.cjs`를 만듭니다.

```js
const path = require('node:path');
const { lintFiles, formatReport, assertPassed } = require('./tools/std-lint');

async function main() {
  // 검사할 파일 경로 배열입니다. 폴더나 glob은 넣지 않습니다.
  const files = ['src/app.js'].map(file => path.resolve(__dirname, file));

  const report = await lintFiles(files, {
    cwd: __dirname,
    configFile: './config/company-lint.cjs',
    failOnWarning: false,
  });

  console.log(formatReport(report));
  assertPassed(report); // 오류가 있으면 예외를 던져 아래 단계 중단

  // 기존 Uglify 호출을 이 위치로 옮기고 files를 전달하세요.
  // await runExistingUglify(files);
  console.log('검사 통과: 다음 빌드 단계를 실행할 수 있습니다.');
}

main().catch(error => {
  if (error.code !== 'STD_LINT_FAILED') console.error(error.message);
  process.exitCode = error.exitCode || 2;
});
```

파일이 여러 개면 `['src/app.js', 'src/common.js']`처럼 배열에 추가하면 됩니다. `lintFiles()`는 검사 결과를 반환하며, **`assertPassed(report)`를 호출해야 검사 실패 시 다음 단계가 중단**됩니다. `report.passed`를 직접 확인해 분기하는 방법도 있습니다.

### 4. 실행하고 결과 확인하기

먼저 `src/app.js`에 다음 코드를 넣어 정상 동작을 확인합니다.

```js
window.alert(STD.version);
```

회사 프로젝트 루트에서 실행합니다. 예제의 소스는 lint가 읽기만 하므로 브라우저나 `STD` 객체를 실제로 실행 환경에 만들 필요는 없습니다.

```sh
node build.cjs
```

```text
std-lint: PASS | files 1, linted 1, errors 0, warnings 0, failed 0
검사 통과: 다음 빌드 단계를 실행할 수 있습니다.
```

이제 `src/app.js`를 다음처럼 바꾸고 다시 실행해 보세요.

```js
window.alert(notRegistered);
```

파일 경로는 실행 환경에 따라 달라집니다. 이 경우 종료 코드는 1이고, `assertPassed()` 아래의 Uglify 단계는 실행되지 않습니다.

```text
/.../src/app.js:1:14 error 'notRegistered' is not defined. (no-undef)
std-lint: FAIL | files 1, linted 1, errors 1, warnings 0, failed 0
```

## import로 사용하기 (ESM)

위 폴더 배치와 설정을 그대로 두고 `build.mjs`를 다음처럼 작성할 수 있습니다. 로컬 ESM import는 `index.mjs`까지 지정합니다.

```js
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintFiles, formatReport, assertPassed } from './tools/std-lint/index.mjs';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

async function main() {
  const files = ['src/app.js'].map(file => path.resolve(projectRoot, file));
  const report = await lintFiles(files, {
    cwd: projectRoot,
    configFile: './config/company-lint.cjs',
    failOnWarning: false,
  });

  console.log(formatReport(report));
  assertPassed(report);

  // await runExistingUglify(files);
  console.log('검사 통과: 다음 빌드 단계를 실행할 수 있습니다.');
}

main().catch(error => {
  if (error.code !== 'STD_LINT_FAILED') console.error(error.message);
  process.exitCode = error.exitCode || 2;
});
```

```sh
node build.mjs
```

## 이름·경로·실패 조건 바꾸기

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
| `failOnWarning` | `false`면 경고만 있을 때 통과(기본값). `true`면 경고도 실패 |

`configFile`을 생략하면 각 대상 파일의 폴더부터 상위 폴더로 올라가며 가장 가까운 `stdLintConfig.js`, `.cjs`, `.mjs`를 찾습니다. 회사 빌드에서는 `configFile`을 명시하는 것을 권장합니다.

## 결과를 프로그램에서 사용하기

`report`는 JSON으로 저장할 수 있는 객체입니다.

| 항목 | 의미 |
| --- | --- |
| `report.passed` | 검사 통과 여부 |
| `report.exitCode` | 0: 통과, 1: 문법·규칙 위반, 2: 파일·설정·검사 실행 실패 |
| `report.summary` | 검사 파일 수, 오류 수, 경고 수 |
| `report.files[].messages` | 파일별 줄·열·규칙·메시지 |
| `report.issues` | 없는 파일, 잘못된 설정 등 실행 실패 정보 |

`formatReport(report)`는 콘솔에 출력할 문자열을 만들고, `assertPassed(report)`는 실패 시 `StdLintError`를 던집니다. 라이브러리 자체가 프로세스를 종료하지는 않으며 위 예제의 `catch`에서 종료 코드를 설정합니다. [반환 객체 전체 예시](std-lint/README.md#반환-형식)

## 매뉴얼과 실행 예제

저장소에는 아래 예제가 이미 들어 있습니다. 저장소 루트에서 바로 실행해 볼 수 있습니다.

```sh
node std-lint/examples/commonjs.cjs
node std-lint/examples/esm.mjs
node std-lint/examples/commonjs.cjs src/invalid.js
```

| 필요한 내용 | 문서 / 예제 |
| --- | --- |
| 예제별 명령과 예상 결과, 문제 해결 | [예제 실행 가이드](std-lint/examples/README.md) |
| 전체 API와 설정 동작 | [사용 매뉴얼](std-lint/README.md) |
| `require()` / `import` 예제 | [commonjs.cjs](std-lint/examples/commonjs.cjs) / [esm.mjs](std-lint/examples/esm.mjs) |
| 기존 Uglify 함수를 전달하는 연결 예제 | [pipeline.cjs](std-lint/examples/pipeline.cjs) |
| JSON 결과 출력 | [json-report.cjs](std-lint/examples/json-report.cjs) |
| 설정 파일 | [company-lint.cjs](std-lint/examples/config/company-lint.cjs) |

포함된 엔진은 ESLint 10.14.0이며 기본 규칙과 기본 파서를 제공합니다. 외부 플러그인·파서·공유 설정은 별도 vendor 구성이 필요합니다. 기존 ESLint 버전과의 결과 비교, 의존성 보안 점검 등은 [확인된 제한 사항](std-lint/KNOWN_ISSUES.md)을 참고하세요.

## 개발 및 배포

```sh
npm test
npm run release
```

테스트와 배포에도 npm 의존성 설치가 필요 없습니다. `npm run release`는 `dist/std-lint-1.0.0/std-lint/` 폴더와 `dist/std-lint-1.0.0.tar.gz`를 만듭니다. 복사해서 쓸 코드는 `std-lint/` 안에만 있습니다.

## Git으로 업데이트하기

`vendor/node_modules`는 외부 설치가 불가능한 사용 환경을 위해 의도적으로 Git에 포함합니다. 의존성의 LICENSE와 고지 파일을 유지하세요. Git 호스팅에서 받은 소스 압축파일에서도 모듈을 바로 사용할 수 있습니다.

1. 소스와 테스트를 수정합니다.
2. `npm test`를 실행합니다.
3. 배포 시 `std-lint/package.json` 버전을 올리고 변경 사항을 `std-lint/CHANGELOG.md`에 기록합니다.
4. `npm run release` 후 Git 커밋과 버전 태그를 만듭니다.
5. 회사 프로젝트에서는 해당 버전의 `tools/std-lint` 폴더 **전체를 교체**합니다. 회사별 설정 파일은 이 폴더 밖에 두세요.

의존성을 업데이트할 때만 인터넷이 되는 개발 환경에서 다음을 실행합니다. 버전은 검토한 정확한 버전으로 지정하고, 변경된 lockfile과 vendor 폴더도 커밋합니다.

```sh
npm install --prefix std-lint/vendor --save-exact eslint@<version> @eslint/eslintrc@<version> @eslint/js@<version> --omit=dev --ignore-scripts
npm test
```

lockfile로 vendor를 다시 구성하려면 `npm ci --prefix std-lint/vendor --omit=dev --ignore-scripts`를 사용합니다. 이 명령은 개발 환경에서만 실행합니다. 회사 프로젝트에서 실행할 명령이 아닙니다.

원격 Git 저장소: [anminam/std-lint](https://github.com/anminam/std-lint)
