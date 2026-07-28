// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1186",
  "title": "验证【数据质量 通用配置-json格式校验管理 新增key】新增key时key字段输入超255字符不可提交",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面标题显示「json格式校验管理」，列表加载完成，显示已有key数据行"
    },
    {
      "action": "点击【新增】按钮，在key输入框中输入256个字符（字母 a 重复256次），点击【确定】按钮",
      "expected": "表单校验触发，key输入框显示「长度不能超过255字符」，弹窗不关闭，数据未提交"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 新增key】新增key时key字段输入超255字符不可提交", () => {
  test("C1186 验证【数据质量 通用配置-json格式校验管理 新增key】新增key时key字段输入超255字符不可提交", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
