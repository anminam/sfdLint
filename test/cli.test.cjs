'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { parseFileList } = require('../std-lint/file-list.cjs');

test('file lists handle mixed separators, BOM, quotes and literal Windows paths', () => {
  const input = '\uFEFF aa/bb/cc.js,\r\n aa/cc/dd.js\n,\n"aa/path with spaces/file,part.js", "aa/a""b.js"\nC:\\work\\aa\\x.js,\n';
  assert.deepEqual(parseFileList(input), [
    'aa/bb/cc.js', 'aa/cc/dd.js', 'aa/path with spaces/file,part.js', 'aa/a"b.js', 'C:\\work\\aa\\x.js',
  ]);
  assert.deepEqual(parseFileList(' \r\n,\n'), []);
  assert.throws(() => parseFileList('"unclosed'), /따옴표/);
  assert.throws(() => parseFileList('"file.js"trailing'), /따옴표/);
});

test('CLI and npm build hook use aa-prefixed lists without blocking subsequent builds', async t => {
  const workspace = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'std-cli-')));
  t.after(() => fs.rm(workspace, { recursive: true, force: true }));
  const project = path.join(workspace, 'aa');
  for (const folder of ['tool', 'build', 'config', 'bb', 'cc']) await fs.mkdir(path.join(project, folder), { recursive: true });
  await fs.cp(path.resolve(__dirname, '../std-lint'), path.join(project, 'tool/std-lint'), { recursive: true });
  await fs.writeFile(path.join(project, 'config/project-lint.cjs'), `module.exports = {
    env: { browser: true, es2020: true }, globals: { STD: 'readonly' },
    parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    extends: ['eslint:recommended'],
    rules: { 'no-unused-vars': 'warn' },
  };`);
  await fs.writeFile(path.join(project, 'bb/good.js'), 'window.alert(STD);');
  await fs.writeFile(path.join(project, 'cc/file,part.js'), 'export const answer = 42;');
  await fs.writeFile(path.join(project, 'cc/bad.js'), 'notRegistered();');
  await fs.writeFile(path.join(project, 'cc/syntax.js'), 'const = ;');
  const list = path.join(project, 'build/temp_files.txt');
  const original = '\uFEFFaa/bb/good.js,\r\n"aa/cc/file,part.js"\naa/cc/bad.js, aa/cc/syntax.js\naa/bb/good.js\n';
  await fs.writeFile(list, original);
  const base = ['--file-list', './build/temp_files.txt', '--cwd', '..', '--config', './config/project-lint.cjs'];
  const run = args => spawnSync(process.execPath, ['tool/std-lint/cli.cjs', ...args], { cwd: project, encoding: 'utf8' });

  const output = run([...base, '--format', 'json', '--report', './result.json']);
  assert.equal(output.status, 0, output.stderr);
  const report = JSON.parse(output.stdout);
  assert.equal(report.exitCode, 1);
  assert.equal(report.summary.fileCount, 4); // Duplicate paths are linted only once.
  assert.equal(report.summary.errorCount, 2);
  assert.equal(report.summary.fatalErrorCount, 1);
  assert.equal(report.files[0].filePath, path.join(project, 'bb/good.js'));
  assert.equal(report.files[0].configFile, path.join(project, 'config/project-lint.cjs'));
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(project, 'result.json'), 'utf8')), report);
  assert.equal(await fs.readFile(list, 'utf8'), original);

  // The compact contract keeps the original summary and excludes every warning.
  await fs.writeFile(path.join(project, 'cc/multiple.js'), 'firstMissing(); secondMissing(); const unused = 1;');
  await fs.writeFile(path.join(project, 'cc/warning.js'), 'const unused = 1;');
  await fs.writeFile(path.join(project, 'build/compact.txt'), 'aa/cc/warning.js,aa/cc/multiple.js\naa/cc/syntax.js,aa/cc/missing.js\naa/bb/good.js');
  const compactArgs = [...base, '--file-list', './build/compact.txt'];
  const fullMixed = run([...compactArgs, '--format', 'json']);
  const compactOutput = run([...compactArgs, '--format', 'compact-json', '--report', './compact-result.json']);
  assert.equal(compactOutput.status, 0, compactOutput.stderr);
  const compact = JSON.parse(compactOutput.stdout);
  const full = JSON.parse(fullMixed.stdout);
  assert.deepEqual(compact.summary, full.summary);
  assert.equal(compact.version, full.version);
  assert.equal(compact.passed, full.passed);
  assert.equal(compact.exitCode, full.exitCode);
  assert.equal(compact.summary.warningCount, 2);
  assert.equal(compact.report.isError, true);
  assert.equal(Object.hasOwn(compact, 'files'), false);
  assert.equal(Object.hasOwn(compact, 'issues'), false);
  assert.deepEqual(compact.report.errorFiles.map(file => file.filePath), [
    path.join(project, 'cc/multiple.js'), path.join(project, 'cc/syntax.js'), path.join(project, 'cc/missing.js'),
  ]);
  assert.equal(compact.report.errorFiles[0].errorMessage, "'firstMissing' is not defined.\n'secondMissing' is not defined.");
  assert.match(compact.report.errorFiles[1].errorMessage, /Parsing error/);
  assert.match(compact.report.errorFiles[2].errorMessage, /ENOENT/);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(project, 'compact-result.json'), 'utf8')), compact);
  await fs.writeFile(path.join(project, 'build/warning.txt'), 'aa/cc/warning.js');
  const warningOutput = run([...base, '--file-list', './build/warning.txt', '--format', 'compact-json']);
  assert.equal(warningOutput.status, 0);
  const warningCompact = JSON.parse(warningOutput.stdout);
  assert.equal(warningCompact.summary.warningCount, 1);
  assert.deepEqual(warningCompact.report, { isError: false, errorFiles: [] });

  const noConfig = run([...base, '--config', './config/absent.cjs', '--format', 'json']);
  assert.equal(noConfig.status, 0);
  assert.equal(JSON.parse(noConfig.stdout).exitCode, 2);
  const compactNoConfig = run([...base, '--config', './config/absent.cjs', '--format', 'compact-json']);
  assert.equal(compactNoConfig.status, 0);
  assert.equal(JSON.parse(compactNoConfig.stdout).report.errorFiles.length, 4);
  const noList = run(['--file-list', './absent.txt', '--format', 'json']);
  assert.equal(noList.status, 0);
  assert.equal(JSON.parse(noList.stdout), null);
  assert.match(noList.stderr, /ENOENT/); // File read failure stays informational.
  const compactNoList = run(['--file-list', './absent.txt', '--format', 'compact-json']);
  assert.equal(compactNoList.status, 0);
  assert.equal(JSON.parse(compactNoList.stdout), null);

  await fs.writeFile(path.join(project, 'build/malformed.txt'), '"not-closed');
  const malformed = run(['--file-list', './build/malformed.txt', '--format', 'json']);
  assert.equal(malformed.status, 0);
  assert.equal(JSON.parse(malformed.stdout), null);
  assert.match(malformed.stderr, /따옴표/);
  const configBefore = await fs.readFile(path.join(project, 'config/project-lint.cjs'), 'utf8');
  const overwriteConfig = run(['--file-list', './build/malformed.txt', '--config', './config/project-lint.cjs', '--report', './config/project-lint.cjs']);
  assert.equal(overwriteConfig.status, 0);
  assert.equal(await fs.readFile(path.join(project, 'config/project-lint.cjs'), 'utf8'), configBefore);
  await fs.writeFile(path.join(project, 'build/empty.txt'), '\r\n,\n');
  const empty = run(['--file-list', './build/empty.txt', '--format', 'json']);
  assert.equal(empty.status, 0);
  assert.equal(JSON.parse(empty.stdout).summary.fileCount, 0);
  const compactEmpty = run(['--file-list', './build/empty.txt', '--format', 'compact-json']);
  assert.equal(compactEmpty.status, 0);
  assert.deepEqual(JSON.parse(compactEmpty.stdout).report, { isError: false, errorFiles: [] });
  const cannotWrite = run([...base, '--format', 'json', '--report', './absent-dir/report.json']);
  assert.equal(cannotWrite.status, 0);
  assert.equal(JSON.parse(cannotWrite.stdout).exitCode, 1);
  assert.match(cannotWrite.stderr, /JSON 저장 문제/);
  const overwriteList = run([...base, '--report', './build/temp_files.txt']);
  assert.equal(overwriteList.status, 0);
  assert.match(overwriteList.stderr, /저장 경로/);
  assert.equal(await fs.readFile(list, 'utf8'), original);
  assert.match(run(['--help']).stdout, /--file-list/);
  const invalidOption = run(['--not-an-option']);
  assert.equal(invalidOption.status, 0);
  assert.match(invalidOption.stderr, /알림 생성 문제/);

  // Reproduce the npm pre-hook and execSync-style captured stdout in the request.
  await fs.writeFile(path.join(project, 'package.json'), JSON.stringify({
    private: true,
    scripts: {
      'lint:notify': 'node tool/std-lint/cli.cjs --file-list ./build/temp_files.txt --cwd .. --config ./config/project-lint.cjs',
      preriabuild: 'npm run lint:notify',
      riabuild: 'node build/finish.cjs',
    },
  }));
  await fs.writeFile(path.join(project, 'build/finish.cjs'), `require('node:fs').writeFileSync('build/continued.txt', 'continued'); console.log('NEXT_BUILD_RAN');`);
  const built = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'riabuild'], {
    cwd: project, encoding: 'utf8', shell: process.platform === 'win32',
  });
  assert.equal(built.status, 0, built.stdout + built.stderr);
  assert.match(built.stdout, /Parsing error/);
  assert.match(built.stdout, /NEXT_BUILD_RAN/);
  assert.equal(await fs.readFile(path.join(project, 'build/continued.txt'), 'utf8'), 'continued');
  const npmJson = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', '--silent', 'lint:notify', '--', '--format', 'compact-json'], {
    cwd: project, encoding: 'utf8', shell: process.platform === 'win32',
  });
  assert.equal(npmJson.status, 0, npmJson.stderr);
  assert.equal(JSON.parse(npmJson.stdout).report.isError, true);

  // A copied tool without installed vendor packages must also avoid stopping a build.
  await fs.rename(path.join(project, 'tool/std-lint/vendor/node_modules'), path.join(project, 'tool/std-lint/vendor/temporarily-unavailable'));
  const noDependencies = run([...base, '--format', 'json']);
  assert.equal(noDependencies.status, 0);
  assert.equal(JSON.parse(noDependencies.stdout), null);
  assert.match(noDependencies.stderr, /Cannot find module/);
});
