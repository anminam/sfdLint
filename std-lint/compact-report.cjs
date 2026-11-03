'use strict';

/** CLI-only projection: keep summary, group severity-2 messages and operational issues. */
function toCompactReport(result) {
  if (result === null) return null;
  const errorsByFile = new Map();
  for (const file of result.files) {
    errorsByFile.set(file.filePath, file.messages
      .filter(message => message.severity === 2)
      .map(message => message.message));
  }
  for (const issue of result.issues) {
    if (!errorsByFile.has(issue.filePath)) errorsByFile.set(issue.filePath, []);
    errorsByFile.get(issue.filePath).push(issue.message);
  }
  const errorFiles = [...errorsByFile]
    .filter(([, messages]) => messages.length > 0)
    .map(([filePath, messages]) => ({ filePath, errorMessages: messages }));
  return {
    version: result.version,
    passed: result.passed,
    exitCode: result.exitCode,
    summary: result.summary,
    report: { isError: errorFiles.length > 0, errorFiles },
  };
}

module.exports = { toCompactReport };
