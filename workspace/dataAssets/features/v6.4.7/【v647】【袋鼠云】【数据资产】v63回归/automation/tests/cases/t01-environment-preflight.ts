// spec: features/assets-v63-regression/archive.md#case=t01-environment-preflight
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t01","priority":"P0","title":"校验 ci63 登录态、质量项目与数据资产基座可用"}
// SourceRefs: SR-INTENT-001, SR-ENV-PREFLIGHT-001, SR-UI-PROBE-001, SR-SELF-RUN-001
import { expect, test } from "../../../../../../_shared/fixtures/step-screenshot";
import { SOURCE_REFS, V63_REGRESSION_SCOPE } from "../fixtures/v63-regression-contract";
import {
  expectDataQualityShell,
  fetchQualityProjects,
  gotoDataQualityPage,
} from "../../../../../../_shared/pages/assets-v63-regression/v63-regression-page";

test.setTimeout(90000);

test("【P0】ci63 登录态和 pw_test 质量项目可用于 v6.3 回归", async ({ page, step }) => {
  await step("步骤1: 进入数据质量规则任务配置页 → 项目上下文和菜单正常展示", async () => {
    await gotoDataQualityPage(page, "/dq/rule");
    await expectDataQualityShell(page, SOURCE_REFS.preflight);
    await expect(page.locator("body"), `${SOURCE_REFS.probeProject}: 数据源类型应可见`).toContainText(
      V63_REGRESSION_SCOPE.datasourceText,
    );
    await expect(page.locator("body"), `${SOURCE_REFS.probeProject}: 数据源名称应可见`).toContainText(
      V63_REGRESSION_SCOPE.datasourceName,
    );
  });

  await step("步骤2: 调用项目列表接口 → 返回 pw_test 质量项目", async () => {
    const projects = await fetchQualityProjects(page);
    expect(
      projects.some((project) => project.projectName === V63_REGRESSION_SCOPE.qualityProjectName),
      `${SOURCE_REFS.preflight}: getProjects 应包含 ${V63_REGRESSION_SCOPE.qualityProjectName}`,
    ).toBe(true);
  });
});
