import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { assertAreaConsistency } from "./inventory-consistency.ts";

const FEATURE_DIR = resolve(
  import.meta.dir,
  "../../workspace/dataAssets/features/v7.0.0/【岚图汽车】【数据质量】已上线需求用例",
);

const expectations = [
  {
    area: "assets",
    total: 33,
    priority: { P0: 20, P1: 6, P2: 7 },
    versionPattern: /^v6\.4\.(3|10)$/,
  },
  {
    area: "metadata",
    total: 12,
    priority: { P0: 5, P1: 4, P2: 3 },
    versionPattern: /^v6\.4\.10$/,
  },
  {
    area: "platform",
    total: 0,
    priority: {},
    versionPattern: /^v6\.4\.\d+$/,
  },
  {
    area: "quality",
    total: 1088,
    priority: { P0: 257, P1: 512, P2: 319 },
    versionPattern: /^v6\.4\.(2|3|4|5|6|8|10)$/,
  },
  {
    area: "security",
    total: 8,
    priority: { P0: 2, P1: 3, P2: 3 },
    versionPattern: /^v6\.4\.4$/,
  },
  {
    area: "standard",
    total: 76,
    priority: { P0: 16, P1: 36, P2: 24 },
    versionPattern: /^v6\.4\.6$/,
  },
] as const;

describe("launched requirements inventory", () => {
  it("does not expose static inventory checks as Playwright automation", () => {
    expect(existsSync(join(FEATURE_DIR, "automation"))).toBe(false);
  });

  for (const expectation of expectations) {
    it(`${expectation.area} area remains internally consistent`, () => {
      expect(assertAreaConsistency(expectation)).toHaveLength(expectation.total);
    });
  }
});
