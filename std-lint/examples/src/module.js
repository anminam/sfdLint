// .cjs 실행기로도 이 파일의 import/export 문법을 검사할 수 있습니다.
import { getVersion } from './module-helper.js';

export const version = getVersion();
