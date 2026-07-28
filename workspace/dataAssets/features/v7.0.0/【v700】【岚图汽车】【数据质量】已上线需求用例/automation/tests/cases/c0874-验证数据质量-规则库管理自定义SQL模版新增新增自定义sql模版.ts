// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0874",
  "title": "验证【数据质量-规则库管理 自定义SQL模版 新增】新增自定义sql模版",
  "steps": [
    {
      "action": "点击「新增自定义sql模版」",
      "expected": "成功进入新增页面，自定义sql模版 > 新建自定义sql模版"
    },
    {
      "action": "基本信息：输入合法的规则名称、规则分类、关联范围、规则描述",
      "expected": "3. 输入成功"
    },
    {
      "action": "自定义配置输入sql包含6个参数",
      "expected": "选择成功"
    },
    {
      "action": "参数类型选择：6个参数分别选择数值、数组、逻辑关系、当前校验表、当前校验表字段、自定义参数",
      "expected": "填写成功"
    },
    {
      "action": "参数名称：6个参数名称正常填写",
      "expected": "填写成功"
    },
    {
      "action": "参数输入：6个参数说明正常填写",
      "expected": "新增成功，列表数量+1"
    },
    {
      "action": "必填字段均正确填写，点击保存按钮",
      "expected": "返回上一页，且已填写内容不保存"
    },
    {
      "action": "点击取消",
      "expected": ""
    }
  ]
} as const;

test.describe("验证【数据质量-规则库管理 自定义SQL模版 新增】新增自定义sql模版", () => {
  test("C0874 验证【数据质量-规则库管理 自定义SQL模版 新增】新增自定义sql模版", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
