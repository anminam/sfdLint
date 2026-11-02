import { fileURLToPath } from 'node:url';
import { lintFiles, formatReport } from '../index.mjs';

try {
  const files = process.argv.slice(2);
  const report = await lintFiles(files.length ? files : ['src/valid.js'], {
    cwd: fileURLToPath(new URL('.', import.meta.url)),
    configFile: './config/company-lint.mjs',
    failOnWarning: false,
  });
  console.log(formatReport(report));
  process.exitCode = report.exitCode;
} catch (error) {
  console.error(error.message);
  process.exitCode = error.exitCode || 2;
}
