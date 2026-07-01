// spec: cases/archive.md#case=数据源经引入与质量项目授权后数据质量可选用  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// A24：StarRocks 3.x 数据源经应用授权→引入→质量项目授权（前置已完成）后，在数据质量「新建单表校验规则」
// 向导可正确选到 pw_sr3（STAR_ROCKS_3X）数据源并加载其数据表。授权链路前 3 步为前置条件，用例验证步骤 4。
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import { gotoZszqDataAssetsPage, selectStarRocksDatasource } from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page";
import { locateFormItem, selectAntOption } from "../../../../../../_shared/helpers/index";

const TABLE = "zszq_trade_orders";

test.describe("@serial 【P0】验证 StarRocks 3.x 数据源经引入与质量项目授权后数据质量可选用", () => {
  test("【P0】授权后 pw_sr3（STAR_ROCKS_3X）在单表校验规则向导可选并加载数据表", async ({ page, step }) => {
    test.setTimeout(120000);

    await step("进入【数据质量】-【规则配置】-新建单表校验规则", async () => {
      await gotoZszqDataAssetsPage(page, "/dq/rule/add");
      await page.waitForTimeout(2000);
      await expect(
        locateFormItem(page, "规则名称").locator("input").first(),
        "应进入单表校验规则向导①监控对象",
      ).toBeVisible({ timeout: 20000 });
      await locateFormItem(page, "规则名称").locator("input").first().fill(`授权可选用_${Date.now()}`);
    });

    await step("展开「选择数据源」下拉 → 关键字搜到并选中 pw_sr3（STAR_ROCKS_3X）", async () => {
      // selectStarRocksDatasource 内部输入关键字过滤后选中，并断言回显
      await selectStarRocksDatasource(page, "pw_sr3（STAR_ROCKS_3X）");
    });

    await step("选择数据表 → 下拉加载 StarRocks 表并可选到本需求数据表", async () => {
      const tableForm = page
        .locator(".ant-form-item:visible")
        .filter({ has: page.locator("label", { hasText: "选择数据表" }) })
        .last();
      await selectAntOption(page, tableForm.locator(".ant-select").first(), TABLE);
      await expect(tableForm, `选择数据表应加载并回显 ${TABLE}`).toContainText(TABLE, { timeout: 15000 });
    });
  });
});
