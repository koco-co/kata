// spec: features/【v6410】【岚图汽车】【数据质量】已上线需求用例/results/inventory.json#area=quality
// 一致性校验：quality area 与 inventory 自洽；真实 UI 自动化留作带环境的单独任务。
import { test } from "@playwright/test";

import { assertAreaConsistency } from "../helpers/inventory-consistency";

const EXPECT = {
  area: "quality",
  total: 1088,
  priority: { P0: 257, P1: 512, P2: 319 },
  versionPattern: /^v6\.4\.(2|3|4|5|6|8|10)$/,
} as const;

// runner import 即触发收集期校验。
const cases = assertAreaConsistency(EXPECT);

test.describe(`数据质量 / quality inventory consistency (${cases.length})`, () => {
  test("quality area inventory 自洽", () => {
    assertAreaConsistency(EXPECT);
  });
});
