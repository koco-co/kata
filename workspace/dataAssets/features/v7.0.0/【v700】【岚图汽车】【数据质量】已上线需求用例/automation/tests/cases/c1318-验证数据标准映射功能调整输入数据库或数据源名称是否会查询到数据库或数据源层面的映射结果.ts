// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1318",
  "title": "验证【数据标准映射功能调整】输入[数据库]或[数据源]名称是否会查询到数据库或数据源层面的映射结果",
  "steps": [
    {
      "action": "进入【标准管理】-【标准映射】",
      "expected": "进入成功"
    },
    {
      "action": "找到【test】记录，点击对应的【映射记录】按钮",
      "expected": "弹出[映射记录]详情页面"
    },
    {
      "action": "在【数据表名称搜索框】中输入【test】库（表中无重名现象），点击放大镜按钮",
      "expected": "映射记录页面更新，无搜索结果"
    }
  ]
} as const;

test.describe("验证【数据标准映射功能调整】输入[数据库]或[数据源]名称是否会查询到数据库或数据源层面的映射结果", () => {
  test("C1318 验证【数据标准映射功能调整】输入[数据库]或[数据源]名称是否会查询到数据库或数据源层面的映射结果", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
