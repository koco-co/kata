// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L16,#L32-L48
// intent: SR-INTENT-2099-01-AI-001
// probe: SR-UI-PROBE-20260523-ASSETS-GUIDE-001
// generated_at: 2026-05-22T03:01:13Z
// META: {"id":"AI-001","priority":"P1/P3","title":"资产盘点引导弹窗与已接入数据源统计"}
// SourceRefs: SR-2099-01-AI-GUIDE-L16, SR-2099-01-AI-001, SR-ENV-PREFLIGHT-001, SR-UI-PROBE-20260523-ASSETS-GUIDE-001, SR-SELF-RUN-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  expectAssetsInventoryGuideDialogFlow,
  expectAssetsInventoryShell,
  gotoAssetsInventory,
  triggerAssetsInventoryScheduleJob,
} from "../pages/assets-inventory-page";
import {
  ASSETS_INVENTORY_SCOPE,
  SR_2099_01_AI_001,
  SR_2099_01_AI_GUIDE_L16,
} from "../fixtures/assets-inventory-contract";

test.setTimeout(15 * 60 * 1000);

test("【P3】资产盘点首次进入功能引导弹窗可关闭且不再提示", async ({ page, step }) => {
  await step("步骤1-3: 首次进入资产平台 → 弹窗展示，勾选不再提示并确认后再次进入不再弹窗", async () => {
    await expectAssetsInventoryGuideDialogFlow(page, SR_2099_01_AI_GUIDE_L16, ASSETS_INVENTORY_SCOPE.projectId);
  });
});

test("【P1】资产盘点页展示已接入数据源统计 Shell", async ({ page, step }) => {
  await step("步骤1: 进入资产盘点页面 → 统计接口响应且页面 Shell 正常", async () => {
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_SCOPE.projectId);
    await expectAssetsInventoryShell(page, SR_2099_01_AI_001);
  });
});

test("【P1】运维触发后已接入数据源卡片保持可核验", async ({ page, step }) => {
  test.setTimeout(15 * 60 * 1000);

  await step("步骤1: 调用 saveOneDayDataDistribution 调度接口 → 接口调用成功", async () => {
    await triggerAssetsInventoryScheduleJob(page, "saveOneDayDataDistribution", SR_2099_01_AI_001);
  });

  await step("步骤2: 进入资产盘点页面 → 已接入数据源卡片可见", async () => {
    await gotoAssetsInventory(page, undefined, ASSETS_INVENTORY_SCOPE.projectId);
  });

  await step("步骤3: 查看已接入数据源统计 → 数据源类型和统计值可核验", async () => {
    await expectAssetsInventoryShell(page, SR_2099_01_AI_001);
  });
});
