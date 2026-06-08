// spec: features/【v6410】【岚图汽车】【数据质量】已上线需求用例/results/inventory.json#area=metadata
// 一致性校验：metadata area 与 inventory 自洽；真实 UI 自动化留作带环境的单独任务。
import { test } from "@playwright/test";

import { assertAreaConsistency } from "./inventory-consistency";

const EXPECT = {
  area: "metadata",
  total: 12,
  priority: { P0: 5, P1: 4, P2: 3 },
  versionPattern: /^v6\.4\.10$/,
} as const;

const cases = assertAreaConsistency(EXPECT);

test.describe(`元数据 / metadata inventory consistency (${cases.length})`, () => {
  test("metadata area inventory 自洽", () => {
    assertAreaConsistency(EXPECT);
  });
});
