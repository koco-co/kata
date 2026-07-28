// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0740",
  "title": "验证【数据质量 校验结果查询 校验不通过时明细查看与下载】取值范围&枚举范围规则校验「不通过时可查看」明细且校验字段标红展示",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待列表加载完成",
      "expected": "校验结果查询页面打开，列表显示已有任务记录"
    },
    {
      "action": "在列表中找到 task_15695_and 最新实例记录，点击【查看详情】打开实例详情",
      "expected": "实例详情页面打开，规则名称为【取值范围&枚举范围】的规则行数据加载完成，操作列显示【查看详情】链接"
    },
    {
      "action": "在实例详情中点击规则行操作列【查看详情】链接",
      "expected": "明细数据页面打开，显示不通过记录数据列表"
    },
    {
      "action": "在明细数据页面中查看数据列表的字段展示情况和记录内容",
      "expected": "明细数据展示如下：\n1) 数据列表保留全部字段（id、score、category 均显示）\n2) 校验字段 score 以标红方式展示（红色背景或红色字体）\n3) 列表中仅包含不符合规则的记录（id=2、id=4、id=5），共 3 条\n4) 符合规则的记录（id=1、id=3）不出现在明细中"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验不通过时明细查看与下载】取值范围&枚举范围规则校验「不通过时可查看」明细且校验字段标红展示", () => {
  test("C0740 验证【数据质量 校验结果查询 校验不通过时明细查看与下载】取值范围&枚举范围规则校验「不通过时可查看」明细且校验字段标红展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
