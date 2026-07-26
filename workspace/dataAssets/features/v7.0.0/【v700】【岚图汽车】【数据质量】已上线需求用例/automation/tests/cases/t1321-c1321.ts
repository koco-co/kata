// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1321",
  "title": "验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」数据库非单选时，数据表默认选择全部",
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
      "action": "【标准映射】配置如下：\n[标准目录] tst\n[数据标准] test\n[数据源类型] MySQL-test-\"全部\"",
      "expected": "4. 【数据表】默认选择全部"
    },
    {
      "action": "确认【数据表】是否默认选择全部",
      "expected": ""
    },
    {
      "action": "锁不锁操作？",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」数据库非单选时，数据表默认选择全部", () => {
  test("C1321 验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」数据库非单选时，数据表默认选择全部", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
