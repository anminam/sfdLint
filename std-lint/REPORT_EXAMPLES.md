# report 결과 예시

## JSON 파일로 확인하기

본문 예시와 함께 [실제 응답 JSON 파일](examples/reports/)도 제공합니다. [index.json](examples/reports/index.json)에는 예시별 입력·옵션·결과 분류·프로세스 종료 코드가, [report.schema.json](report.schema.json)에는 필드별 타입과 필수 항목이 있습니다. JSON Schema는 데이터 구조를 확인하며, 집계 합계는 생성 스크립트에서 별도로 검증합니다.

| 상황 | JSON |
| --- | --- |
| 정상 | [01-success](examples/reports/01-success.json) |
| 규칙 오류 | [02-rule-error](examples/reports/02-rule-error.json) |
| 문법 오류 | [03-syntax-error](examples/reports/03-syntax-error.json) |
| 경고 | [04-warning](examples/reports/04-warning.json) |
| 경고를 위반으로 분류 | [05-warning-classified](examples/reports/05-warning-classified.json) |
| 파일 없음 | [06-missing-file](examples/reports/06-missing-file.json) |
| 설정 없음 | [07-missing-config](examples/reports/07-missing-config.json) |
| 여러 파일의 정상·오류·경고 혼합 | [08-mixed](examples/reports/08-mixed.json) |

JSON 파일은 실제 API 결과에서 절대 경로만 `/project` 기준으로 치환한 값입니다. 아래 본문과 JSON 파일은 생성 시점의 실행 스택 등 일부 오류 문구가 다를 수 있으며, 실제 실행 환경에서도 문구는 달라질 수 있습니다. 저장소 루트의 `npm run examples:reports`로 8개 시나리오의 전체·전용 JSON 파일을 재생성하고 검증할 수 있습니다.

CLI `--format compact-json`은 summary까지 유지하고 오류 파일만 `report.errorFiles`로 모읍니다. 경고는 제외하고 파일별 여러 오류는 `errorMessages` 문자열 배열에 각각 담습니다. [여러 파일 혼합 전용 결과](examples/reports/08-mixed.compact.json), [경고만 있는 전용 결과](examples/reports/04-warning.compact.json), [전용 스키마](compact-report.schema.json)를 참고하세요. `index.json`의 `compactReportFile`은 각 시나리오의 전용 JSON 경로입니다. 전체 API 응답과 기존 `--format json`은 유지합니다.

## 본문 예시 읽는 방법

포함된 예제 파일을 ESLint 10.14.0 / Node.js 24.22.2에서 실제 검사한 결과입니다. 읽기 쉽도록 절대 경로의 예제 폴더를 `/project`, 모듈 폴더를 `/project/tools/std-lint`로 바꿨습니다. 오류 문구와 파일 경로 표기는 Node.js·운영체제·ESLint 버전에 따라 달라질 수 있습니다.

기본 옵션은 `{ cwd: '/project', configFile: './config/project-lint.cjs' }`입니다. 예제 소스 첫 줄이 주석이므로 위반 위치는 2행입니다.

`lintFiles()`와 `checkFiles()`는 아래 결과를 그대로 반환합니다. **알림 목적이므로 passed가 false여도 예외를 던지지 않으며 다음 단계로 진행합니다.** `exitCode`는 report의 분류 값이고, 예제 프로세스는 이 값을 종료 코드로 적용하지 않습니다. `formatReport(report)`의 콘솔 출력도 각 예시에 함께 적었습니다. 출력의 PASS/FAIL도 검사 기준 표시이며 빌드 중단을 의미하지 않습니다.

`report.version: 1`은 결과 스키마 버전이며 패키지 버전(2.2.1)과 다릅니다.

## 정상

입력: `['src/valid.js']`. 규칙 위반이 없으면 passed는 true이며 messages와 issues는 빈 배열입니다.

반환 객체:

```json
{
  "version": 1,
  "passed": true,
  "exitCode": 0,
  "summary": {
    "fileCount": 1,
    "lintedFileCount": 1,
    "failedFileCount": 0,
    "errorCount": 0,
    "warningCount": 0,
    "fatalErrorCount": 0
  },
  "files": [
    {
      "filePath": "/project/src/valid.js",
      "configFile": "/project/config/project-lint.cjs",
      "status": "linted",
      "errorCount": 0,
      "warningCount": 0,
      "fatalErrorCount": 0,
      "messages": []
    }
  ],
  "issues": []
}
```

`formatReport(report)` 출력:

```text
std-lint: PASS | files 1, linted 1, errors 0, warnings 0, failed 0
```

## 규칙 오류

입력: `['src/invalid.js']`. 선언되지 않은 전역 이름을 사용한 경우입니다. 파일 검사는 수행됐으므로 status는 linted이며, 오류는 messages에 들어갑니다.

반환 객체:

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

`formatReport(report)` 출력:

```text
/project/src/invalid.js:2:14 error 'notRegistered' is not defined. (no-undef)
std-lint: FAIL | files 1, linted 1, errors 1, warnings 0, failed 0
```

## 문법 오류

입력: `['src/syntax-error.js']`. 괄호 누락 등의 파싱 실패입니다. ruleId는 null, fatal은 true이며 fatalErrorCount는 errorCount에도 포함됩니다.

반환 객체:

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
    "fatalErrorCount": 1
  },
  "files": [
    {
      "filePath": "/project/src/syntax-error.js",
      "configFile": "/project/config/project-lint.cjs",
      "status": "linted",
      "errorCount": 1,
      "warningCount": 0,
      "fatalErrorCount": 1,
      "messages": [
        {
          "ruleId": null,
          "fatal": true,
          "severity": 2,
          "message": "Parsing error: Unexpected token ;",
          "line": 2,
          "column": 43
        }
      ]
    }
  ],
  "issues": []
}
```

`formatReport(report)` 출력:

```text
/project/src/syntax-error.js:2:43 error Parsing error: Unexpected token ;
std-lint: FAIL | files 1, linted 1, errors 1, warnings 0, failed 0
```

## 경고만 발생

입력: `['src/warning.js']`. 기본 정책에서는 경고가 있어도 passed는 true입니다. suggestions는 ESLint 제안이며 소스에 자동 적용하지 않습니다.

반환 객체:

```json
{
  "version": 1,
  "passed": true,
  "exitCode": 0,
  "summary": {
    "fileCount": 1,
    "lintedFileCount": 1,
    "failedFileCount": 0,
    "errorCount": 0,
    "warningCount": 1,
    "fatalErrorCount": 0
  },
  "files": [
    {
      "filePath": "/project/src/warning.js",
      "configFile": "/project/config/project-lint.cjs",
      "status": "linted",
      "errorCount": 0,
      "warningCount": 1,
      "fatalErrorCount": 0,
      "messages": [
        {
          "ruleId": "no-unused-vars",
          "severity": 1,
          "message": "'unusedValue' is assigned a value but never used.",
          "line": 2,
          "column": 5,
          "messageId": "unusedVar",
          "endLine": 2,
          "endColumn": 16,
          "suggestions": [
            {
              "messageId": "removeVar",
              "data": {
                "varName": "unusedValue"
              },
              "fix": {
                "range": [
                  40,
                  60
                ],
                "text": ""
              },
              "desc": "Remove unused variable 'unusedValue'."
            }
          ]
        }
      ]
    }
  ],
  "issues": []
}
```

`formatReport(report)` 출력:

```text
/project/src/warning.js:2:5 warning 'unusedValue' is assigned a value but never used. (no-unused-vars)
std-lint: PASS | files 1, linted 1, errors 0, warnings 1, failed 0
```

## 경고도 실패로 처리

입력: `['src/warning.js']`, 추가/변경 옵션: `{"failOnWarning":true}`. 같은 경고라도 failOnWarning이 true이면 passed는 false이고 exitCode는 1입니다.

반환 객체:

```json
{
  "version": 1,
  "passed": false,
  "exitCode": 1,
  "summary": {
    "fileCount": 1,
    "lintedFileCount": 1,
    "failedFileCount": 0,
    "errorCount": 0,
    "warningCount": 1,
    "fatalErrorCount": 0
  },
  "files": [
    {
      "filePath": "/project/src/warning.js",
      "configFile": "/project/config/project-lint.cjs",
      "status": "linted",
      "errorCount": 0,
      "warningCount": 1,
      "fatalErrorCount": 0,
      "messages": [
        {
          "ruleId": "no-unused-vars",
          "severity": 1,
          "message": "'unusedValue' is assigned a value but never used.",
          "line": 2,
          "column": 5,
          "messageId": "unusedVar",
          "endLine": 2,
          "endColumn": 16,
          "suggestions": [
            {
              "messageId": "removeVar",
              "data": {
                "varName": "unusedValue"
              },
              "fix": {
                "range": [
                  40,
                  60
                ],
                "text": ""
              },
              "desc": "Remove unused variable 'unusedValue'."
            }
          ]
        }
      ]
    }
  ],
  "issues": []
}
```

`formatReport(report)` 출력:

```text
/project/src/warning.js:2:5 warning 'unusedValue' is assigned a value but never used. (no-unused-vars)
std-lint: FAIL | files 1, linted 1, errors 0, warnings 1, failed 0
```

## 파일 읽기 실패

입력: `['src/missing.js']`. 실제 검사가 수행되지 않았으므로 status는 failed입니다. 실패는 messages 대신 issues에 기록됩니다. errorCount가 0이어도 통과가 아닙니다.

반환 객체:

```json
{
  "version": 1,
  "passed": false,
  "exitCode": 2,
  "summary": {
    "fileCount": 1,
    "lintedFileCount": 0,
    "failedFileCount": 1,
    "errorCount": 0,
    "warningCount": 0,
    "fatalErrorCount": 0
  },
  "files": [
    {
      "filePath": "/project/src/missing.js",
      "configFile": "/project/config/project-lint.cjs",
      "status": "failed",
      "errorCount": 0,
      "warningCount": 0,
      "fatalErrorCount": 0,
      "messages": []
    }
  ],
  "issues": [
    {
      "filePath": "/project/src/missing.js",
      "configFile": "/project/config/project-lint.cjs",
      "stage": "read",
      "code": "ENOENT",
      "message": "ENOENT: no such file or directory, open '/project/src/missing.js'"
    }
  ]
}
```

`formatReport(report)` 출력:

```text
/project/src/missing.js [read/ENOENT] ENOENT: no such file or directory, open '/project/src/missing.js'
std-lint: FAIL | files 1, linted 0, errors 0, warnings 0, failed 1
```

## 설정 파일 없음

입력: `['src/valid.js']`, 추가/변경 옵션: `{"configFile":"./config/not-found.cjs"}`. 입력 파일을 읽었지만 지정된 설정을 불러오지 못한 경우입니다. issues의 stage는 config이고 exitCode는 2입니다.

반환 객체:

```json
{
  "version": 1,
  "passed": false,
  "exitCode": 2,
  "summary": {
    "fileCount": 1,
    "lintedFileCount": 0,
    "failedFileCount": 1,
    "errorCount": 0,
    "warningCount": 0,
    "fatalErrorCount": 0
  },
  "files": [
    {
      "filePath": "/project/src/valid.js",
      "configFile": "/project/config/not-found.cjs",
      "status": "failed",
      "errorCount": 0,
      "warningCount": 0,
      "fatalErrorCount": 0,
      "messages": []
    }
  ],
  "issues": [
    {
      "filePath": "/project/src/valid.js",
      "configFile": "/project/config/not-found.cjs",
      "stage": "config",
      "code": "MODULE_NOT_FOUND",
      "message": "Cannot find module '/project/config/not-found.cjs'\nRequire stack:\n- /project/tools/std-lint/index.cjs\n- /project/[stdin]"
    }
  ]
}
```

`formatReport(report)` 출력:

```text
/project/src/valid.js [config/MODULE_NOT_FOUND] Cannot find module '/project/config/not-found.cjs'
Require stack:
- /project/tools/std-lint/index.cjs
- /project/[stdin]
std-lint: FAIL | files 1, linted 0, errors 0, warnings 0, failed 1
```
