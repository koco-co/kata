// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0460",
  "title": "验证分级分类按开放用户等级控制字段数据预览权限",
  "steps": [
    {
      "action": "1）配置“保密”级别，“开放用户等级”为L2；\n2）【自动分级】中为SparkThrift2.x类型配置“字段名识别”referrer_url，级别为：保密；\n3）【立即生效】；\n4）生效成功后，L1、L2、L3用户分别进入SparkThrift2.x表（包含referrer_url字段）的表详情页-数据预览",
      "expected": "1）L1用户无权限查看到表referrer_url字段数据\n2）L2用户有权限查看到表referrer_url字段数据\n3）L3用户有权限查看到表referrer_url字段数据"
    }
  ]
} as const;

test.describe("验证分级分类按开放用户等级控制字段数据预览权限", () => {
  test("C0460 验证分级分类按开放用户等级控制字段数据预览权限", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
