// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L6382-L7105
// intent: SR-INTENT-2099-01-PLAT-001
// probe: SR-UI-PROBE-20260523-PLATFORM-CONT-001
// page: _shared/pages/2099-01-lt-dq-main-flow/platform-management-page.ts
// generated_at: 2026-05-23T07:45:00Z
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataSourceAutoImportShell,
  expectDataSourceManageShell,
  expectNotificationRecordShell,
  expectNotificationSettingShell,
  expectRoleManageShell,
  expectUserManageShell,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/platform-management-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
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
