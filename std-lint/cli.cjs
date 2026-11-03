#!/usr/bin/env node
'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { parseArgs } = require('node:util');
const { readFileList } = require('./file-list.cjs');

const HELP = `std-lint: 파일 목록 기반 검사 결과 알림

node tool/std-lint/cli.cjs [옵션]

  --file-list <경로>  UTF-8 파일 목록 (기본: ./temp_files.txt)
  --cwd <폴더>       목록 안의 상대 경로 기준 (기본: 명령 실행 폴더)
  --config <경로>    설정 파일 (생략 시 대상 파일별 자동 탐색)
  --format text|json stdout 출력 형식 (기본: text)
  --report <경로>    전체 report를 JSON 파일로도 저장
  --help            도움말

목록은 쉼표 또는 줄바꿈으로 구분합니다. 쉼표가 포함된 경로는 큰따옴표로 감쌉니다.
--file-list, --config, --report의 상대 경로는 명령 실행 폴더 기준입니다.
--cwd는 목록 안의 파일 경로 기준만 바꿉니다.
검사 오류와 알림 생성 문제는 빌드를 막지 않습니다. JSON 알림 생성 불가 시 stdout은 null입니다.
`;

async function main() {
  let format = 'text';
  let reportPath;
  let report = null;
  const protectedPaths = [];
  try {
    const { values } = parseArgs({
      options: {
        'file-list': { type: 'string' },
        cwd: { type: 'string' },
        config: { type: 'string' },
        format: { type: 'string' },
        report: { type: 'string' },
        help: { type: 'boolean' },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.help) { process.stdout.write(HELP); return; }
    const invocationCwd = process.cwd();
    format = values.format || 'text';
    if (!['text', 'json'].includes(format)) throw new Error('--format은 text 또는 json이어야 합니다.');
    reportPath = values.report ? path.resolve(invocationCwd, values.report) : undefined;
    const listPath = path.resolve(invocationCwd, values['file-list'] || 'temp_files.txt');
    protectedPaths.push(listPath);
    const configPath = values.config ? path.resolve(invocationCwd, values.config) : undefined;
    if (configPath) protectedPaths.push(configPath);
    const files = await readFileList(listPath);
    const sourceCwd = path.resolve(invocationCwd, values.cwd || '.');
    for (const file of files) protectedPaths.push(path.resolve(sourceCwd, file));
    // Load dependencies inside the notification boundary so a missing vendor
    // installation is also reported without blocking an existing build command.
    const { checkFiles, formatReport } = require('./index.cjs');
    report = await checkFiles(files, {
      cwd: sourceCwd,
      ...(configPath ? { configFile: configPath } : {}),
    });
    for (const file of report.files) if (file.configFile) protectedPaths.push(file.configFile);
    if (format === 'text') process.stdout.write(formatReport(report) + '\n');
  } catch (error) {
    process.stderr.write(`std-lint 알림 생성 문제: ${error.message}\n다음 빌드 단계는 계속 진행합니다.\n`);
  }
  if (format === 'json') process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (reportPath) {
    try {
      const canonical = async file => {
        try { return await fs.realpath(file); }
        catch { return path.resolve(file); }
      };
      const outputPath = await canonical(reportPath);
      const inputs = await Promise.all(protectedPaths.map(canonical));
      if (inputs.includes(outputPath)) throw new Error('report 저장 경로는 목록·소스·설정 파일과 달라야 합니다.');
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
    } catch (error) {
      process.stderr.write(`std-lint JSON 저장 문제: ${error.message}\n다음 빌드 단계는 계속 진행합니다.\n`);
    }
  }
  // Report classification is intentionally never assigned to process.exitCode.
}

main().catch(error => {
  process.stderr.write(`std-lint 실행 알림: ${error.message}\n`);
});
