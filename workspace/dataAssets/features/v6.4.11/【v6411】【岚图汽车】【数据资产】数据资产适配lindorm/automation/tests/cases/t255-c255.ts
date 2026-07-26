// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C255",
  "title": "验证码表管理-导入异常",
  "steps": [
    {
      "action": "【代码管理】sheet页未填写内容",
      "expected": "提示为：请完善“代码信息”sheet页信息后再导入。"
    },
    {
      "action": "【代码管理】sheet页未填写必填项",
      "expected": "提示为：请完善“代码信息”sheet页信息后再导入。"
    },
    {
      "action": "【编码管理】sheet页未填写内容",
      "expected": "提示为：请完善“编码管理”sheet页信息后再导入。"
    },
    {
      "action": "【代码管理】和【编码管理】的：代码名称和代码编号两个sheet页不一致",
      "expected": "提示为：导入表格中“代码管理”“编码管理”两个sheet页中存在代码名称与代码编号不一致的情况，请检查后再导入。\n点击此处导出错误数据。错误数据中对不一致情况在“编码管理”sheet页进行标红\nhover提示：错误数据"
    }
  ]
} as const;

test.describe("验证码表管理-导入异常", () => {
  test("C255 验证码表管理-导入异常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
