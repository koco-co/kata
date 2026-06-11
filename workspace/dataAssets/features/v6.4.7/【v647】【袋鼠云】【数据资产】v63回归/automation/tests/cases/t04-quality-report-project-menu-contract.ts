// spec: features/assets-v63-regression/archive.md#case=t04-quality-report-project-menu-contract
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t04","priority":"P0","title":"质量报告和项目管理相关菜单可访问"}
// SourceRefs: SR-INTENT-001, SR-UI-PROBE-003, SR-SELF-RUN-001
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { SOURCE_REFS, V63_REGRESSION_SCOPE } from "../data/v63-regression-contract";
import {
  clickDataQualityMenu,
  expectDataQualityShell,
  expectTexts,
  gotoDataQualityPage,
} from "../../../../_shared/pages/assets-v63-regression/v63-regression-page";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ci63.json" });
test.setTimeout(90000);

test("【P0】质量报告、项目信息和脏数据管理入口可访问", async ({ page, step }) => {
  await step("步骤1: 从规则任务配置进入质量报告 → 报告列表表头可见", async () => {
    await gotoDataQualityPage(page, "/dq/rule");
    await clickDataQualityMenu(page, "质量报告");
    await expect(page, SOURCE_REFS.probeMenu).toHaveURL(/#\/dq\/qualityReport/);
    await expectDataQualityShell(page, SOURCE_REFS.probeMenu);
    await expectTexts(page, V63_REGRESSION_SCOPE.qualityReportHeaders, SOURCE_REFS.probeMenu);
  });

  await step("步骤2: 进入项目信息和脏数据管理 → 菜单路由可切换", async () => {
    await clickDataQualityMenu(page, "项目信息");
    await expect(page, SOURCE_REFS.probeMenu).toHaveURL(/#\/dq\/project\/projectList/);
    await expectDataQualityShell(page, SOURCE_REFS.probeMenu);

    await clickDataQualityMenu(page, "脏数据管理");
    await expect(page, SOURCE_REFS.probeMenu).toHaveURL(/#\/dq\/project\/dirtyDataManage/);
    await expectDataQualityShell(page, SOURCE_REFS.probeMenu);
  });
});
