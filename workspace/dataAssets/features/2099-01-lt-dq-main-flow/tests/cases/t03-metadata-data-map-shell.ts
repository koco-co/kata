// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L161-L201
// intent: SR-INTENT-2099-01-MD-001
// probe: SR-UI-PROBE-20260522-METADATA-001
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-search-page.ts
// generated_at: 2026-05-22T03:12:41Z
// META: {"id":"MD-001","priority":"P3/P2","title":"数据地图首页和搜索类型下拉可核验"}
// SourceRefs: SR-2099-01-MD-001, SR-UI-PROBE-20260522-METADATA-001, SR-SELF-RUN-METADATA-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataMapLandingContract,
  expectDataMapSearchTypeOptions,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-search-page";
import { SR_2099_01_MD_001 } from "../data/metadata-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(90000);

test("【P3/P2】元数据数据地图首页与搜索类型下拉可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据地图首页 → 首页核心模块可见", async () => {
    await expectDataMapLandingContract(page, SR_2099_01_MD_001);
  });

  await step("步骤2: 展开搜索类型下拉 → 资产类型选项与真实 UI 一致", async () => {
    await expectDataMapSearchTypeOptions(page, SR_2099_01_MD_001);
  });
});
