// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1326",
  "title": "验证【数据标准映射功能调整】「标准管理」-「标准定义」-「标准上线」自动映射逻辑调整",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】标准，点击对应【上线按钮】按钮",
      "expected": "弹出提示框\"数据标准上线后，支持在标准映射中选择已上线的标准进行映射\""
    },
    {
      "action": "进入【标准管理】-【标准映射】",
      "expected": "进入成功"
    },
    {
      "action": "查看是否有自动生成的映射任务",
      "expected": "无自动生成映射"
    },
    {
      "action": "点击【标准映射】按钮",
      "expected": "进入[标准映射]配置页面"
    },
    {
      "action": "【标准映射】配置如下：\n[标准目录] tst\n[数据标准] test\n[映射目标] 设定数据源",
      "expected": "[标准映射]配置完毕"
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

test.describe("验证【数据标准映射功能调整】「标准管理」-「标准定义」-「标准上线」自动映射逻辑调整", () => {
  test("C1326 验证【数据标准映射功能调整】「标准管理」-「标准定义」-「标准上线」自动映射逻辑调整", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
