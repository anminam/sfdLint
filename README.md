# std-lint

Uglify 실행 전에 파일 경로 배열을 검사하는 Node.js 모듈입니다. `stdLintConfig.js`의 기존 ESLint 설정을 공식 `FlatCompat`로 변환하고 ESLint로 검사합니다.

## 매뉴얼과 실행 예제

| 필요한 내용 | 문서 / 예제 |
| --- | --- |
| 처음 실행하기, CommonJS와 ESM, 오류 결과 확인 | [예제 실행 가이드](std-lint/examples/README.md) |
| 전체 API, 설정 옵션, 반환 객체, 종료 코드 | [사용 매뉴얼](std-lint/README.md) |
| `require()`로 불러오기 | [commonjs.cjs](std-lint/examples/commonjs.cjs) |
| `import`로 불러오기 | [esm.mjs](std-lint/examples/esm.mjs) |
| 기존 Uglify 함수 앞에 검사 연결하기 | [pipeline.cjs](std-lint/examples/pipeline.cjs) |
| JSON 결과 출력하기 | [json-report.cjs](std-lint/examples/json-report.cjs) |
| 설정 파일 예시 | [company-lint.cjs](std-lint/examples/config/company-lint.cjs) |

저장소를 받은 후 아래 명령으로 바로 실행할 수 있습니다. 설치 과정은 없습니다.

```sh
node std-lint/examples/commonjs.cjs
node std-lint/examples/esm.mjs
```

## 회사 프로젝트에 넣기

이 저장소의 **`std-lint` 폴더 전체**를 프로젝트의 `tools/std-lint` 등에 복사하세요. `vendor/node_modules`까지 포함해야 합니다. 회사 프로젝트에서는 npm 설치나 네트워크 접속이 필요 없습니다. Node.js는 필요합니다.

지원 런타임: Node.js `^20.19.0`, `^22.13.0`, `>=24.0.0`. 회사의 실제 Node.js와 기존 ESLint 버전은 별도로 확인해야 합니다. 현재 포함된 엔진은 ESLint 10.14.0이며, 이전 ESLint와 검사 규칙·메시지가 완전히 같다고 보장하지 않습니다.

복사 후 사용법은 [std-lint/README.md](std-lint/README.md)를 참고하세요.

현재 의존성 보안 점검 결과와 회사 환경에서 확인할 항목은 [확인된 제한 사항](std-lint/KNOWN_ISSUES.md)에 기록했습니다.

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
