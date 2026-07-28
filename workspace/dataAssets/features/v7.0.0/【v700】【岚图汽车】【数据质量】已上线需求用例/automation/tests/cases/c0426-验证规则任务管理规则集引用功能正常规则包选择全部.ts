// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0426",
  "title": "验证【规则任务管理 ❯】规则集引用功能正常(规则包选择全部)",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则任务管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "新建监控规则, 配置监控对象(hive_table)后点击下一步",
      "expected": "进入【新建单表校验规则 ❯ 监控规则】配置页面"
    },
    {
      "action": "选择hive_rulePkg01、02、03规则包, 检查规则类型下拉框数据",
      "expected": "支持选择完整性校验~合理性校验共8项"
    },
    {
      "action": "勾选所有规则类型后, 点击【引入】",
      "expected": "引入成功, 不同规则包间的相同校验规则均被引入至规则任务: 完整性校验*2 + 唯一性校验*11 + 其它6种校验*1"
    }
  ]
} as const;

test.describe("验证【规则任务管理 ❯】规则集引用功能正常(规则包选择全部)", () => {
  test("C0426 验证【规则任务管理 ❯】规则集引用功能正常(规则包选择全部)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
