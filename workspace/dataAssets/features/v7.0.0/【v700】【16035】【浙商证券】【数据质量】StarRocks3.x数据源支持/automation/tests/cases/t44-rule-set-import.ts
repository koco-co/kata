// spec: cases/archive.md#case=规则集导入规则包  probe: SR-UI-PROBE-2026-06-DQ-SR3X-ZSZQ
// 规则集导入：新建规则集→基础信息→规则内容(导入「证券基础校验包.xlsx」含完整性+唯一性 2 规则)→调度手动触发→保存。
// zszq_ruleset 含 1 条 security_name 空值 + 1 组 security_code 重复 → 立即执行校验异常。xlsx 运行时生成,导入走 UI。
//
// SKIP-REASON（产品格式约束·已 live 实证 2026-06-26）：向导①②③ + xlsx 生成(exceljs) + 上传(setInputFiles)均已搭好。
// live probe 实测步骤②「导入规则」弹窗：上传控件文案为「上传文件仅支持xls格式」；上传 .xlsx 后无成功提示、
// 「上传文件」按钮保持 disabled（被格式过滤拒绝），故③前「下一步」无法激活。根因 = 本 build 规则包导入仅接受
// .xls(老 BIFF 格式)，而 exceljs 4.4 只能写 .xlsx（node_modules 无 SheetJS/node-xlsx）。
// 完成路径：加 SheetJS(`xlsx` 包) 生成 .xls 替换 _xlsx.ts，再摸通 上传→解析→生成规则包→「下一步」 流程后去掉 skip。
// 脚本保留备后续回归。
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import {
  cleanupRulesByTable,
  expectInstanceStatus,
  getMonitorIdByName,
  pollLatestInstance,
  runRuleNowByApi,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-rule-flow";
import {
  gotoZszqDataAssetsPage,
} from "../../../../../../_shared/pages/2026-06-dq-starrocks3x/starrocks3x-quality-page";
import { locateFormItem, selectAntOption } from "../../../../../../_shared/helpers/index";
import { generateRulesetXlsx } from "./_xlsx";

const TABLE = "zszq_ruleset";

test.setTimeout(300000);

test.describe.skip("@serial StarRocks3.x 规则集导入规则包批量校验", () => {
  test.beforeEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });
  test.afterEach(async ({ page }) => {
    await cleanupRulesByTable(page, TABLE);
  });

  test("【P0】导入规则包(完整性+唯一性)后立即执行校验异常", async ({ page, step }) => {
    const rulesetName = `证券基础校验集_${Date.now()}`;
    const xlsxPath = join(tmpdir(), `证券基础校验包_${Date.now()}.xlsx`);
    await generateRulesetXlsx(xlsxPath);

    await step("新建规则集 ① 基础信息（名称/校验数据源/描述）", async () => {
      await gotoZszqDataAssetsPage(page, "/dq/rule/createRuleGroup");
      await page.waitForTimeout(2000);
      await locateFormItem(page, "规则集名称").locator("input").first().fill(rulesetName);
      await selectAntOption(page, locateFormItem(page, "校验数据源").locator(".ant-select").first(), "STAR_ROCKS_3X");
      await page.waitForTimeout(500);
      await locateFormItem(page, "规则集描述").locator("input, textarea").first().fill("证券基础完整性与唯一性校验").catch(() => {});
      await page.locator("button:visible", { hasText: /^下一步$/ }).first().click();
      await page.waitForTimeout(2000);
    });

    await step("② 规则内容：导入规则包 xlsx（完整性+唯一性 2 规则）", async () => {
      // 「导入规则」开上传弹窗（antd Upload 隐藏 input[type=file]），setInputFiles 直接喂文件
      await page.locator("button:visible", { hasText: "导入规则" }).first().click();
      await page.waitForTimeout(1200);
      await page.locator("input[type='file']").first().setInputFiles(xlsxPath);
      await page.waitForTimeout(2500);
      // 「导入规则」弹窗上传文件后点「确 定」确认（不要误点含「上传」字样的上传触发按钮）。
      // 不再吞错：un-skip（换 .xls）后若按钮缺失/被禁应暴露，而非静默跳过。
      await page
        .locator("[role='dialog']:visible button, .ant-modal:visible button", { hasText: /确\s*定/ })
        .first()
        .click();
      await page.waitForTimeout(2500);
      // 导入成功后「下一步」由 disabled 转可用（规则包解析完成）
      const next = page.locator("button:visible", { hasText: /^下一步$/ }).first();
      await expect(next, "导入规则包成功后下一步应可用").toBeEnabled({ timeout: 15000 });
      await next.click();
      await page.waitForTimeout(2000);
    });

    await step("③ 调度配置 手动触发 → 保存", async () => {
      await selectAntOption(page, locateFormItem(page, "调度周期").locator(".ant-select").first(), "手动触发").catch(() => {});
      await page.waitForTimeout(500);
      await page.locator("button:visible", { hasText: /保\s*存|完\s*成|新\s*建|确\s*定/ }).first().click();
      await expect(page, "保存后应回到规则配置").toHaveURL(/#\/dq\/rule(\?|$)/, { timeout: 20000 });
    });

    let monitorId = "";
    await step("立即执行规则集 → 校验异常（空值 + 重复明细）", async () => {
      monitorId = await getMonitorIdByName(page, rulesetName, TABLE);
      expect(Number(monitorId), "应回查到规则集 monitorId").toBeGreaterThan(0);
      await runRuleNowByApi(page, monitorId);
      expectInstanceStatus(await pollLatestInstance(page, monitorId), "校验异常");
    });
  });
});
