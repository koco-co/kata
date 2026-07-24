// tests/cli/atomic-writer.test.ts
import { describe, expect, it } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writeFileAtomic, writeJsonAtomic } from "../../cli/lib/atomic-writer.ts";

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
});
