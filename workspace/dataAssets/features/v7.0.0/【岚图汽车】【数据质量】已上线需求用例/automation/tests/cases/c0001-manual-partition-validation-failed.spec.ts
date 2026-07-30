// spec: features/v7.0.0/【岚图汽车】【数据质量】已上线需求用例/automation/tests/fixtures/launched-requirements-inventory.yaml#area=assets
// 一致性校验：assets area 与 inventory 自洽；真实 UI 自动化留作带环境的单独任务。
import { test } from "@playwright/test";

import { assertAreaConsistency } from "../assertions/inventory-consistency";

const EXPECT = {
  area: "assets",
  total: 33,
  priority: { P0: 20, P1: 6, P2: 7 },
  versionPattern: /^v6\.4\.(3|10)$/,
} as const;

test.describe("数据资产 / assets inventory consistency", () => {
  test("assets area inventory 自洽", () => {
    assertAreaConsistency(EXPECT);
  });
});
