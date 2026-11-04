# temp_files.txt로 빌드 명령에 연결하기

`npm run` 또는 Node.js 명령으로 실행하고, UTF-8 텍스트 파일에서 검사 경로를 읽습니다. 쉼표와 줄바꿈을 혼합할 수 있습니다. 문법·규칙 오류뿐 아니라 목록·설정·의존성 문제도 알림으로 남기고 이 CLI 프로세스는 정상 종료(0)합니다.

## 1. 프로젝트에 배치하기

예를 들어 프로젝트가 `/workspace/aa`라면 다음처럼 둘 수 있습니다. 목록 파일과 설정 파일은 원하는 위치에 둘 수 있습니다.

```text
/workspace/
└── aa/
    ├── package.json
    ├── bb/cc.js
    ├── cc/dd.js
    ├── build/temp_files.txt
    ├── config/project-lint.cjs
    └── tool/std-lint/           ← vendor를 포함한 모듈 전체
```

`build/temp_files.txt`:

```text
aa/bb/cc.js
aa/cc/dd.js, aa/cc/ee.js
```

각 항목의 앞뒤 공백과 빈 항목은 무시합니다. Windows CRLF, UTF-8 BOM도 지원합니다. 경로에 공백이 있어도 그대로 사용할 수 있습니다. **경로 자체에 쉼표가 있으면** `"aa/cc/file,part.js"`처럼 큰따옴표로 감싸세요. 큰따옴표 자체는 `""`로 표현합니다. glob과 폴더 경로는 확장하지 않으며, 따옴표가 닫히지 않은 잘못된 목록은 알림 생성 문제로 표시합니다.

목록에 HTML·텍스트·CSS·이미지가 섞여 있어도 됩니다. `.js`, `.cjs`, `.mjs`, `.jsx`만 검사하고 다른 확장자는 무시합니다. ESLint가 ignore 또는 매칭 설정 없음으로 제외한 파일도 오류·경고에 넣지 않습니다. compact-json의 `errorFiles`·`isError`에 반영하지 않으며 전체 JSON에는 `status: 'ignored'`로 표시합니다. summary의 `fileCount`에는 포함하지만 검사·실패 개수에는 포함하지 않습니다.

## 2. 터미널에서 실행하기

`aa` 폴더에서 실행합니다.

```sh
node tool/std-lint/cli.cjs --file-list ./build/temp_files.txt --cwd .. --config ./config/project-lint.cjs
```

목록의 경로가 이미 `aa/`로 시작하므로 `--cwd ..`를 지정합니다. 위 명령에서 `aa/bb/cc.js`는 `/workspace/aa/bb/cc.js`로 해석됩니다.

목록이 `bb/cc.js`처럼 프로젝트 이름을 포함하지 않으면 `--cwd .`를 사용하세요. 절대 경로인 항목은 그대로 검사합니다.

## 3. npm run으로 실행하기

프로젝트 루트 `aa/package.json`의 기존 `scripts`에 다음 항목을 추가합니다.

```json
{
  "scripts": {
    "lint:notify": "node tool/std-lint/cli.cjs --file-list ./build/temp_files.txt --cwd .. --config ./config/project-lint.cjs"
  }
}
```

```sh
npm run lint:notify
```

기존 `npm run riabuild`를 실행할 때 먼저 알림을 받고 싶으면 다음 항목도 추가합니다. **기존 riabuild 명령은 유지**하세요. npm은 `preriabuild`를 `riabuild` 전에 실행합니다. 이미 `preriabuild`가 있다면 그 명령에 `npm run lint:notify`를 연결하세요.

```json
{
  "scripts": {
    "lint:notify": "node tool/std-lint/cli.cjs --file-list ./build/temp_files.txt --cwd .. --config ./config/project-lint.cjs",
    "preriabuild": "npm run lint:notify"
  }
}
```

이 두 항목을 기존 scripts에 병합한 뒤 원래 명령을 실행합니다.

```sh
npm run riabuild
```

목록 파일은 명령 실행 **전에 생성이 완료**되어 있어야 합니다. `riabuild` 실행 도중에 목록을 만드는 구조라면, 위 사전 실행 방식 대신 목록을 만든 직후 `npm run lint:notify`를 호출하세요. 목록 파일은 읽기만 하며 삭제하거나 수정하지 않습니다.

## 4. execSync로 호출하기

호출 코드의 `inPath`가 `aa` 프로젝트 루트라면 다음처럼 사용할 수 있습니다.

```js
const { execSync } = require('node:child_process');

const lintOutput = execSync('npm run lint:notify', {
  cwd: inPath,
  encoding: 'utf8',
  env: { ...process.env },
});
console.log(lintOutput); // execSync가 반환한 stdout을 출력해야 알림을 볼 수 있습니다.

// 이후 기존 빌드 코드를 계속 실행합니다.
```

기존 `riabuild`에 `preriabuild`를 연결한 경우에는 기존 `execSync('npm run riabuild', ...)` 호출을 유지하면 됩니다. 기존에 PATH 등을 추가하는 env 설정이 있다면 해당 설정도 유지하세요.

이 CLI는 검사 결과 때문에 비정상 종료하지 않으므로 문법·규칙 오류만으로 `execSync`의 catch로 이동하지 않습니다. Node.js/npm 실행 실패나 실제 Uglify 자체의 실패는 해당 도구의 호출 코드에서 별도로 처리합니다.

## 5. 옵션과 경로 기준

| 옵션 | 기본값 | 의미 |
| --- | --- | --- |
| `--file-list` | `./temp_files.txt` | 목록 파일 경로 |
| `--cwd` | 명령 실행 폴더 | 목록 안의 상대 파일 경로 기준 |
| `--config` | 자동 탐색 | 사용할 ESLint 형식 설정 파일 |
| `--format` | `text` | stdout 형식: `text`, `json`, `compact-json` |
| `--report` | 없음 | JSON 저장 경로. compact-json 선택 시 전용 형식, 나머지는 전체 형식 |
| `--help` | 없음 | 도움말 |

**`--file-list`, `--config`, `--report`의 상대 경로는 명령을 실행한 폴더 기준**입니다. `--cwd`는 목록 안의 경로 기준만 바꿉니다. `--config`를 생략하면 각 대상 파일 상위에서 `stdLintConfig.js`, `.cjs`, `.mjs`를 탐색합니다.

## 6. JSON 출력과 저장

```sh
node tool/std-lint/cli.cjs --file-list ./build/temp_files.txt --cwd .. --config ./config/project-lint.cjs --format json
node tool/std-lint/cli.cjs --file-list ./build/temp_files.txt --cwd .. --config ./config/project-lint.cjs --report ./lint-report.json
```

정상적으로 검사를 시작하면 [기존 report 형식](README.md#반환-형식)을 그대로 출력합니다. `report.passed: false`, `report.exitCode: 1/2`여도 CLI 프로세스 종료 코드는 0입니다.

### 오류 파일만 담은 전용 JSON

`--format compact-json`을 지정하면 `version`, `passed`, `exitCode`, `summary`는 기존 값 그대로 두고, 기존 `files`·`issues` 대신 아래 `report`를 반환합니다. 예를 들어 파일 3개 중 한 파일에 오류 2개, 다른 파일에 경고 1개가 있으면 다음 형태입니다.

```json
{
  "version": 1,
  "passed": false,
  "exitCode": 1,
  "summary": {
    "fileCount": 3,
    "lintedFileCount": 3,
    "failedFileCount": 0,
    "errorCount": 2,
    "warningCount": 1,
    "fatalErrorCount": 0
  },
  "report": {
    "isError": true,
    "errorFiles": [
      {
        "filePath": "/workspace/aa/bb/cc.js",
        "errorMessages": [
          "'a' is not defined.",
          "'b' is not defined."
        ]
      }
    ]
  }
}
```

- `report.isError`는 오류 또는 검사 실행 문제가 하나라도 있으면 `true`입니다. 경고만 있으면 `false`입니다.
- `errorFiles`는 오류가 있는 파일만 입력 순서대로 담습니다. 경고와 정상 파일은 제외합니다.
- 파일별 `errorMessages`는 severity 2인 오류 메시지 문자열의 배열입니다. 오류 하나당 항목 하나를 담고 문법 오류도 포함합니다.
- 파일 읽기·설정 문제는 기존 `issues`의 메시지를 해당 파일의 `errorMessages` 배열에 추가합니다.
- 경고는 상세 목록에서 제외하지만 기존 `summary.warningCount`는 유지합니다. 경고만 있으면 `report`는 `{ "isError": false, "errorFiles": [] }`입니다.
- 파일 경로는 기존 응답처럼 절대 경로입니다. 이 형식도 알림용이며 프로세스는 정상 종료(0)합니다.

```sh
node tool/std-lint/cli.cjs --file-list ./build/temp_files.txt --cwd .. --config ./config/project-lint.cjs --format compact-json
```

기존 npm script를 통해 호출할 때도 옵션만 추가하면 됩니다. `--silent`는 npm 실행 안내를 숨겨 stdout을 JSON으로 받도록 합니다.

```sh
npm run --silent lint:notify -- --format compact-json
```

`execSync`로 전용 객체를 받는 예제입니다.

```js
const { execSync } = require('node:child_process');

const output = execSync('npm run --silent lint:notify -- --format compact-json', {
  cwd: inPath,
  encoding: 'utf8',
  env: { ...process.env },
});
const result = JSON.parse(output);
console.log(result?.report?.errorFiles ?? []);
// 오류 유무와 관계없이 기존 빌드는 계속 진행합니다.
```

`--report ./lint-report.json`도 함께 지정하면 stdout과 동일한 전용 객체를 저장합니다. 실제 결과 파일: [여러 파일 혼합](examples/reports/08-mixed.compact.json), [경고만 있음](examples/reports/04-warning.compact.json). 형식 검증에는 [compact-report.schema.json](compact-report.schema.json)과 참조하는 [report.schema.json](report.schema.json)을 함께 사용합니다.

목록 파일 읽기·파싱 문제 또는 vendor 누락으로 검사를 시작하지 못하면 stderr에 이유를 출력합니다. `--format json` 또는 `--format compact-json`이 적용된 상태에서는 stdout에 `null`을 출력합니다. `--report`를 지정했다면 그 경우 JSON 파일에도 `null`을 저장합니다. report 저장 경로는 목록·소스·설정 파일과 다른 경로로 지정하고 상위 폴더는 미리 만들어 두세요. 저장 실패도 stderr로 알리고 빌드는 계속 진행합니다.

빈 목록은 파일 0개 결과를 반환합니다. 잘못된 옵션도 stderr로 알리며 정상 종료하므로, 옵션을 처음 연결할 때 출력과 검사 파일 수를 확인하세요. JSON Schema 검증은 `null`이 아닌 실제 report에 적용합니다.

npm으로 순수 JSON을 받고 싶으면 npm의 실행 안내를 숨깁니다.

```sh
npm run --silent lint:notify -- --format json
```

## 7. 포함된 목록으로 먼저 테스트하기

이 저장소 루트에서 실행합니다. 예제 목록에는 정상·규칙 위반·import/export·문법 오류가 섞여 있습니다.

```sh
npm run lint:notify -- --file-list std-lint/examples/temp_files.txt --cwd std-lint/examples --config std-lint/examples/config/project-lint.cjs
```

문법 오류가 표시돼도 정상 종료(0)하면 알림 목적에 맞게 동작한 것입니다.
