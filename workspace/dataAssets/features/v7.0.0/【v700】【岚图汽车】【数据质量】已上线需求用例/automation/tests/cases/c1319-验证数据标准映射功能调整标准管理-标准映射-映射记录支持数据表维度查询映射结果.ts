// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1319",
  "title": "验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射记录」支持数据表维度查询映射结果",
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
      "action": "UI Check",
      "expected": "在【映射记录】栏日期筛选框后有【数据表名称搜索框】，点击可进行输入"
    },
    {
      "action": "在【数据表名称搜索框】中输入【test】表，点击放大镜按钮",
      "expected": "映射记录页面更新，展示根据test模糊搜索结果的相关字段"
    }
  ]
} as const;

test.describe("验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射记录」支持数据表维度查询映射结果", () => {
  test("C1319 验证【数据标准映射功能调整】「标准管理」-「标准映射」-「映射记录」支持数据表维度查询映射结果", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
