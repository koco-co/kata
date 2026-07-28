// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0738",
  "title": "验证【数据质量 校验结果查询 校验不通过时明细查看与下载】取值范围&枚举范围规则校验「通过时不记录」明细数据且操作列不显示查看详情",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待列表加载完成",
      "expected": "校验结果查询页面打开，列表显示已有任务记录"
    },
    {
      "action": "在列表中找到 task_15695_or 最新实例记录，点击【查看详情】打开实例详情",
      "expected": "实例详情页面打开，规则名称为【取值范围&枚举范围】的规则行数据加载完成"
    },
    {
      "action": "在实例详情中查看该规则行的质检结果列、详情说明列和操作列内容",
      "expected": "实例详情中该规则行显示如下：\n1) 质检结果列显示「校验通过」\n2) 详情说明列显示「符合规则\"取值范围>1\"或\"枚举值in '1,2,3'\"」\n3) 操作列显示 --，不显示【查看详情】链接，明细数据不可访问"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验不通过时明细查看与下载】取值范围&枚举范围规则校验「通过时不记录」明细数据且操作列不显示查看详情", () => {
  test("C0738 验证【数据质量 校验结果查询 校验不通过时明细查看与下载】取值范围&枚举范围规则校验「通过时不记录」明细数据且操作列不显示查看详情", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
