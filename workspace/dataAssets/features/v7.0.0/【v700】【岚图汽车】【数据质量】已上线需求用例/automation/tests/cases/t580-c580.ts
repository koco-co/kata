// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C580",
  "title": "验证「监控规则」-「合理性校验」-「多表字段值对比」-「字段」配置下拉项正确",
  "steps": [
    {
      "action": "进入「资产-数据质量-规则集管理-监控规则」页面",
      "expected": "页面正常打开"
    },
    {
      "action": "点击【添加规则】按钮，选择「合理性校验」规则",
      "expected": "选择成功，页面显示「合理性校验」规则配置区域"
    },
    {
      "action": "配置「统计函数」为「多表字段值对比」",
      "expected": "选择成功"
    },
    {
      "action": "点击「字段」，查看下拉项",
      "expected": "仅展示\n1）数值型字段（TINYINT/SMALLINT/INT/BIGINT/FLOAT/DOUBLE/DECIMAL等）\n2）string类型字段"
    },
    {
      "action": "点击「设置」图标按钮",
      "expected": "弹出「计算逻辑配置」弹窗"
    },
    {
      "action": "选择当前校验表a，点击「字段」，搜索字段",
      "expected": "仅支持搜索到表a里的\n1）数值型字段（TINYINT/SMALLINT/INT/BIGINT/FLOAT/DOUBLE/DECIMAL等）\n2）string类型字段，附带强转为double的信息"
    },
    {
      "action": "更改数据表为关联表b，点击「字段」，搜索字段",
      "expected": "仅支持搜索到表b里的\n1）数值型字段（TINYINT/SMALLINT/INT/BIGINT/FLOAT/DOUBLE/DECIMAL等）\n2）string类型字段，附带强转为double的信息"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「多表字段值对比」-「字段」配置下拉项正确", () => {
  test("C580 验证「监控规则」-「合理性校验」-「多表字段值对比」-「字段」配置下拉项正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
