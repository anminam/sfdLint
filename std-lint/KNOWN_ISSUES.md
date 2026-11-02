# 확인된 제한 사항

## 의존성 보안 점검 (2026-11-02)

`npm audit --prefix std-lint/vendor --omit=dev`에서 **moderate 6개 패키지**가 표시되었습니다. 근본 advisory는 minimatch의 패턴 증폭으로 인한 자원 소모 문제 1건이고, 나머지는 의존 관계에 따른 보고입니다. high/critical은 0개였습니다.

- 공지: [GHSA-g3hv-75wg-m249 / CVE-2026-118764](https://github.com/advisories/GHSA-g3hv-75wg-m249)
- 공지의 영향 범위: minimatch `<11.0.1`.
- 설명된 발생 조건: 공격자가 제어하는 glob 패턴과 `optimizationLevel >= 2`.
- 현재 ESLint/호환 패키지가 사용하는 minimatch도 audit의 영향 범위에 포함됩니다.

현재 포함된 ESLint 및 @eslint 호출 코드에서는 `optimizationLevel >= 2`를 지정하는 곳을 확인하지 못했습니다. 다만 이 확인은 취약점 해결이나 모든 경로의 안전성을 보장하지 않습니다. 이 모듈의 파일 입력은 glob으로 확장하지 않으며 설정은 신뢰할 수 있는 프로젝트 관리 파일을 전제로 합니다.

minimatch 11을 이전 메이저 API를 사용하는 패키지에 강제로 덮어쓰지 않았습니다. npm audit이 제안하는 ESLint 4로의 다운그레이드도 적용하지 않았습니다. 호환되는 upstream 수정 버전을 검토하여 vendor와 lockfile을 갱신해야 합니다. 프로젝트 적용 검토 시 이 항목을 함께 확인하세요.

## 통합 확인이 필요한 항목

- 프로젝트 Node.js가 22.23.4 이상(22.x), 24.22.1 이상(24.x), 26.12.1 이상(26.x)인지 확인해야 합니다. [공식 보안 공지와 버전 안내](README.md#nodejs-버전)를 참고하세요. 이 저장소의 engines/문서 변경은 실행 PC나 CI의 Node.js 설치를 업데이트하지 않습니다.
- 기존 ESLint 버전/실제 stdLintConfig.js/사용 플러그인을 아직 전달받지 않아 기존 검사 결과와의 비교는 수행하지 못했습니다.
- Uglify 자체와의 통합은 프로젝트의 실제 호출 코드로 확인해야 합니다. 제공된 예시는 검사 결과를 알린 뒤 오류 유무와 관계없이 기존 Uglify 함수를 호출합니다. 실제 Uglify가 문법 오류로 실패하는 경우는 Uglify 호출 코드에서 별도로 처리해야 합니다.
