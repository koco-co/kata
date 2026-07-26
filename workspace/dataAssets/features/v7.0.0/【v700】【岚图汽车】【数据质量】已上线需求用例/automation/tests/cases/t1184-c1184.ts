// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1184",
  "title": "验证【数据质量 通用配置-json格式校验管理 新增key】新增key时数据源类型三种选项可正常切换",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面标题显示「json格式校验管理」，列表加载完成，显示已有key数据行"
    },
    {
      "action": "点击【新增】按钮，查看数据源类型下拉框的默认值及可选项",
      "expected": "数据源类型默认值为「sparkthrift2.x」，下拉可选项包含且仅包含：\n1) sparkthrift2.x\n2) hive2.x\n3) doris3.x"
    },
    {
      "action": "依次点击选择「hive2.x」，再选择「doris3.x」，再选回「sparkthrift2.x」",
      "expected": "下拉框当前值显示为所选数据源类型名称"
    },
    {
      "action": "填写表单, 内容如下:\n- *key: typeTestKey\n- 数据源类型: doris3.x\n点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表中新增记录数据源类型列显示「doris3.x」"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 新增key】新增key时数据源类型三种选项可正常切换", () => {
  test("C1184 验证【数据质量 通用配置-json格式校验管理 新增key】新增key时数据源类型三种选项可正常切换", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
