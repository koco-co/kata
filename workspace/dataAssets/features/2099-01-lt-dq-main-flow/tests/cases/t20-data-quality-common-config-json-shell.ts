// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7306-L7419
// intent: SR-INTENT-2099-01-DQ-COMMON-CONFIG-JSON-001
// probe: results/20260523-1810-mf-quality-common-config-json-01/playwright/probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// generated_at: 2026-05-23T10:26:00Z
// META: {"id":"DQ-020","priority":"P0","title":"通用配置 json格式校验管理列表与导入导出新增弹窗壳可核验"}
// SourceRefs: SR-2099-01-DQ-COMMON-CONFIG-JSON-001, SR-UI-PROBE-20260523-DQ-COMMON-CONFIG-JSON-001, SR-SELF-RUN-20260523-DQ-COMMON-CONFIG-JSON-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataQualityCommonConfigJsonAddRegexShell,
  expectDataQualityCommonConfigJsonExportConfirmShell,
  expectDataQualityCommonConfigJsonImportModalShell,
  expectDataQualityCommonConfigJsonShell,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/data-quality-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(3 * 60 * 1000);

test("【P0】数据质量通用配置-json格式校验管理列表与弹窗壳可核验", async ({ page, step }) => {
  await step("步骤1: 进入通用配置 json格式校验管理 → 列表字段、操作入口和核心接口可见", async () => {
    await expectDataQualityCommonConfigJsonShell(page, "SR-2099-01-DQ-COMMON-CONFIG-JSON-001");
  });

  await step("步骤2: 点击导入 → 导入弹窗、重复处理规则和上传控件可见且不上传文件", async () => {
    await expectDataQualityCommonConfigJsonImportModalShell(page, "SR-2099-01-DQ-COMMON-CONFIG-JSON-001");
  });

  await step("步骤3: 点击导出 → 仅验证导出确认弹窗文案并取消，不确认下载", async () => {
    await expectDataQualityCommonConfigJsonExportConfirmShell(page, "SR-2099-01-DQ-COMMON-CONFIG-JSON-001");
  });

  await step("步骤4: 点击新增 → 新增字段、默认数据源和正则测试控件可见，不点击确定保存", async () => {
    await expectDataQualityCommonConfigJsonAddRegexShell(page, "SR-2099-01-DQ-COMMON-CONFIG-JSON-001");
  });
});
