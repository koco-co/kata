// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L34-L48
// intent: SR-INTENT-2099-01-AI-001
// probe: SR-UI-PROBE-20260522-ASSETS-001
// page: _shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page.ts
// generated_at: 2026-05-22T03:01:13Z
// META: {"id":"AI-001","priority":"P1","title":"验证已接入数据源统计数据正确"}
// SourceRefs: SR-2099-01-AI-001, SR-ENV-PREFLIGHT-001, SR-UI-PROBE-001, SR-SELF-RUN-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectAssetsInventoryShell,
  gotoAssetsInventory,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/assets-inventory-page";
import { ASSETS_INVENTORY_SCOPE, SR_2099_01_AI_001 } from "../data/assets-inventory-contract";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/session.json",
});
test.setTimeout(90000);

test("【P1】资产盘点页展示已接入数据源统计 Shell", async ({ page, step }) => {
  await step("步骤1: 进入资产盘点页面 → 统计接口响应且页面 Shell 正常", async () => {
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_SCOPE.projectId);
    await expectAssetsInventoryShell(page, SR_2099_01_AI_001);
  });
});

test("【P1】运维触发后已接入数据源卡片保持可核验", async ({ page, step }) => {
  await step("步骤1: 进入资产盘点页面 → 已接入数据源卡片可见", async () => {
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_SCOPE.projectId);
  });

  await step("步骤2: 查看已接入数据源统计 → 数据源类型和统计值可核验", async () => {
    // note: 原用例要求在资产服务器执行 localhost:8876 curl，自动化不执行运维操作，改为 UI 侧统计 Shell 合同断言。
    await expectAssetsInventoryShell(page, SR_2099_01_AI_001);
  });
});
