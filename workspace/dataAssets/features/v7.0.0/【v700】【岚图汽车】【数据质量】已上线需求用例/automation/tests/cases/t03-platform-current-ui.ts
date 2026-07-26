// spec: features/【v6410】【岚图汽车】【数据质量】已上线需求用例/results/inventory.json#area=platform
// 一致性校验：当前 CSV 数据无 platform area 用例（按需求名【模块】前缀分类后为空）；
// 保留该桶断言以记录不变量，真实 UI 自动化留作带环境的单独任务。
import { test } from "@playwright/test";

import { assertAreaConsistency } from "../helpers/inventory-consistency";

const EXPECT = {
  area: "platform",
  total: 0,
  priority: {},
  versionPattern: /^v6\.4\.\d+$/,
} as const;

const cases = assertAreaConsistency(EXPECT);

test.describe(`平台管理 / platform inventory consistency (${cases.length})`, () => {
  test("platform area inventory 自洽（当前为空）", () => {
    assertAreaConsistency(EXPECT);
  });
});
