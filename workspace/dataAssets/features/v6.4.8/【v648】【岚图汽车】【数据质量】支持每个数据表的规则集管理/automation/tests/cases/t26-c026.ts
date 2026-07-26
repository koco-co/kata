// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C026",
  "title": "验证规则集引用功能正常(规则包多选)",
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
      "action": "选择hive_rulePkg01、02规则包, 检查规则类型下拉框数据",
      "expected": "仅支持选择: 完整性校验和唯一性校验"
    },
    {
      "action": "勾选所有规则类型后, 点击【引入】",
      "expected": "引入完整性校验 * 1 + 唯一性校验 * 10 , 引入配置正确"
    }
  ]
} as const;

test.describe("验证规则集引用功能正常(规则包多选)", () => {
  test("C026 验证规则集引用功能正常(规则包多选)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
