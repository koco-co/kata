// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0577",
  "title": "验证「监控规则」-「合理性校验」-「多表字段值对比」-「计算逻辑配置」弹窗页数据表选择功能正确",
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
      "action": "仅关联表B",
      "expected": "关联成功"
    },
    {
      "action": "点击「设置」图标按钮",
      "expected": "弹出「计算逻辑配置」弹窗"
    },
    {
      "action": "查看「数据表」区域",
      "expected": "默认选择当前校验表A"
    },
    {
      "action": "选择表B",
      "expected": "支持选择，可搜索选择表B下面的数值型和string类型的字段"
    },
    {
      "action": "选择表C",
      "expected": "不支持选择"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「多表字段值对比」-「计算逻辑配置」弹窗页数据表选择功能正确", () => {
  test("C0577 验证「监控规则」-「合理性校验」-「多表字段值对比」-「计算逻辑配置」弹窗页数据表选择功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
