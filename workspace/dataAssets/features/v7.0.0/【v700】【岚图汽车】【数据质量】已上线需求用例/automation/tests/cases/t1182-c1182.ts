// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1182",
  "title": "验证【数据质量 通用配置-json格式校验管理 编辑key】编辑key名称、value格式、数据源类型并保存生效",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面正常加载，列表显示key editTarget 的记录"
    },
    {
      "action": "在key为 editTarget 的行，点击操作列的【编辑】按钮",
      "expected": "弹出编辑弹窗，key输入框显示当前值「editTarget」，value格式、数据源类型显示当前值"
    },
    {
      "action": "在编辑弹窗中修改表单, 内容如下:\n- *key: editTargetV2\n- value格式: ^\\\\d{4}$\n- 数据源类型: doris3.x\n点击【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表刷新，原key editTarget 记录更新为：\n1) key显示 editTargetV2\n2) value格式显示 ^\\\\d{4}$\n3) 数据源类型显示「doris3.x」\n4) 更新人为 admin（当前登录用户）\n5) 更新时间字段不为空，且晚于编辑操作前的时间"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 编辑key】编辑key名称、value格式、数据源类型并保存生效", () => {
  test("C1182 验证【数据质量 通用配置-json格式校验管理 编辑key】编辑key名称、value格式、数据源类型并保存生效", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
