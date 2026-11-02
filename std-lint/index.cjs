'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { ESLint } = require('./vendor/node_modules/eslint');
const { FlatCompat, Legacy } = require('./vendor/node_modules/@eslint/eslintrc');
const js = require('./vendor/node_modules/@eslint/js');

const CONFIG_NAMES = ['stdLintConfig.js', 'stdLintConfig.cjs', 'stdLintConfig.mjs'];

class StdLintError extends Error {
  constructor(report) {
    super(formatReport(report));
    this.name = 'StdLintError';
    this.code = 'STD_LINT_FAILED';
    this.report = report;
    this.exitCode = report.exitCode;
  }
}

async function findConfig(filePath) {
  let directory = path.dirname(filePath);
  while (true) {
    for (const name of CONFIG_NAMES) {
      const candidate = path.join(directory, name);
      try {
        const stat = await fs.stat(candidate);
        if (stat.isFile()) return candidate;
      } catch (error) {
        if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
      }
    }
    const parent = path.dirname(directory);
    if (directory === parent) return null;
    directory = parent;
  }
}

async function readConfig(filePath) {
  // Evaluate trusted configuration with native CJS/ESM semantics. A fresh call
  // reloads the config entry; imported helper modules follow Node's own cache.
  let config;
  if (path.extname(filePath) === '.cjs') {
    delete require.cache[require.resolve(filePath)];
    config = require(filePath);
  } else {
    const url = pathToFileURL(filePath);
    url.searchParams.set('stdLintLoad', `${Date.now()}-${++loadId}`);
    // CJS .js files are also cached by require(), independently of the URL.
    delete require.cache[require.resolve(filePath)];
    config = (await import(url.href)).default;
  }
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new TypeError('설정은 env, globals, rules 등을 담은 객체를 export해야 합니다.');
  }
  return config;
}
let loadId = 0;

function commonDirectory(left, right) {
  while (true) {
    const relative = path.relative(left, right);
    if (relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) return left;
    const parent = path.dirname(left);
    if (parent === left) throw new Error('설정과 대상 파일은 같은 드라이브에 있어야 합니다.');
    left = parent;
  }
}

async function createEngine(configPath, cwd) {
  const config = await readConfig(configPath);
  // FlatCompat silently drops unknown environment names. Catch typos before
  // conversion using the environment catalog from the pinned compatibility package.
  function validateEnvironments(value) {
    for (const name of Object.keys(value.env || {})) {
      if (!Legacy.environments.has(name)) throw new Error(`알 수 없거나 배포본에 포함되지 않은 ESLint env: ${name}`);
    }
    for (const override of value.overrides || []) validateEnvironments(override);
  }
  validateEnvironments(config);
  const compat = new FlatCompat({
    baseDirectory: path.dirname(configPath),
    resolvePluginsRelativeTo: path.join(__dirname, 'vendor'),
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
  });
  return new ESLint({
    cwd,
    overrideConfigFile: true,
    // ESLint core normally targets JS extensions. Here every explicit input
    // file must be inspected, including .jsx and nonstandard JS extensions.
    overrideConfig: [{ files: ['**/*'] }, ...compat.config(config)],
    fix: false,
  });
}

/** Inspect explicit file paths without modifying sources or invoking Uglify. */
async function lintFiles(filePaths, options = {}) {
  if (!Array.isArray(filePaths) || filePaths.some(p => typeof p !== 'string' || !p.trim())) {
    throw new TypeError('filePaths는 비어 있지 않은 파일 경로 문자열의 배열이어야 합니다.');
  }
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options는 객체여야 합니다.');
  }
  if (options.cwd !== undefined && (typeof options.cwd !== 'string' || !options.cwd.trim())) {
    throw new TypeError('cwd는 비어 있지 않은 경로 문자열이어야 합니다.');
  }
  if (options.configFile !== undefined && (typeof options.configFile !== 'string' || !options.configFile.trim())) {
    throw new TypeError('configFile은 비어 있지 않은 경로 문자열이어야 합니다.');
  }
  if (options.failOnWarning !== undefined && typeof options.failOnWarning !== 'boolean') {
    throw new TypeError('failOnWarning은 boolean이어야 합니다.');
  }
  const cwd = path.resolve(options.cwd || process.cwd());
  const inputs = [...new Set(filePaths.map(p => path.resolve(cwd, p)))];
  const explicitConfig = options.configFile ? path.resolve(cwd, options.configFile) : null;
  const engines = new Map();
  const files = [];
  const issues = [];

  // Sequential processing preserves input order and bounds memory usage.
  for (const filePath of inputs) {
    let configPath = explicitConfig;
    let stage = 'read';
    try {
      const source = await fs.readFile(filePath, 'utf8');
      stage = 'config';
      configPath = configPath || await findConfig(filePath);
      if (!configPath) {
        const error = new Error('stdLintConfig.js(.cjs/.mjs)를 찾을 수 없습니다. configFile을 지정하거나 대상 파일의 상위 폴더에 설정을 두세요.');
        error.code = 'CONFIG_NOT_FOUND';
        throw error;
      }
      const lintRoot = commonDirectory(path.dirname(configPath), path.dirname(filePath));
      const engineKey = JSON.stringify([configPath, lintRoot]);
      if (!engines.has(engineKey)) engines.set(engineKey, createEngine(configPath, lintRoot));
      const engine = await engines.get(engineKey);
      stage = 'lint';
      const results = await engine.lintText(source, { filePath, warnIgnored: true });
      const result = results[0];
      if (!result || (result.messages.length > 0 && result.messages.every(m => m.ruleId === null && !m.fatal && m.severity === 1))) {
        const error = new Error(result?.messages.map(m => m.message).join(' ') || 'ESLint가 파일을 검사하지 않았습니다.');
        error.code = 'FILE_NOT_LINTED';
        throw error;
      }
      files.push({
        filePath, configFile: configPath, status: 'linted',
        errorCount: result.errorCount,
        warningCount: result.warningCount,
        fatalErrorCount: result.fatalErrorCount,
        messages: result.messages,
      });
    } catch (error) {
      const issue = { filePath, configFile: configPath, stage, code: error.code || 'STD_OPERATION_FAILED', message: error.message };
      issues.push(issue);
      files.push({ filePath, configFile: configPath, status: 'failed', errorCount: 0, warningCount: 0, fatalErrorCount: 0, messages: [] });
    }
  }
  const summary = {
    fileCount: inputs.length,
    lintedFileCount: files.filter(f => f.status === 'linted').length,
    failedFileCount: issues.length,
    errorCount: files.reduce((sum, f) => sum + f.errorCount, 0),
    warningCount: files.reduce((sum, f) => sum + f.warningCount, 0),
    fatalErrorCount: files.reduce((sum, f) => sum + f.fatalErrorCount, 0),
  };
  const exitCode = issues.length ? 2 : summary.errorCount || (options.failOnWarning && summary.warningCount) ? 1 : 0;
  return { version: 1, passed: exitCode === 0, exitCode, summary, files, issues };
}

function formatReport(report) {
  const lines = [];
  for (const file of report.files) {
    for (const message of file.messages) {
      lines.push(`${file.filePath}:${message.line || 0}:${message.column || 0} ${message.severity === 2 ? 'error' : 'warning'} ${message.message}${message.ruleId ? ` (${message.ruleId})` : ''}`);
    }
  }
  for (const issue of report.issues) {
    lines.push(`${issue.filePath} [${issue.stage}/${issue.code}] ${issue.message}`);
  }
  const s = report.summary;
  lines.push(`std-lint: ${report.passed ? 'PASS' : 'FAIL'} | files ${s.fileCount}, linted ${s.lintedFileCount}, errors ${s.errorCount}, warnings ${s.warningCount}, failed ${s.failedFileCount}`);
  return lines.join('\n');
}

function assertPassed(report) {
  if (!report.passed) throw new StdLintError(report);
  return report;
}

module.exports = { lintFiles, formatReport, assertPassed, StdLintError };
