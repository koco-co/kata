import { describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readHistory, recordFeature } from "../../cli/lib/tui/history.ts";
import type { FeatureRef } from "../../cli/lib/tui/types.ts";

function feature(project: string, title: string): FeatureRef {
  return {
    project,
    relativePath: `v1/${title}`,
    featureDir: `/tmp/${project}/${title}`,
    featureKey: `${project}:v1/${title}`,
    title,
    version: "v1",
    module: "测试",
  };
}

describe("TUI history", () => {
  it("keeps at most 5 features and returns newest first", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-tui-history-"));
    const file = join(dir, "history.json");
    try {
      const refs = Array.from({ length: 6 }, (_, index) =>
        feature("dataAssets", `需求${index + 1}`),
      );
      for (const ref of refs) recordFeature(ref, file);
      const history = readHistory(file);
      expect(history).toHaveLength(5);
      expect(history[0]?.title).toBe("需求6");
      expect(history[4]?.title).toBe("需求2");
      expect(history.some((entry) => entry.title === "需求1")).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("deduplicates the same feature and moves it to the front", () => {
    const dir = mkdtempSync(join(tmpdir(), "kata-tui-history-"));
    const file = join(dir, "history.json");
    try {
      const first = feature("dataAssets", "需求A");
      const second = feature("dataAssets", "需求B");
      recordFeature(first, file);
      recordFeature(second, file);
      recordFeature(first, file);
      const history = readHistory(file);
      expect(history).toHaveLength(2);
      expect(history.map((entry) => entry.title)).toEqual(["需求A", "需求B"]);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
