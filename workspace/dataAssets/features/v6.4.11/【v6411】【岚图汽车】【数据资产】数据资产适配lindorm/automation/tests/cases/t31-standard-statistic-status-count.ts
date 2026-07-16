// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3284-L3296
// intent: SR-INTENT-2099-01-STD-031
// probe: SR-UI-PROBE-20260524-MF-STANDARD-STATUS-COUNT-003
// page: _shared/pages/2099-01-lt-dq-main-flow/standard-page.ts
// generated_at: 2026-05-24T20:05:00+08:00
// META: {"id":"STD-031","priority":"P2","title":"标准统计数据标准上线状态数量可核验"}
// SourceRefs: SR-2099-01-STD-031, SR-UI-PROBE-20260524-MF-STANDARD-STATUS-COUNT-003, SR-SELF-RUN-20260524-MF-STANDARD-STATUS-COUNT-003
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectStandardStatisticStatusCountContract } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/standard-page";

test.setTimeout(90000);

test("【P2】标准统计数据标准上线状态数量可核验", async ({ page, step }) => {
  await step("步骤1: 进入标准统计页 → 已上线/待上线数量与 standardCount 接口一致", async () => {
    await expectStandardStatisticStatusCountContract(page, "SR-2099-01-STD-031");
  });
});
