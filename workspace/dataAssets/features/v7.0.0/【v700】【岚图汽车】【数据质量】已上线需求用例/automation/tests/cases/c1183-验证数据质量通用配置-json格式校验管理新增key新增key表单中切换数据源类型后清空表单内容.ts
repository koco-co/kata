// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1183",
  "title": "验证【数据质量 通用配置-json格式校验管理 新增key】新增key表单中切换数据源类型后清空表单内容",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面正常打开，列表加载完成"
    },
    {
      "action": "点击【新增】按钮，在弹窗中填写表单内容如下：\n- *key: switchTest\n- 中文名称: 切换测试\n- value格式: ^[a-z]+$\n- 数据源类型: sparkthrift2.x（默认值）",
      "expected": "各字段显示已填写的内容，数据源类型显示「sparkthrift2.x」"
    },
    {
      "action": "将数据源类型下拉框从「sparkthrift2.x」切换为「hive2.x」",
      "expected": "数据源类型切换为「hive2.x」，表单中其他字段（key、中文名称、value格式）内容被清空，恢复为初始空状态"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 新增key】新增key表单中切换数据源类型后清空表单内容", () => {
  test("C1183 验证【数据质量 通用配置-json格式校验管理 新增key】新增key表单中切换数据源类型后清空表单内容", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
