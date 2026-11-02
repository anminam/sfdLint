# 예제 실행 가이드

## 1. 준비하기

Node.js `^20.19.0`, `^22.13.0`, `>=24.0.0` 중 하나가 필요합니다. `std-lint` 폴더에는 ESLint 의존성이 포함되어 있으므로 npm 설치 없이 실행합니다.

아래 명령은 **저장소 루트**에서 실행합니다. 이 폴더를 프로젝트의 `tools/std-lint`로 복사했다면 명령의 `std-lint/` 부분을 `tools/std-lint/`로 바꾸세요.

## 2. 바로 실행하기

| 목적 | 명령 | 예상 종료 코드 |
| --- | --- | --- |
| CommonJS 정상 검사 | `node std-lint/examples/commonjs.cjs` | 0 |
| ESM 정상 검사 | `node std-lint/examples/esm.mjs` | 0 |
| 선언되지 않은 변수 | `node std-lint/examples/commonjs.cjs src/invalid.js` | 1 |
| 문법 오류 | `node std-lint/examples/commonjs.cjs src/syntax-error.js` | 1 |
| 미사용 변수 경고 | `node std-lint/examples/commonjs.cjs src/warning.js` | 0 |
| 여러 파일 검사 | `node std-lint/examples/commonjs.cjs src/valid.js src/invalid.js` | 1 |
| 없는 파일 | `node std-lint/examples/commonjs.cjs src/missing.js` | 2 |
| 정상 파이프라인 실행 흐름 | `node std-lint/examples/pipeline.cjs` | 0 |
| 오류로 다음 단계 중단 | `node std-lint/examples/pipeline.cjs src/invalid.js` | 1 |

경고만 있으면 기본적으로 통과합니다. 경고도 실패로 처리하려면 예제 코드의 `failOnWarning`을 `true`로 바꾸세요.

예제 스크립트는 `cwd`를 `examples` 폴더로 고정합니다. 따라서 명령 뒤에 넣는 `src/invalid.js`도 **examples 기준** 경로입니다. 실제 회사 파일은 절대 경로로 전달하거나, 코드를 복사한 뒤 `cwd`를 회사 프로젝트 루트로 바꾸세요.

검사 결과는 다음 형식입니다. 절대 경로는 실행한 컴퓨터마다 다릅니다.

```text
/.../src/invalid.js:2:14 error 'notRegistered' is not defined. (no-undef)
std-lint: FAIL | files 1, linted 1, errors 1, warnings 0, failed 0
```

`src/syntax-error.js`는 검사 동작을 확인하기 위해 의도적으로 문법 오류를 넣은 파일입니다. 실행 대상 JS나 회사의 빌드 파일 목록에 포함하지 마세요.

## 3. 회사 프로젝트에 연결하기

다음처럼 배치할 수 있습니다. 회사별 설정은 업데이트 시 교체하는 `tools/std-lint` 밖에 둡니다.

```text
my-project/
├── build.cjs
├── config/
│   └── company-lint.cjs
├── src/
│   └── app.js
└── tools/
    └── std-lint/          ← vendor를 포함한 폴더 전체 복사
```

`config/company-lint.cjs`는 [설정 예제](config/company-lint.cjs)를 참고해 작성합니다. 이름과 위치는 자유롭게 지정할 수 있습니다.

`build.cjs`에 다음 코드를 넣고 표시된 지점에서 기존 Uglify 함수를 호출합니다.

```js
const path = require('node:path');
const { lintFiles, formatReport, assertPassed } = require('./tools/std-lint');

async function main() {
  // 배열 원소를 절대 경로로 만들어 검사와 Uglify의 경로 기준을 맞춥니다.
  const files = ['src/app.js'].map(file => path.resolve(__dirname, file));
  const report = await lintFiles(files, {
    cwd: __dirname,
    configFile: './config/company-lint.cjs',
    failOnWarning: false,
  });

  console.log(formatReport(report));
  assertPassed(report);

  // 이 지점에서 기존 Uglify 함수에 files를 전달합니다.
  // await yourExistingUglify(files);
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = error.exitCode || 2;
});
```

실제 Uglify 패키지는 이 모듈에 포함하지 않습니다. [pipeline.cjs](pipeline.cjs)는 기존 압축 함수를 인자로 받아 검사에 통과한 경우에만 호출하는 예제입니다. 이 파일을 직접 실행하면 흐름을 확인하는 대체 함수가 호출됩니다.

## 4. 설정 파일 이름과 경로 바꾸기

호출 코드의 `configFile`만 수정하세요. 모듈 내부를 고칠 필요가 없습니다.

```js
const report = await lintFiles(files, {
  cwd: projectRoot,
  configFile: './settings/my-team-lint.cjs',
});
```

`configFile` 상대 경로는 `cwd` 기준입니다. 절대 경로도 가능합니다. 생략하면 대상 파일의 상위 폴더에서 기본 이름 `stdLintConfig.js`, `.cjs`, `.mjs`를 찾습니다.

설정의 `env`는 browser/node 같은 실행 환경을, `globals`는 회사 전역 이름을, `rules`는 검사 규칙과 심각도를 지정합니다. `parserOptions`는 허용하는 JavaScript 문법 버전을 지정합니다. CommonJS 설정은 `module.exports = { ... }`, ESM 설정은 `export default { ... }`로 작성합니다.

## 5. 결과를 프로그램에서 사용하기

`lintFiles()`는 실패해도 결과 객체를 반환합니다. `report.passed`로 분기하거나 `assertPassed(report)`로 예외를 던져 다음 단계를 막으세요.

| 값 | 용도 |
| --- | --- |
| `report.passed` | 다음 빌드 단계 진행 여부 |
| `report.exitCode` | 0: 성공, 1: 검사 위반, 2: 실행/설정 실패 |
| `report.summary` | 파일 수, 오류 수, 경고 수 |
| `report.files[].messages` | 파일별 줄·열·규칙·메시지 |
| `report.issues` | 파일 읽기 실패, 설정 오류 등 |
| `formatReport(report)` | 사람이 읽는 콘솔 출력 |

JSON 파일로 저장하려면 다음처럼 실행합니다. 기본 JSON 예제는 오류 파일을 검사하므로 **JSON을 저장한 뒤 종료 코드 1을 반환**하는 것이 정상입니다.

```sh
node std-lint/examples/json-report.cjs > lint-report.json
node std-lint/examples/json-report.cjs src/valid.js > lint-report.json
```

반환 객체 전체와 추가 동작은 [API 매뉴얼](../README.md#반환-형식)을 참고하세요.

## 6. 자주 막히는 부분

- `CONFIG_NOT_FOUND`: `configFile`을 지정하거나 기본 이름의 설정을 대상 파일 상위에 두세요.
- `ENOENT`: 파일 경로와 `cwd`를 확인하세요. 파일 배열에 폴더나 `src/*.js` 같은 glob을 넣으면 안 됩니다.
- `FILE_NOT_LINTED`: ignore 설정 또는 ESLint 기본 제외 대상인지 확인하고, 제외할 파일은 입력 배열에서 빼세요.
- `module.exports`/`export` 관련 오류: `.cjs`는 CommonJS, `.mjs`는 ESM으로 작성하세요. `.js`는 프로젝트의 `package.json` 설정을 따릅니다.
- Uglify가 실패했는데 lint는 통과함: `parserOptions.ecmaVersion`을 Uglify 지원 문법에 맞추고 실제 압축 오류도 별도로 처리하세요.
- 외부 플러그인/파서가 없음: 현재 배포본은 ESLint 기본 규칙과 기본 파서를 포함합니다. 외부 플러그인은 별도 vendor 구성이 필요합니다.

보안 점검과 기존 환경과의 호환성 확인 항목은 [KNOWN_ISSUES.md](../KNOWN_ISSUES.md)를 참고하세요.
