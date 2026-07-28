// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0579",
  "title": "验证「监控规则」-「合理性校验」-「多表字段值对比」-「计算逻辑配置」自动填充逻辑正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则集管理-监控规则」页面",
      "expected": "页面正常进入"
    },
    {
      "action": "添加「合理性校验-多表字段值对比」规则",
      "expected": "规则正常添加"
    },
    {
      "action": "点击「设置」图标按钮",
      "expected": "弹出「计算逻辑配置」弹窗"
    },
    {
      "action": "在弹窗「数据表」区域选择当前默认表A，「字段」搜索区域，搜索并点击：field_tinyint；\n「数据表」区域选择表B，「字段」搜索区域，搜索并点击：field_smallint；",
      "expected": "A.field_tinyint、B.field_smallint自动填充到左边编辑框中"
    },
    {
      "action": "点击\"+\"",
      "expected": "两字段拼接为A.field_tinyint B.field_smallint+"
    },
    {
      "action": "点击【确定】按钮",
      "expected": "规则区域的「计算逻辑配置」自动填充为\"A.field_tinyint+B.field_smallint\""
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「多表字段值对比」-「计算逻辑配置」自动填充逻辑正确", () => {
  test("C0579 验证「监控规则」-「合理性校验」-「多表字段值对比」-「计算逻辑配置」自动填充逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
