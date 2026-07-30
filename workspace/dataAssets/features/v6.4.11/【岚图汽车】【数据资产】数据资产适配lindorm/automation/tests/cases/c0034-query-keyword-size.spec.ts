// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L4015,#L4031,#L4191
// scope: read-only shell subset; ranking correctness, submit, and binding result remain held out
// intent: SR-INTENT-2099-01-STD-034
// probe: SR-UI-PROBE-20260524-MF-STANDARD-MAPPING-BOUNDARIES-001
// page: _shared/pages/2099-01-lt-dq-main-flow/standard-page.ts
// generated_at: 2026-05-24T21:40:00+08:00
// META: {"id":"STD-034","priority":"P1/P2","title":"标准映射映射记录与字段绑定边界 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-MAPPING-SCORE-L4015, SR-2099-01-STD-MAPPING-TABLE-L4031, SR-2099-01-STD-MAPPING-TARGET-TABLE-L4191, SR-2099-01-STD-034, SR-UI-PROBE-20260524-MF-STANDARD-MAPPING-BOUNDARIES-001, SR-SELF-RUN-20260524-MF-STANDARD-MAPPING-BOUNDARIES-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { expectStandardMappingBoundaryDialogsShell } from "../pages/standard-page";

test.setTimeout(120000);

test("【P1/P2】标准映射映射记录与字段绑定边界 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入标准映射 → 首行映射记录抽屉与字段绑定弹窗只读可见", async () => {
    await expectStandardMappingBoundaryDialogsShell(page, "SR-2099-01-STD-034");
  });
});
