// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C365",
  "title": "验证【所有支持配置分区的地方支持\"选择动态分区\"，选择后配置内容和选表时保持一致】「监控对象」-「选择分区」支持\"选择动态分区\"（新建监控规则-监控对象）",
  "steps": [
    {
      "action": "进入【资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建监控规则】按钮",
      "expected": "进入[监控对象]配置页面"
    },
    {
      "action": "监控对象配置如下：[规则名称]输入「test_rule」[选择数据源]选择「${DATASOURCE}」[选择数据库]选择「${DATABASE}」[选择数据表]选择「${TABLE}」[选择分区] 手动输入分区 - \"id=1\"",
      "expected": "[监控对象]配置完成，支持\"选择动态分区\""
    }
  ]
} as const;

test.describe("验证【所有支持配置分区的地方支持\"选择动态分区\"，选择后配置内容和选表时保持一致】「监控对象」-「选择分区」支持\"选择动态分区\"（新建监控规则-监控对象）", () => {
  test("C365 验证【所有支持配置分区的地方支持\"选择动态分区\"，选择后配置内容和选表时保持一致】「监控对象」-「选择分区」支持\"选择动态分区\"（新建监控规则-监控对象）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
