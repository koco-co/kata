// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1081",
  "title": "验证【规则集管理 ❯ 编辑规则集 ❯ 基础信息 ❯】规则包名称不可重复",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面, 编辑规则集rule01",
      "expected": "进入【编辑规则集 ❯ 基础信息】配置页面"
    },
    {
      "action": "在规则包配置中, 点击增加按钮, 添加规则包",
      "expected": "添加成功, 从第二个规则包开始均提供删除按钮"
    },
    {
      "action": "配置内容:1) 规则包1: rule012) 规则包2: rule01",
      "expected": "置红提示: 规则包名称不可重复"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯ 编辑规则集 ❯ 基础信息 ❯】规则包名称不可重复", () => {
  test("C1081 验证【规则集管理 ❯ 编辑规则集 ❯ 基础信息 ❯】规则包名称不可重复", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
