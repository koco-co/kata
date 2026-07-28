// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1187",
  "title": "验证【数据质量 通用配置-json格式校验管理 新增key】新增key时key字段为空不可提交",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面标题显示「json格式校验管理」，列表加载完成，显示已有key数据行"
    },
    {
      "action": "点击【新增】按钮，弹窗出现后填写表单, 内容如下:\n- *key: （留空不填）\n- 数据源类型: sparkthrift2.x（保持默认）\n点击【确定】按钮",
      "expected": "表单校验触发，key输入框下方显示「请输入key」，弹窗不关闭，数据未提交"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 新增key】新增key时key字段为空不可提交", () => {
  test("C1187 验证【数据质量 通用配置-json格式校验管理 新增key】新增key时key字段为空不可提交", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
