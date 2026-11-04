'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFileSync } = require('node:child_process');
const api = require('../std-lint');

async function fixture(t, config = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'std-lint-'));
  t.after(() => fs.rm(directory, { recursive: true, force: true }));
  const value = {
    env: { browser: true, es2020: true },
    globals: { STD: 'readonly' },
    extends: ['eslint:recommended'],
    parserOptions: { ecmaVersion: 2020, sourceType: 'script' },
    rules: { 'no-unused-vars': 'warn' },
    ...config,
  };
  await fs.writeFile(path.join(directory, 'stdLintConfig.js'), `module.exports = ${JSON.stringify(value)};`);
  const write = async (name, source) => {
    const target = path.join(directory, name);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, source);
    return target;
  };
  return { directory, write };
}

test('env/globals, undefined names, syntax errors and stable input order', async t => {
  const f = await fixture(t);
  const good = await f.write('nested/good.js', 'window.alert(STD);');
  const bad = await f.write('bad.js', 'unknownThing();');
  const syntax = await f.write('syntax.js', 'const = ;');
  const report = await api.lintFiles([good, bad, syntax, good]);
  assert.equal(report.exitCode, 1);
  assert.equal(report.summary.fileCount, 3);
  assert.equal(report.summary.errorCount, 2);
  assert.equal(report.summary.fatalErrorCount, 1);
  assert.equal(report.files[0].messages.length, 0);
  assert.equal(report.files[1].messages[0].ruleId, 'no-undef');
  assert.equal(report.files[1].messages[0].line, 1);
  assert.deepEqual(report.files.map(file => file.filePath), [good, bad, syntax]);
  assert.match(api.formatReport(report), /bad\.js:1:1 error/);
  assert.equal(api.assertPassed(report), report); // Legacy callers also continue after findings.
  assert.equal(await fs.readFile(syntax, 'utf8'), 'const = ;');
});

test('warning policy, per-call config reload and empty input', async t => {
  const f = await fixture(t);
  const input = await f.write('warning.js', 'var unused = 1;');
  const report = await api.lintFiles([input]);
  assert.equal(report.passed, true);
  assert.equal(report.summary.warningCount, 1);
  assert.equal(api.assertPassed(report), report);
  assert.equal((await api.lintFiles([input], { failOnWarning: true })).exitCode, 1);
  await fs.writeFile(path.join(f.directory, 'stdLintConfig.js'), 'module.exports = { rules: { "no-unused-vars": "error" } };');
  assert.equal((await api.lintFiles([input])).summary.errorCount, 1);
  assert.equal((await api.lintFiles([])).exitCode, 0);
});

test('missing files and invalid config are operational failures; continue other files', async t => {
  const f = await fixture(t);
  const good = await f.write('good.js', 'window.alert(STD);');
  const missing = path.join(f.directory, 'missing.js');
  const report = await api.lintFiles([missing, good]);
  assert.equal(report.exitCode, 2);
  assert.equal(report.summary.lintedFileCount, 1);
  assert.equal(report.issues[0].stage, 'read');
  await fs.writeFile(path.join(f.directory, 'stdLintConfig.js'), 'module.exports = { env: { notARealEnvironment: true } };');
  const invalid = await api.lintFiles([good]);
  assert.equal(invalid.exitCode, 2);
  assert.equal(invalid.issues[0].stage, 'config');
});

test('nearest configuration, explicit relative config and no ambient ESLint lookup', async t => {
  const f = await fixture(t);
  const file = await f.write('child/a.js', 'projectGlobal();');
  await f.write('child/stdLintConfig.cjs', 'module.exports = { globals: { projectGlobal: "readonly" }, rules: { "no-undef": "error" } };');
  await f.write('eslint.config.js', 'throw new Error("must not load ambient config");');
  assert.equal((await api.lintFiles([file])).passed, true);
  const report = await api.lintFiles(['child/a.js'], { cwd: f.directory, configFile: 'stdLintConfig.js' });
  assert.equal(report.summary.errorCount, 1);
});

test('ESM API and ESM config in a type:module project', async t => {
  const f = await fixture(t);
  await f.write('package.json', '{"type":"module"}');
  await f.write('stdLintConfig.js', 'export default { env: { node: true }, rules: { "no-undef": "error" } };');
  const file = await f.write('app.mjs', 'console.log(process.version);');
  const esm = await import('../std-lint/index.mjs');
  assert.equal((await esm.lintFiles([file])).passed, true);
  await f.write('stdLintConfig.js', 'export default { rules: { "no-undef": "error" } };');
  assert.equal((await esm.lintFiles([file])).summary.errorCount, 2);
});

test('ESLint-ignored inputs are skipped without findings; glob strings are not expanded', async t => {
  const f = await fixture(t, { ignorePatterns: ['ignored.js'] });
  const file = await f.write('ignored.js', 'unknownThing();');
  const report = await api.lintFiles([file], { cwd: f.directory });
  assert.equal(report.exitCode, 0);
  assert.equal(report.files[0].status, 'ignored');
  assert.equal(report.summary.lintedFileCount, 0);
  assert.equal(report.summary.failedFileCount, 0);
  assert.deepEqual(report.issues, []);
  assert.deepEqual(report.files[0].messages, []);
  assert.equal((await api.lintFiles(['*.js'], { cwd: f.directory })).exitCode, 2);
});

test('non-JavaScript assets never become parse/config/read errors while actual JS errors remain', async t => {
  const f = await fixture(t);
  const text = await f.write('readme.txt', 'arbitrary text which is not JavaScript');
  const html = await f.write('page.html', '<!doctype html><h1>Example</h1>');
  const missingAsset = path.join(f.directory, 'missing.png');
  const good = await f.write('good.js', 'window.alert(STD);');
  const syntax = await f.write('syntax.js', 'const = ;');
  const report = await api.checkFiles([text, html, missingAsset, good, syntax]);
  assert.equal(report.summary.fileCount, 5);
  assert.equal(report.summary.lintedFileCount, 2);
  assert.equal(report.summary.failedFileCount, 0);
  assert.equal(report.summary.errorCount, 1);
  assert.equal(report.summary.fatalErrorCount, 1);
  assert.equal(report.summary.warningCount, 0);
  assert.deepEqual(report.files.map(file => file.status), ['ignored', 'ignored', 'ignored', 'linted', 'linted']);
  assert.deepEqual(report.issues, []);
  const { toCompactReport } = require('../std-lint/compact-report.cjs');
  const compact = toCompactReport(report);
  assert.equal(compact.report.isError, true);
  assert.deepEqual(compact.report.errorFiles.map(file => file.filePath), [syntax]);
  await fs.unlink(path.join(f.directory, 'stdLintConfig.js'));
  const assetsOnly = await api.checkFiles([text, html, missingAsset]);
  assert.equal(assetsOnly.passed, true);
  assert.deepEqual(toCompactReport(assetsOnly).report, { isError: false, errorFiles: [] });
});

test('missing config and invalid API inputs', async t => {
  const f = await fixture(t);
  const file = await f.write('a.js', 'x();');
  await fs.unlink(path.join(f.directory, 'stdLintConfig.js'));
  const report = await api.lintFiles([file]);
  assert.equal(report.exitCode, 2);
  assert.equal(report.issues[0].code, 'CONFIG_NOT_FOUND');
  await assert.rejects(api.lintFiles('a.js'), TypeError);
  await assert.rejects(api.lintFiles(['']), TypeError);
  await assert.rejects(api.lintFiles([file], { failOnWarning: 'yes' }), TypeError);
});

test('readonly globals, nested overrides and explicit module syntax', async t => {
  const f = await fixture(t, {
    overrides: [{ files: ['nested/*.js'], globals: { nestedGlobal: 'readonly' } }],
  });
  const readonly = await f.write('readonly.js', 'STD = 1;');
  const nested = await f.write('nested/override.js', 'nestedGlobal();');
  const outside = await f.write('other.js', 'nestedGlobal();');
  const report = await api.lintFiles([readonly, nested, outside]);
  assert.equal(report.files[0].messages[0].ruleId, 'no-global-assign');
  assert.equal(report.files[1].messages.length, 0);
  assert.equal(report.files[2].messages[0].ruleId, 'no-undef');
  const moduleFile = await f.write('module.mjs', 'export const answer = 42;');
  const configFile = await f.write('module-config.mjs', 'export default { parserOptions: { sourceType: "module", ecmaVersion: 2020 }, rules: { "no-undef": "error" } };');
  assert.equal((await api.lintFiles([moduleFile], { configFile })).passed, true);
});

test('invalid rule, malformed config and a directory cannot pass', async t => {
  const f = await fixture(t, { rules: { 'std-does-not-exist': 'error' } });
  const file = await f.write('a.js', 'var a = 1;');
  assert.equal((await api.lintFiles([file])).exitCode, 2);
  await f.write('stdLintConfig.js', 'module.exports = {;');
  const malformed = await api.lintFiles([file]);
  assert.equal(malformed.exitCode, 2);
  assert.equal(malformed.issues[0].stage, 'config');
  assert.equal((await api.lintFiles([f.directory])).exitCode, 2);
});

test('checkFiles returns findings and continues after syntax/rule/config/file issues in CJS and ESM', async t => {
  const f = await fixture(t);
  const good = await f.write('good.js', 'window.alert(STD);');
  const bad = await f.write('bad.js', 'notRegistered();');
  const syntax = await f.write('syntax.js', 'const = ;');
  const warning = await f.write('warning.js', 'var unused = 1;');
  const esm = await import('../std-lint/index.mjs');
  assert.equal(esm.checkFiles, api.checkFiles);
  let nextStepCalls = 0;
  const nextStep = report => { nextStepCalls++; return report; };
  const passed = await api.checkFiles([good]).then(nextStep);
  assert.equal(passed.passed, true);
  const invalid = await esm.checkFiles([bad]).then(nextStep);
  assert.equal(invalid.exitCode, 1);
  assert.equal(invalid.files[0].messages[0].ruleId, 'no-undef');
  const parsed = await api.checkFiles([syntax]).then(nextStep);
  assert.equal(parsed.summary.fatalErrorCount, 1);
  assert.equal(parsed.passed, false);
  assert.equal((await api.checkFiles([warning])).summary.warningCount, 1);
  assert.equal((await api.checkFiles([warning], { failOnWarning: true }).then(nextStep)).exitCode, 1);
  const missing = await api.checkFiles([path.join(f.directory, 'missing.js')]).then(nextStep);
  assert.equal(missing.exitCode, 2);
  assert.equal(missing.issues[0].stage, 'read');
  const config = await api.checkFiles([good], { configFile: 'absent.cjs' }).then(nextStep);
  assert.equal(config.exitCode, 2);
  assert.equal(config.issues[0].stage, 'config');
  assert.equal(nextStepCalls, 6);
  await assert.rejects(api.checkFiles('invalid input'), TypeError);
});

test('copied folder runs outside repository with only vendored dependencies', async t => {
  const f = await fixture(t);
  const target = path.join(f.directory, 'tools', 'std-lint');
  await fs.cp(path.resolve(__dirname, '../std-lint'), target, { recursive: true });
  await f.write('package.json', '{"type":"module"}');
  await f.write('stdLintConfig.js', 'export default { rules: { "no-undef": "error" } };');
  const source = await f.write('a.js', 'missingName();');
  const runner = await f.write('run.cjs', `require('./tools/std-lint').checkFiles([${JSON.stringify(source)}]).then(r => { console.log(r.exitCode); });`);
  assert.equal(execFileSync(process.execPath, [runner], { cwd: f.directory, env: { ...process.env, NODE_PATH: '', NODE_OPTIONS: '' } }).toString().trim(), '1');
  const esmRunner = await f.write('run.mjs', `import { checkFiles } from ${JSON.stringify(pathToFileURL(path.join(target, 'index.mjs')).href)}; console.log((await checkFiles([${JSON.stringify(source)}])).exitCode);`);
  assert.equal(execFileSync(process.execPath, [esmRunner], { cwd: f.directory }).toString().trim(), '1');
});
