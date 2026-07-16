// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L4066,#L4116,#L4157,#L4176,#L4225
// intent: SR-INTENT-2099-01-STD-030
// probe: SR-UI-PROBE-20260523-MF-STANDARD-CHECK-TASK-RESULT-001
// page: _shared/pages/2099-01-lt-dq-main-flow/standard-page.ts
// generated_at: 2026-05-23T20:30:00+08:00
// META: {"id":"STD-030","priority":"P0","title":"落标检查新增任务与结果列表只读 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-CHECK-TASK-CREATE-L4066, SR-2099-01-STD-CHECK-RESULT-L4116, SR-2099-01-STD-CHECK-RESULT-DETAIL-L4157, SR-2099-01-STD-CHECK-LATEST-RATE-L4176, SR-2099-01-STD-CHECK-ENV-PARAM-L4225, SR-2099-01-STD-030, SR-UI-PROBE-20260523-MF-STANDARD-CHECK-TASK-RESULT-001, SR-SELF-RUN-20260523-MF-STANDARD-CHECK-TASK-RESULT-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectStandardCheckResultListShell,
  expectStandardCheckTaskAddShell,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/standard-page";

test.setTimeout(3 * 60 * 1000);

test("【P0】数据标准落标检查新增任务与结果列表只读 Shell 可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 进入落标检查 → 新增检查任务表单 Shell 可见且取消返回", async () => {
    await expectStandardCheckTaskAddShell(page, "SR-2099-01-STD-030");
  });

  await step("步骤2: 切换落标检查结果 → 筛选项、表格列和空态查询合同可见", async () => {
    await expectStandardCheckResultListShell(page, "SR-2099-01-STD-030");
  });
});
