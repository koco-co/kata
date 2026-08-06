// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L6726,#L6743,#L6759,#L6775,#L6789,#L6804,#L6819,#L6835,#L6849,#L6863,#L6885,#L6917,#L6931,#L6947,#L6962,#L6983,#L7002,#L7017,#L7032,#L7051,#L7066,#L7082,#L7097,#L7115,#L7136,#L7151,#L7167,#L7182,#L7196,#L7212,#L7228,#L7243,#L7258,#L7273,#L7288,#L7303,#L7318,#L7332,#L7346,#L7360,#L7374,#L7388,#L7402,#L7416,#L7433
// intent: SR-INTENT-2099-01-PLAT-001
// probe: SR-UI-PROBE-20260523-PLATFORM-CONT-001
// generated_at: 2026-05-23T07:45:00Z
// SourceRefs: SR-2099-01-PLAT-AUTO-IMPORT-L6726-L6789, SR-2099-01-PLAT-DATASOURCE-L6804-L6947, SR-2099-01-PLAT-USER-L6962-L7082, SR-2099-01-PLAT-ROLE-L7097-L7151, SR-2099-01-PLAT-NOTIFICATION-L7167-L7433, SR-UI-PROBE-20260523-PLATFORM-CONT-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  expectDataSourceAutoImportShell,
  expectDataSourceManageShell,
  expectNotificationRecordShell,
  expectNotificationSettingShell,
  expectRoleManageShell,
  expectUserManageShell,
} from "../pages/platform-management-page";

test.setTimeout(3 * 60 * 1000);

// SourceRef: SR-UI-PROBE-20260523-PLATFORM-CONT-001
test("【P2】平台管理-数据源管理列表 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据源管理 → 数据源列表合同可见", async () => {
    await expectDataSourceManageShell(page, "SR-UI-PROBE-20260523-PLATFORM-CONT-001");
  });
});

// SourceRef: SR-UI-PROBE-20260523-PLATFORM-CONT-001
test("【P2】平台管理-数据源自动引入设置 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 切换数据源自动引入设置 → 子模块和开关列可见", async () => {
    await expectDataSourceAutoImportShell(page, "SR-UI-PROBE-20260523-PLATFORM-CONT-001");
  });
});

// SourceRef: SR-UI-PROBE-20260523-PLATFORM-CONT-001
test("【P2】平台管理-用户管理成员列表 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入用户管理 → 用户/用户组入口和成员列表合同可见", async () => {
    await expectUserManageShell(page, "SR-UI-PROBE-20260523-PLATFORM-CONT-001");
  });
});

// SourceRef: SR-UI-PROBE-20260523-PLATFORM-CONT-001
test("【P2】平台管理-角色管理权限点矩阵 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入角色管理 → 权限点矩阵合同可见", async () => {
    await expectRoleManageShell(page, "SR-UI-PROBE-20260523-PLATFORM-CONT-001");
  });
});

// SourceRef: SR-UI-PROBE-20260523-PLATFORM-CONT-001
test("【P2】平台管理-通知设置列表 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入通知中心 → 通知设置列表合同可见", async () => {
    await expectNotificationSettingShell(page, "SR-UI-PROBE-20260523-PLATFORM-CONT-001");
  });
});

// SourceRef: SR-UI-PROBE-20260523-PLATFORM-CONT-001
test("【P2】平台管理-通知记录列表 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 切换通知记录 → 消息记录列表合同可见", async () => {
    await expectNotificationRecordShell(page, "SR-UI-PROBE-20260523-PLATFORM-CONT-001");
  });
});
