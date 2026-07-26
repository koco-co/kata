// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1077",
  "title": "验证【规则集管理 ❯ 编辑规则集 ❯ 监控规则 ❯】校验规则增删改功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面, 编辑规则集rule01, 点击下一步",
      "expected": "进入【编辑规则集 ❯ 基础信息】配置页面"
    },
    {
      "action": "选择规则包rule01, 点击【添加规则】按钮",
      "expected": "支持完整性校验、有效性校验、唯一性校验、统计性校验、自定义SQL"
    },
    {
      "action": "添加完整性校验, 正常配置后, 点击保存",
      "expected": "配置保存成功"
    },
    {
      "action": "添加有效性校验, 正常配置后, 点击保存",
      "expected": "配置保存成功"
    },
    {
      "action": "添加唯一性校验, 正常配置后, 点击保存",
      "expected": "配置保存成功"
    },
    {
      "action": "添加统计性校验, 正常配置后, 点击保存",
      "expected": "配置保存成功"
    },
    {
      "action": "添加自定义SQL, 正常配置后, 点击保存",
      "expected": "配置保存成功"
    },
    {
      "action": "添加至10个校验规则",
      "expected": "上限10个, 无法再次添加"
    },
    {
      "action": "选择校验规则A, 点击删除",
      "expected": "删除成功, 可再次添加"
    },
    {
      "action": "选择校验规则B, 编辑内容",
      "expected": "编辑成功"
    },
    {
      "action": "选择校验规则C, 点击克隆",
      "expected": "克隆成功, 配置内容保持一致"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯ 编辑规则集 ❯ 监控规则 ❯】校验规则增删改功能正常", () => {
  test("C1077 验证【规则集管理 ❯ 编辑规则集 ❯ 监控规则 ❯】校验规则增删改功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
