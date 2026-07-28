// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0023",
  "title": "验证更换规则包但不引入, 校验规则配置不变",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面, 点击新增规则集",
      "expected": "进入【新建规则集 ❯ 基础信息】配置页面"
    },
    {
      "action": "正常配置基础信息内容, 点击下一步",
      "expected": "进入监控规则配置页面"
    },
    {
      "action": "选择已配置校验规则的规则包1并引入",
      "expected": "规则包1中的校验规则引入成功, 配置信息正确"
    },
    {
      "action": "更换为规则包2 (不引入)",
      "expected": "规则包下的校验规则配置内容不变"
    },
    {
      "action": "保存后, 检查规则任务配置信息",
      "expected": "保存成功, 配置内容不变:1) 规则包: 规则包12) 校验规则: 规则包1中的校验规则"
    }
  ]
} as const;

test.describe("验证更换规则包但不引入, 校验规则配置不变", () => {
  test("C0023 验证更换规则包但不引入, 校验规则配置不变", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
