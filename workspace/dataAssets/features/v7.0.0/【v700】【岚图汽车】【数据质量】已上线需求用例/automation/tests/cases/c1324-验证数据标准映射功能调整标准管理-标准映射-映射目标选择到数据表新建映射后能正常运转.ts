// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1324",
  "title": "验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」选择到数据表新建映射后能正常运转",
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
      "action": "【标准映射】配置如下：\n[标准目录] tst\n[数据标准] test\n[映射目标] MySQL-test_MYSQL-test-test",
      "expected": "[标准映射]配置完毕"
    },
    {
      "action": "点击【确定】按钮",
      "expected": "成功生成映射任务"
    },
    {
      "action": "点击【确定】按钮",
      "expected": "成功生成映射任务"
    },
    {
      "action": "点击【映射记录】按钮",
      "expected": "查看到正确的映射记录"
    }
  ]
} as const;

test.describe("验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」选择到数据表新建映射后能正常运转", () => {
  test("C1324 验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射目标」选择到数据表新建映射后能正常运转", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
