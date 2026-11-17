import { zipSync, strToU8 } from 'fflate';

const MAX_FILES = 100;
const MAX_FILE_BYTES = 512 * 1024;
const MAX_PROJECT_BYTES = 1024 * 1024;
const RESERVED_NAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

/** Encode a bounded in-memory source project, never paths from the host filesystem. */
export function createProjectArchive(files) {
  if (!Array.isArray(files) || !files.length || files.length > MAX_FILES) {
    throw new Error('A source project must contain between 1 and 100 files.');
  }
  const entries = Object.create(null);
  const seen = new Set();
  let totalBytes = 0;
  for (const file of files) {
    if (!file || typeof file.path !== 'string' || typeof file.content !== 'string') {
      throw new Error('Source project entries must have a path and text content.');
    }
    const segments = file.path.split('/');
    // A portable subset rejects traversal, alternate separators, device names,
    // hidden files and ambiguous Windows paths before anything enters the ZIP.
    if (file.path.length > 240 || segments.some((segment) =>
      !/^[a-zA-Z0-9_-][a-zA-Z0-9._-]*$/.test(segment) ||
      segment.endsWith('.') || RESERVED_NAME.test(segment) ||
      ['__proto__', 'prototype', 'constructor'].includes(segment.toLowerCase()))) {
      throw new Error('Source project contains an unsafe file path.');
    }
    const key = file.path.toLowerCase();
    if (seen.has(key) || [...seen].some((other) => key.startsWith(`${other}/`) || other.startsWith(`${key}/`))) {
      throw new Error('Source project paths must be unique and cannot overlap.');
    }
    seen.add(key);
    if (file.content.length > MAX_FILE_BYTES) {
      throw new Error('Source project exceeds the export size limit.');
    }
    const bytes = strToU8(file.content);
    totalBytes += bytes.length;
    if (bytes.length > MAX_FILE_BYTES || totalBytes > MAX_PROJECT_BYTES) {
      throw new Error('Source project exceeds the export size limit.');
    }
    entries[file.path] = bytes;
  }
  return zipSync(entries, { level: 6, mtime: new Date(1980, 0, 1) });
}
