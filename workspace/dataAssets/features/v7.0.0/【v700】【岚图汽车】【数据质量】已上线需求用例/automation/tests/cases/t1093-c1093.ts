// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1093",
  "title": "验证【规则集管理 ❯ 新建规则集 ❯ 基础信息 ❯】规则包名称增删改功能",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面, 点击新增规则集",
      "expected": "进入【新建规则集 ❯ 基础信息】配置页面"
    },
    {
      "action": "正常配置选择数据表内容",
      "expected": "配置成功"
    },
    {
      "action": "在规则包名称配置中, 点击增加按钮, 添加规则包名称",
      "expected": "添加成功, 从第二个规则包名称开始均提供删除按钮"
    },
    {
      "action": "添加至20个规则包名称",
      "expected": "增加按钮消失"
    },
    {
      "action": "删除任一规则包名称",
      "expected": "可再次添加"
    },
    {
      "action": "删除至1个规则包名称",
      "expected": "删除按钮消失"
    },
    {
      "action": "规则包名称输入框输入51字符",
      "expected": "置红提示: 规则包名称最大50个字符"
    },
    {
      "action": "输入50字符, 点击下一步",
      "expected": "配置成功"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯ 新建规则集 ❯ 基础信息 ❯】规则包名称增删改功能", () => {
  test("C1093 验证【规则集管理 ❯ 新建规则集 ❯ 基础信息 ❯】规则包名称增删改功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
