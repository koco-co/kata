// spec: features/v7.0.0/【v700】【岚图汽车】【数据质量】已上线需求用例/results/inventory.json#area=security
// 一致性校验：security area（v6.4.4 数据质量权限点）与 inventory 自洽；真实 UI 自动化留作带环境的单独任务。
import { test } from "@playwright/test";

import { assertAreaConsistency } from "../helpers/inventory-consistency";

const EXPECT = {
  area: "security",
  total: 8,
  priority: { P0: 2, P1: 3, P2: 3 },
  versionPattern: /^v6\.4\.4$/,
} as const;

const cases = assertAreaConsistency(EXPECT);

test.describe(`权限控制 / security inventory consistency (${cases.length})`, () => {
  test("security area inventory 自洽", () => {
    assertAreaConsistency(EXPECT);
  });
});
