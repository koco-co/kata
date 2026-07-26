// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1188",
  "title": "验证【数据质量 通用配置-json格式校验管理 新增key】新增key完整正向流程（含正则测试）",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "页面标题显示「json格式校验管理」，列表正常展示，包含以下列：\n1) key\n2) 中文名称\n3) value格式\n4) 数据源类型\n5) 创建人\n6) 创建时间\n7) 更新人\n8) 更新时间\n9) 操作"
    },
    {
      "action": "点击列表右上角【新增】按钮",
      "expected": "弹出弹窗，标题为「新增」，包含以下字段：\n1) key（必填）\n2) 中文名称（非必填）\n3) value格式（非必填）\n4) 数据源类型（必选，默认选中「sparkthrift2.x」）\n弹窗中暂不显示「测试数据」输入框及「正则匹配测试」按钮"
    },
    {
      "action": "在新增弹窗中填写表单, 内容如下:\n- *key: userInfo\n-*中文名称: 用户信息\n- value格式: ^[a-zA-Z]+$\n- 数据源类型: hive2.x",
      "expected": "各字段输入内容与填写值一致；value格式填写内容后，弹窗内动态显示「测试数据」输入框和「正则匹配测试」按钮"
    },
    {
      "action": "在「测试数据」输入框中填写 testValue，点击【正则匹配测试】按钮",
      "expected": "正则匹配测试执行，显示匹配结果为「匹配成功」"
    },
    {
      "action": "点击弹窗【确定】按钮，等待接口响应完成",
      "expected": "弹窗关闭，列表自动刷新，新增的key userInfo 出现在列表中：\n1) 数据源类型显示为「hive2.x」\n2) 中文名称显示「用户信息」\n3) value格式显示 ^[a-zA-Z]+$\n4) 创建人为 admin（当前登录用户）"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 新增key】新增key完整正向流程（含正则测试）", () => {
  test("C1188 验证【数据质量 通用配置-json格式校验管理 新增key】新增key完整正向流程（含正则测试）", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
