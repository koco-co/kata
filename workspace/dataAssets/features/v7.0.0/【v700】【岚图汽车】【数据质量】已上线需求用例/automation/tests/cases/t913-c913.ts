// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C913",
  "title": "验证「数据质量报告」中 Doris 3.x 数据源下载功能正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【数据质量报告】页面",
      "expected": "成功进入「已配置报告」页面"
    },
    {
      "action": "点击「已生成报告」页签",
      "expected": "成功切换到「已生成报告」"
    },
    {
      "action": "选择报告状态为「已生成」的报告记录, 点击「下载」",
      "expected": "下载文件中包含: 1个pdf文件和一个明细数据（异常数据）压缩包和多个xlsx文件, 格式如下:1) pdf文件命名为\"xxx(报告名称)+20250819（生成日期）.pdf\"，2) 压缩包命名为\"xxx(报告名称)+异常数据+20250819（生成日期）.zip\"3) 每个单独的规则生成一张明细数据表格，表格命名为\"xxx(规则名称)+异常数据.xlsx\"4) xlsx文件中异常数据列标红展示"
    }
  ]
} as const;

test.describe("验证「数据质量报告」中 Doris 3.x 数据源下载功能正常", () => {
  test("C913 验证「数据质量报告」中 Doris 3.x 数据源下载功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
