// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C972",
  "title": "验证【「已配置报告」】「新建报告」-页面UI显示正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击「新建报告」按钮",
      "expected": "弹出「新建报告」弹窗"
    },
    {
      "action": "UI CHECK",
      "expected": "1) 基础信息: 报告名称/生成样式/规则范围\n2) 关联数据表: 删除和新增\n3） 报告周期及内容设置: 报告周期/数据周期/是否需要车辆信息(默认选择「是」)\n4) 展示最新结果(默认) / 展示全部结果\n5) 按钮: 「取消」、「确定」"
    }
  ]
} as const;

test.describe("验证【「已配置报告」】「新建报告」-页面UI显示正确", () => {
  test("C972 验证【「已配置报告」】「新建报告」-页面UI显示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
