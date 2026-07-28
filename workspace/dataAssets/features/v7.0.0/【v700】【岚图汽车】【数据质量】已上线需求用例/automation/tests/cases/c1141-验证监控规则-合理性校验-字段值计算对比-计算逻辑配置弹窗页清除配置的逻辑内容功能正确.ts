// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1141",
  "title": "验证「监控规则」-「合理性校验」-「字段值计算对比」-「计算逻辑配置」弹窗页清除配置的逻辑内容功能正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则集管理-监控规则」页面",
      "expected": "页面正常进入"
    },
    {
      "action": "添加「合理性校验-字段值计算对比」规则",
      "expected": "规则正常添加"
    },
    {
      "action": "点击「设置」图标按钮",
      "expected": "弹出「计算逻辑配置」弹窗"
    },
    {
      "action": "在弹窗「字段」搜索区域，搜索并点击：field_tinyint、field_smallint",
      "expected": "field_tinyint、field_smallint字段自动填充到左边编辑框中"
    },
    {
      "action": "手动输入计算符号，拼接为：（field_tinyint+field_smallint）*field_smallint",
      "expected": "拼接成功"
    },
    {
      "action": "点击「清除」图标",
      "expected": "内容被成功全部清除"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「字段值计算对比」-「计算逻辑配置」弹窗页清除配置的逻辑内容功能正确", () => {
  test("C1141 验证「监控规则」-「合理性校验」-「字段值计算对比」-「计算逻辑配置」弹窗页清除配置的逻辑内容功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
