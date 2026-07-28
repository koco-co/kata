// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L8346,#L8364
// intent: SR-INTENT-2099-01-DQ-PERMISSIONS-L8346-L8364
// probe: SR-UI-PROBE-20260527-DQ-PERMISSIONS-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-27T00:00:00Z
// SourceRefs: SR-2099-01-DQ-PERMISSIONS-L8346, SR-2099-01-DQ-PERMISSIONS-L8364, SR-UI-PROBE-20260527-DQ-PERMISSIONS-001
import { test } from "../../../../../../_shared/fixtures/step-screenshot";
import type { BrowserContextOptions } from "@playwright/test";
import {
  expectDataQualityCommonConfigPermissionContract,
  expectDataQualityRuleBasePermissionContract,
} from "../../../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";
import {
  getEnvConfig,
  loadNamedDataAssetsAuthState,
} from "../../../../../../_shared/runtime/env-profile";

test.setTimeout(3 * 60 * 1000);

const limitedEnvName = process.env.KATA_DATAASSETS_DQ_LIMITED_ENV ?? "";

function limitedAccountState(): BrowserContextOptions["storageState"] {
  const primary = getEnvConfig();
  return loadNamedDataAssetsAuthState(limitedEnvName, {
    baseUrl: primary.urls.baseUrl,
    tenantName: primary.auth.tenantName,
  }) as unknown as BrowserContextOptions["storageState"];
}

test("【P0】数据质量权限控制通用配置页面权限控制正确", async ({ browser, page, step }) => {
  test.skip(
    !limitedEnvName,
    "缺少 dq_limited 环境：请创建 config/env/<name>.yaml，并在本次进程设置 KATA_DATAASSETS_DQ_LIMITED_ENV=<name>",
  );

  const limitedContext = await browser.newContext({ storageState: limitedAccountState() });
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
    !limitedEnvName,
    "缺少 dq_limited 环境：请创建 config/env/<name>.yaml，并在本次进程设置 KATA_DATAASSETS_DQ_LIMITED_ENV=<name>",
  );

  const limitedContext = await browser.newContext({ storageState: limitedAccountState() });
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
