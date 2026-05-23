// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L4709-L6381
// intent: SR-INTENT-2099-01-SEC-001
// probe: SR-UI-PROBE-20260522-SEC-001
// probe: SR-UI-PROBE-20260523-SECURITY-CONT-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-security-page.ts
// generated_at: 2026-05-22T10:29:45Z
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectAutoClassifyRuleShell,
  expectDataClassifyGradeShell,
  expectDataDesensitizationRuleShell,
  expectDataDesensitizationUseShell,
  expectDataPermissionAssignShell,
  expectRankDataShell,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-security-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

const SECURITY_CONT_SOURCE_REF = "SR-UI-PROBE-20260523-SECURITY-CONT-001";

test("【P1】数据安全-数据权限管理权限分配 Shell 可核验", async ({ page, step }) => {
  await step("进入数据权限管理 → 权限分配/回收列表合同可见", async () => {
    await expectDataPermissionAssignShell(page, SECURITY_CONT_SOURCE_REF);
  });
});

test("【P1】数据安全-数据脱敏管理脱敏规则 Shell 可核验", async ({ page, step }) => {
  await step("进入数据脱敏管理 → 脱敏规则列表合同可见", async () => {
    await expectDataDesensitizationRuleShell(page, SECURITY_CONT_SOURCE_REF);
  });
});

test("【P1】数据安全-数据脱敏管理脱敏应用 Shell 可核验", async ({ page, step }) => {
  await step("进入脱敏应用 → 脱敏表列表合同可见", async () => {
    await expectDataDesensitizationUseShell(page, SECURITY_CONT_SOURCE_REF);
  });
});

test("【P1】数据安全-数据分级分类级别管理 Shell 可核验", async ({ page, step }) => {
  await step("进入级别管理 → 内置级别和开放用户等级列可见", async () => {
    await expectDataClassifyGradeShell(page, SECURITY_CONT_SOURCE_REF);
  });
});

test("【P1】数据安全-数据分级分类自动分级 Shell 可核验", async ({ page, step }) => {
  await step("进入自动分级 → 分类树和规则列表合同可见", async () => {
    await expectAutoClassifyRuleShell(page, SECURITY_CONT_SOURCE_REF);
  });
});

test("【P1】数据安全-数据分级分类分级数据 Shell 可核验", async ({ page, step }) => {
  await step("进入分级数据 → 数据级别筛选和字段列表合同可见", async () => {
    await expectRankDataShell(page, SECURITY_CONT_SOURCE_REF);
  });
});
