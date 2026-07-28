// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0024",
  "title": "验证规则集引用功能正常(覆盖引入)",
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
      "action": "选择hive_rulePkg01规则包, 完整性校验, 并引入",
      "expected": "引入成功"
    },
    {
      "action": "选择hive_rulePkg02规则包, 完整性校验, 并引入",
      "expected": "提示: 引入后会对已有规则进行覆盖引入，请确认是否引入"
    },
    {
      "action": "确认引入后, 检查校验规则配置",
      "expected": "引入后对已有规则配置进行覆盖"
    },
    {
      "action": "保存规则任务后, 检查规则任务详情页",
      "expected": "规则配置为: 引入后的规则"
    }
  ]
} as const;

test.describe("验证规则集引用功能正常(覆盖引入)", () => {
  test("C0024 验证规则集引用功能正常(覆盖引入)", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
