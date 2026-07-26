// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1120",
  "title": "验证【数据质量 规则集管理 枚举值 in/not in 切换】原有枚举值规则同步新增not in选项且可正常保存",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面打开，列表显示已有规则集数据行"
    },
    {
      "action": "找到\"ruleset_15695_enum_orig\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则，在\"原枚举值包\"中点击【新增规则】，在统计函数下拉框中选择原有的【枚举值】规则类型，查看枚举值设置行中下拉框选项",
      "expected": "枚举值设置下拉框中包含【in】和【not in】两个选项"
    },
    {
      "action": "在枚举值设置下拉框中选择【not in】，按顺序填写如下：\n- *字段: category\n-*枚举值信息: 依次输入 4、5\n- 强弱规则: 强规则\n- 过滤条件: 无\n- 规则描述: 无\n点击【保存】按钮，再点击页面底部【保存】",
      "expected": "规则保存成功，规则列表中对应规则的枚举值列显示 not in '4,5'"
    }
  ]
} as const;

test.describe("验证【数据质量 规则集管理 枚举值 in/not in 切换】原有枚举值规则同步新增not in选项且可正常保存", () => {
  test("C1120 验证【数据质量 规则集管理 枚举值 in/not in 切换】原有枚举值规则同步新增not in选项且可正常保存", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
