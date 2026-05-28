import { describe, expect, test } from "bun:test";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../../lib/paths.ts";
import { loadSkillManifest } from "../../src/skills/manifest-loader.ts";

describe("manifest repository", () => {
  test("manifest covers every skill in .claude/skills", () => {
    const root = repoRoot();
    const skillsDir = join(root, ".claude/skills");
    const ids = readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory());
    const m = loadSkillManifest(root);
    const manifestIds = Object.keys(m.skills).sort();
    expect(manifestIds).toEqual(ids.sort());
    for (const id of ids) {
      const entry = m.skills[id];
      expect(entry?.user_entry).toBeTruthy();
      expect(typeof entry?.user_entry).toBe("string");
      expect(
        (entry?.dataflow.consumes.length ?? 0) + (entry?.dataflow.produces.length ?? 0),
      ).toBeGreaterThan(0);
    }
  });
});
