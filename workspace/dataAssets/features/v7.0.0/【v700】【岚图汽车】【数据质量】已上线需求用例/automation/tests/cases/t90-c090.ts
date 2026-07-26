// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C090",
  "title": "验证「完整性校验」-对比表添加/删除功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "「新建监控规则」, 校验类型选择「多表数据内容对比」",
      "expected": "配置成功"
    },
    {
      "action": "在对比表部分中, 选择第一个表/分区/字段/期望值/主键选项后, 点击「+」按钮",
      "expected": "1) 新增一行对比表配置项2) 出现「-」按钮, 可以删除对比表配置项"
    },
    {
      "action": "依次添加至10行对比表配置后, 再次点击「+」",
      "expected": "提示 「最多可配置10张表」"
    },
    {
      "action": "点击\"-\"删除按钮",
      "expected": "成功删除该行对比表"
    }
  ]
} as const;

test.describe("验证「完整性校验」-对比表添加/删除功能正常", () => {
  test("C090 验证「完整性校验」-对比表添加/删除功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
