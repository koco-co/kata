// tests/cli/atomic-writer.test.ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  writeFileAtomic,
  writeFileExclusiveAtomic,
  writeJsonAtomic,
  writeJsonExclusiveAtomic,
} from "../../cli/lib/atomic-writer.ts";

describe("writeFileAtomic", () => {
  it("writes content and leaves no temp files", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-aw-"));
    const f = join(dir, "a.txt");
    writeFileAtomic(f, "hello");
    expect(readFileSync(f, "utf8")).toBe("hello");
    expect(readdirSync(dir).filter((n) => n.includes(".tmp"))).toEqual([]);
  });

  it("writeJsonAtomic round-trips", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-aw-"));
    const f = join(dir, "a.json");
    writeJsonAtomic(f, { a: 1 });
    expect(JSON.parse(readFileSync(f, "utf8"))).toEqual({ a: 1 });
  });

  it("publishes immutable files atomically and refuses replacement", () => {
    const root = mkdtempSync(join(tmpdir(), "atomic-exclusive-"));
    const textPath = join(root, "immutable.txt");
    const jsonPath = join(root, "immutable.json");
    try {
      writeFileExclusiveAtomic(textPath, "first\n");
      expect(readFileSync(textPath, "utf8")).toBe("first\n");
      expect(() => writeFileExclusiveAtomic(textPath, "second\n")).toThrow();
      expect(readFileSync(textPath, "utf8")).toBe("first\n");

      writeJsonExclusiveAtomic(jsonPath, { schema_version: 1 });
      expect(JSON.parse(readFileSync(jsonPath, "utf8"))).toEqual({ schema_version: 1 });
      expect(() => writeJsonExclusiveAtomic(jsonPath, { schema_version: 2 })).toThrow();
      expect(JSON.parse(readFileSync(jsonPath, "utf8"))).toEqual({ schema_version: 1 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
