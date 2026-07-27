// cli/lib/atomic-writer.ts

import { randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

/** Write a file atomically: fsync a temp sibling then rename over the target; temp is always cleaned up. */
export function writeFileAtomic(path: string, content: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = join(dirname(path), `.${randomBytes(6).toString("hex")}.tmp`);
  try {
    const fd = openSync(tmp, "w");
    try {
      writeFileSync(fd, content);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmp, path);
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}

/** Serialize data as pretty JSON and write it atomically. */
export function writeJsonAtomic(path: string, data: unknown): void {
  writeFileAtomic(path, `${JSON.stringify(data, null, 2)}\n`);
}
