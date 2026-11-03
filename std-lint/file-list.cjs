'use strict';

const fs = require('node:fs/promises');

/** Commas and CR/LF separate paths; CSV-style double quotes preserve commas. */
function parseFileList(text) {
  if (typeof text !== 'string') throw new TypeError('파일 목록은 문자열이어야 합니다.');
  text = text.replace(/^\uFEFF/, '');
  const paths = [];
  let value = '';
  let quoted = false;
  let wasQuoted = false;
  let closed = false;
  function finish() {
    const entry = wasQuoted ? value : value.trim();
    if (entry.length) paths.push(entry);
    value = '';
    wasQuoted = false;
    closed = false;
  }
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { value += '"'; i++; }
        else { quoted = false; closed = true; }
      } else value += char;
    } else if (char === ',' || char === '\r' || char === '\n') {
      finish();
    } else if (closed) {
      if (!/\s/.test(char)) throw new Error('파일 목록의 닫는 따옴표 뒤에는 구분자만 사용할 수 있습니다.');
    } else if (char === '"') {
      if (value.trim()) throw new Error('따옴표는 파일 경로 전체를 감싸는 형태로 사용하세요.');
      value = '';
      quoted = true;
      wasQuoted = true;
    } else value += char;
  }
  if (quoted) throw new Error('파일 목록에 닫히지 않은 따옴표가 있습니다.');
  finish();
  return paths;
}

async function readFileList(filePath) {
  return parseFileList(await fs.readFile(filePath, 'utf8'));
}

module.exports = { parseFileList, readFileList };
