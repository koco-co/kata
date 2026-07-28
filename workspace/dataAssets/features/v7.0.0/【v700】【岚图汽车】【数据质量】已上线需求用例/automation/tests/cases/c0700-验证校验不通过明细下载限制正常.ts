// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0700",
  "title": "验证校验不通过明细下载限制正常",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【校验结果查询】，分别选择校验规则为统计性校验同时校验方法为IQR离群点数量/IQR离群点占比/Z- score置信区间的任务实例，点击表名",
      "expected": "右侧弹出实例详情"
    },
    {
      "action": "点击查看明细",
      "expected": "显示失败字段信息，最多1000条"
    },
    {
      "action": "点击下载明细",
      "expected": "下载文件内容展示字段信息最多10000条"
    }
  ]
} as const;

test.describe("验证校验不通过明细下载限制正常", () => {
  test("C0700 验证校验不通过明细下载限制正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
