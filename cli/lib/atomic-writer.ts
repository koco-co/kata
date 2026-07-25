// cli/lib/atomic-writer.ts

import { randomBytes } from "node:crypto";
import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/** Write a file atomically: write to a temp sibling then rename over the target. */
export function writeFileAtomic(path: string, content: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = join(dirname(path), `.${randomBytes(6).toString("hex")}.tmp`);
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

/** Serialize data as pretty JSON and write it atomically. */
export function writeJsonAtomic(path: string, data: unknown): void {
  writeFileAtomic(path, `${JSON.stringify(data, null, 2)}\n`);
}
