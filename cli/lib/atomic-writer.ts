// cli/lib/atomic-writer.ts

import { randomBytes } from "node:crypto";
import {
  closeSync,
  existsSync,
  fsyncSync,
  linkSync,
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

/** Publish a new immutable file atomically; fail without replacing an existing target. */
export function writeFileExclusiveAtomic(path: string, content: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = join(dirname(path), `.${randomBytes(6).toString("hex")}.tmp`);
  try {
    const fd = openSync(tmp, "wx");
    try {
      writeFileSync(fd, content);
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    linkSync(tmp, path);
  } finally {
    if (existsSync(tmp)) unlinkSync(tmp);
  }
}

/** Serialize data as pretty JSON and atomically publish it without replacement. */
export function writeJsonExclusiveAtomic(path: string, data: unknown): void {
  writeFileExclusiveAtomic(path, `${JSON.stringify(data, null, 2)}\n`);
}
