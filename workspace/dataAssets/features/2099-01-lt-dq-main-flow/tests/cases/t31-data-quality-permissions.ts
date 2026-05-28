// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8346,#L8364
// intent: SR-INTENT-2099-01-DQ-PERMISSIONS-L8346-L8364
// probe: SR-UI-PROBE-20260527-DQ-PERMISSIONS-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-27T00:00:00Z
// SourceRefs: SR-2099-01-DQ-PERMISSIONS-L8346, SR-2099-01-DQ-PERMISSIONS-L8364, SR-UI-PROBE-20260527-DQ-PERMISSIONS-001
import { existsSync } from "node:fs";
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityCommonConfigPermissionContract,
  expectDataQualityRuleBasePermissionContract,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

const limitedSessionPath = process.env.UI_AUTOTEST_DQ_LIMITED_SESSION_PATH ?? "";

test("【P0】数据质量权限控制通用配置页面权限控制正确", async ({ browser, page, step }) => {
  test.skip(
    !limitedSessionPath || !existsSync(limitedSessionPath),
    "缺少 dq_limited 会话态：需要 UI_AUTOTEST_DQ_LIMITED_SESSION_PATH 指向有限权限账号 storageState",
  );

  const limitedContext = await browser.newContext({ storageState: limitedSessionPath });
  const limitedPage = await limitedContext.newPage();
  try {
    await step("步骤1: 管理员可见完整数据质量菜单，有限权限账号不可操作通用配置", async () => {
      await expectDataQualityCommonConfigPermissionContract(
        page,
        limitedPage,
        "SR-2099-01-DQ-PERMISSIONS-L8346",
      );
    });
  } finally {
    await limitedContext.close();
  }
});

test("【P0】数据质量权限控制规则库配置页面权限控制正确", async ({ browser, page, step }) => {
  test.skip(
    !limitedSessionPath || !existsSync(limitedSessionPath),
    "缺少 dq_limited 会话态：需要 UI_AUTOTEST_DQ_LIMITED_SESSION_PATH 指向有限权限账号 storageState",
  );

  const limitedContext = await browser.newContext({ storageState: limitedSessionPath });
  const limitedPage = await limitedContext.newPage();
  try {
    await step("步骤1: 管理员可见完整数据质量菜单，有限权限账号不可操作规则库配置", async () => {
      await expectDataQualityRuleBasePermissionContract(
        page,
        limitedPage,
        "SR-2099-01-DQ-PERMISSIONS-L8364",
      );
    });
  } finally {
    await limitedContext.close();
  }
});
