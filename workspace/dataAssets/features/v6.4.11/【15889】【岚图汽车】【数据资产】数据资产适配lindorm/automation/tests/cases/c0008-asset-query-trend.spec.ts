// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L5053,#L5067,#L5081,#L5099,#L5114,#L5130,#L5147,#L5169,#L5184,#L5199,#L5214,#L5235,#L5252,#L5273,#L5294,#L5310,#L5324,#L5340,#L5358,#L5375,#L5391,#L5405,#L5420,#L5437,#L5454,#L5474,#L5489,#L5505,#L5521,#L5536,#L5552,#L5568,#L5583,#L5599,#L5614,#L5633,#L5650,#L5664,#L5679,#L5694,#L5709,#L5725,#L5742,#L5760,#L5777,#L5794,#L5809,#L5840,#L5871,#L5891,#L5907,#L5923,#L5941,#L5958,#L5973,#L5988,#L6003,#L6023,#L6038,#L6053,#L6068,#L6082,#L6098,#L6112,#L6126,#L6141,#L6156,#L6172,#L6189,#L6205,#L6219,#L6236,#L6251,#L6265,#L6279,#L6296,#L6310,#L6328,#L6345,#L6362,#L6382,#L6398,#L6414,#L6430,#L6445,#L6460,#L6476,#L6493,#L6508,#L6528,#L6545,#L6561,#L6576,#L6593,#L6609,#L6629,#L6644,#L6661,#L6675,#L6692,#L6709
// intent: SR-INTENT-2099-01-SEC-001
// probe: SR-UI-PROBE-20260522-SEC-001
// probe: SR-UI-PROBE-20260523-SECURITY-CONT-001
// generated_at: 2026-05-22T10:29:45Z
// SourceRefs: SR-2099-01-SEC-PERMISSION-ASSIGN-L5053-L5358, SR-2099-01-SEC-PERMISSION-RECYCLE-L5375-L5583, SR-2099-01-SEC-MY-PERMISSION-L5599-L5679, SR-2099-01-SEC-PERMISSION-APPLY-L5694-L5777, SR-2099-01-SEC-MASKING-L5794-L6112, SR-2099-01-SEC-USER-RANK-L6126-L6219, SR-2099-01-SEC-APPROVAL-L6236-L6265, SR-2099-01-SEC-RANK-MANAGE-L6279-L6398, SR-2099-01-SEC-AUTO-RANK-L6414-L6561, SR-2099-01-SEC-MANUAL-RANK-L6576-L6709, SR-UI-PROBE-20260522-SEC-001, SR-UI-PROBE-20260523-SECURITY-CONT-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  expectAutoClassifyRuleShell,
  expectDataClassifyGradeShell,
  expectDataDesensitizationRuleShell,
  expectDataDesensitizationUseShell,
  expectDataPermissionAssignShell,
  expectRankDataShell,
} from "../pages/data-security-page";

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
