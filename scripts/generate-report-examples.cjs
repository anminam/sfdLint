'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { checkFiles } = require('../std-lint');
// Development-only schema validation with the already vendored dependency.
const Ajv = require('../std-lint/vendor/node_modules/ajv');
const schema = require('../std-lint/report.schema.json');
const compactSchema = require('../std-lint/compact-report.schema.json');
const { toCompactReport } = require('../std-lint/compact-report.cjs');

async function main() {
  const root = path.resolve(__dirname, '..');
  const moduleRoot = path.join(root, 'std-lint');
  const cwd = path.join(moduleRoot, 'examples');
  const outputDirectory = path.join(cwd, 'reports');
  const ajv = new Ajv({ allErrors: true });
  ajv.addSchema(schema, 'report.schema.json');
  const validate = ajv.getSchema('report.schema.json');
  const validateCompact = ajv.compile(compactSchema);
  const defaults = { configFile: './config/project-lint.cjs' };
  const scenarios = [
    ['01-success', '정상', ['src/valid.js'], {}, 0],
    ['02-rule-error', '규칙 오류 알림', ['src/invalid.js'], {}, 1],
    ['03-syntax-error', '문법 오류 알림', ['src/syntax-error.js'], {}, 1],
    ['04-warning', '경고 알림', ['src/warning.js'], {}, 0],
    ['05-warning-classified', '경고를 위반으로 분류', ['src/warning.js'], { failOnWarning: true }, 1],
    ['06-missing-file', '입력 파일 없음', ['src/missing.js'], {}, 2],
    ['07-missing-config', '설정 파일 없음', ['src/valid.js'], { configFile: './config/not-found.cjs' }, 2],
    ['08-mixed', '여러 파일의 정상·규칙·문법·경고·실행 문제', ['src/valid.js', 'src/invalid.js', 'src/syntax-error.js', 'src/warning.js', 'src/missing.js'], {}, 2],
  ];
  const index = {
    catalogVersion: 1,
    reportSchemaVersion: 1,
    reportSchema: '../../report.schema.json',
    compactReportSchema: '../../compact-report.schema.json',
    generator: {
      packageVersion: require('../std-lint/package.json').version,
      eslintVersion: require('../std-lint/vendor/node_modules/eslint/package.json').version,
      nodeVersion: process.versions.node,
    },
    usage: {
      purpose: 'notification',
      continuePipelineOnFindings: true,
      applyReportExitCodeToProcess: false,
    },
    scenarios: [],
  };
  const files = [];
  // Only filesystem paths are normalized. All other fields come from the real API.
  const normalize = text => text.split(cwd).join('/project')
    .split(moduleRoot).join('/project/tools/std-lint')
    .split(root).join('/project');
  for (const [id, title, filePaths, extra, expectedCode] of scenarios) {
    const options = { ...defaults, ...extra };
    const actual = await checkFiles(filePaths, { cwd, ...options });
    assert.equal(actual.exitCode, expectedCode, id);
    assert.equal(actual.summary.fileCount, actual.files.length, id);
    const ignoredCount = actual.files.filter(file => file.status === 'ignored').length;
    assert.equal(actual.summary.lintedFileCount + actual.summary.failedFileCount + ignoredCount, actual.summary.fileCount, id);
    assert.equal(actual.summary.errorCount, actual.files.reduce((sum, f) => sum + f.errorCount, 0), id);
    assert.equal(actual.summary.warningCount, actual.files.reduce((sum, f) => sum + f.warningCount, 0), id);
    assert.equal(actual.summary.fatalErrorCount, actual.files.reduce((sum, f) => sum + f.fatalErrorCount, 0), id);
    assert.equal(actual.summary.failedFileCount, actual.issues.length, id);
    const json = normalize(JSON.stringify(actual, null, 2)) + '\n';
    assert(validate(JSON.parse(json)), `${id}: ${JSON.stringify(validate.errors)}`);
    files.push([`${id}.json`, json]);
    const compact = toCompactReport(JSON.parse(json));
    assert(validateCompact(compact), `${id}: ${JSON.stringify(validateCompact.errors)}`);
    files.push([`${id}.compact.json`, JSON.stringify(compact, null, 2) + '\n']);
    index.scenarios.push({
      id, title, reportFile: `${id}.json`, compactReportFile: `${id}.compact.json`,
      input: { filePaths, options: { cwd: '/project', ...options } },
      expected: { passed: actual.passed, reportExitCode: actual.exitCode, processExitCode: 0, continuePipeline: true },
    });
  }
  await fs.mkdir(outputDirectory, { recursive: true });
  for (const [name, json] of files) await fs.writeFile(path.join(outputDirectory, name), json);
  await fs.writeFile(path.join(outputDirectory, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  console.log(`Generated and schema-validated ${scenarios.length} full and ${scenarios.length} compact report examples.`);
}

main().catch(error => { console.error(error); process.exitCode = 1; });
