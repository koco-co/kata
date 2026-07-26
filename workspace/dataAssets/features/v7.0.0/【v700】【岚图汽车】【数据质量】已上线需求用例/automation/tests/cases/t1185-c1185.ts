// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1185",
  "title": "验证【数据质量 通用配置-json格式校验管理 新增key】新增key时key字段输入恰好255字符边界值可成功提交",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面标题显示「json格式校验管理」，列表加载完成，显示已有key数据行"
    },
    {
      "action": "点击【新增】按钮，填写表单, 内容如下:\n- *key: （字母 a 重复255次）\n- 数据源类型: sparkthrift2.x（保持默认）\n点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，包含255字符key的记录成功出现在列表中"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 新增key】新增key时key字段输入恰好255字符边界值可成功提交", () => {
  test("C1185 验证【数据质量 通用配置-json格式校验管理 新增key】新增key时key字段输入恰好255字符边界值可成功提交", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
