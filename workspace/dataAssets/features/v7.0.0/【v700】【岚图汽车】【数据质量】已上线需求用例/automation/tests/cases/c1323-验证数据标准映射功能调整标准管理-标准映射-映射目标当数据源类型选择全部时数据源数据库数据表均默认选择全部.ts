// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1323",
  "title": "验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」当数据源类型选择\"全部\"时，数据源、数据库、数据表均默认选择全部",
  "steps": [
    {
      "action": "进入【标准管理】-【标准映射】",
      "expected": "进入成功"
    },
    {
      "action": "点击【标准映射】按钮",
      "expected": "进入[标准映射]配置页面"
    },
    {
      "action": "【标准映射】配置如下：\n[标准目录] tst\n[数据标准] test",
      "expected": "4. 数据源类型根据选择变为\"全部‘，数据源、数据库、数据表均默认选择全部且无法操作"
    },
    {
      "action": "【数据源类型】尝试选择\"全部\"",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」当数据源类型选择\"全部\"时，数据源、数据库、数据表均默认选择全部", () => {
  test("C1323 验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」当数据源类型选择\"全部\"时，数据源、数据库、数据表均默认选择全部", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
