// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1099",
  "title": "验证【规则集管理 ❯】规则集管理页面",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "检查页面UI",
      "expected": "1、支持规则集列表展示, 包含表名、所属数据库、所属数据源、规则包数量、规则数量、规则集描述、更新人、更新时间、操作2、支持对规则集的增删改查3、支持对规则集分页列表展示"
    },
    {
      "action": "检查列表数据",
      "expected": "1) 表名: ${最后一次编辑规则集时的表名}2) 所属数据库:  ${最后一次编辑规则集时的数据库}3) 所属数据源: ${最后一次编辑规则集时的数据源}4) 规则包数量:  ${最后一次编辑规则集时的规则包数量, 不超过20}5) 规则数量: ${最后一次编辑规则集时的规则数量}6) 规则集描述:  ${最后一次编辑规则集时的规则集描述}7) 更新人: ${最后一次编辑规则集时的账号}8) 更新时间:  ${最后一次编辑规则集时的时间}"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯】规则集管理页面", () => {
  test("C1099 验证【规则集管理 ❯】规则集管理页面", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
