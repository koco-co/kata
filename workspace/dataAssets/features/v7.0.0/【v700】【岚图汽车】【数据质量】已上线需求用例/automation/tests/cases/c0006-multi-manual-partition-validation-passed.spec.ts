// spec: features/v7.0.0/【v700】【岚图汽车】【数据质量】已上线需求用例/results/inventory.json#area=standard
// 一致性校验：standard area 与 inventory 自洽；真实 UI 自动化留作带环境的单独任务。
import { test } from "@playwright/test";

import { assertAreaConsistency } from "../assertions/inventory-consistency";

const EXPECT = {
  area: "standard",
  total: 76,
  priority: { P0: 16, P1: 36, P2: 24 },
  versionPattern: /^v6\.4\.6$/,
} as const;

const cases = assertAreaConsistency(EXPECT);

test.describe(`数据标准 / standard inventory consistency (${cases.length})`, () => {
  test("standard area inventory 自洽", () => {
    assertAreaConsistency(EXPECT);
  });
});
