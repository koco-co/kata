// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C022",
  "title": "验证规则集引用规则仅支持删除",
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
      "action": "选择hive_rulePkg03规则包, 勾选所有校验规则, 并引入",
      "expected": "引入成功"
    },
    {
      "action": "检查完整性校验规则块",
      "expected": "规则块仅支持删除按钮, 其余编辑操作全部禁用(置灰), 包括克隆按钮"
    },
    {
      "action": "点击删除, 并二次确认删除",
      "expected": "删除成功"
    },
    {
      "action": "依次检查后面7个校验规则块",
      "expected": "仅支持删除, 其余编辑操作、克隆操作均不再支持"
    },
    {
      "action": "依次删除并二次确认",
      "expected": "删除成功"
    },
    {
      "action": "再次引入hive_rulePkg03规则包中的所有规则类型, 保存",
      "expected": "引入、保存成功"
    }
  ]
} as const;

test.describe("验证规则集引用规则仅支持删除", () => {
  test("C022 验证规则集引用规则仅支持删除", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
