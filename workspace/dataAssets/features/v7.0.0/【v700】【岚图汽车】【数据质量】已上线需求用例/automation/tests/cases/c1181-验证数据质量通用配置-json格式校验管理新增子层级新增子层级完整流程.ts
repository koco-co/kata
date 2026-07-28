// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1181",
  "title": "验证【数据质量 通用配置-json格式校验管理 新增子层级】新增子层级完整流程",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，列表显示 parentKey 记录"
    },
    {
      "action": "在key为 parentKey 的行，点击操作列的【新增子层级】按钮",
      "expected": "弹出弹窗，标题为「新增子层级」，包含以下字段：\n1) key（必填）\n2) 中文名称（非必填）\n3) value格式（非必填）\n弹窗中不包含数据源类型选项"
    },
    {
      "action": "在弹窗中填写表单, 内容如下:\n- *key: childKey\n-*中文名称: 子层级键\n- value格式: ^[0-9]+$\n点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，parentKey 行显示「+」展开图标，点击「+」后展开子层级，可见key为 childKey 的子层级记录：\n1) 中文名称显示「子层级键」\n2) value格式显示 ^[0-9]+$"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 新增子层级】新增子层级完整流程", () => {
  test("C1181 验证【数据质量 通用配置-json格式校验管理 新增子层级】新增子层级完整流程", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
