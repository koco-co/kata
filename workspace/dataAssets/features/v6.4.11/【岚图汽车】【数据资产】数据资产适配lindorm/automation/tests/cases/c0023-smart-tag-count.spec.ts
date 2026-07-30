// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L7924
// intent: SR-INTENT-2099-01-DQ-RULE-TASK-TIMEOUT-001
// page: _shared/pages/2099-01-lt-dq-main-flow/data-quality-page.ts
// SourceRefs: SR-2099-01-DQ-RULE-TASK-TIMEOUT-HANDLING-L7924, SR-UI-PROBE-20260527-DQ-RULE-TASK-TIMEOUT-HANDLING-L7924-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { expectDataQualityRuleTaskTimeoutHandlingContract } from "../pages/data-quality/rule-tasks";
import { ensureDtstackPreconditionFile } from "../fixtures/dtstack-preconditions";

test.setTimeout(15 * 60 * 1000);

const DQ_CORE_PRECOND_FILE =
  "workspace/dataAssets/features/2099-01-lt-dq-main-flow/tests/fixtures/precond/data-quality-core-tables.yaml";

test.describe("数据质量规则任务超时处理", () => {
test.beforeEach(() => {
  ensureDtstackPreconditionFile(
    "dq-core-rule-task-tables",
    DQ_CORE_PRECOND_FILE,
    "SR-2099-01-DQ-RULE-TASK-PRECOND",
  );
});

test("【P2】数据质量规则任务管理运行时长大于超时时间时任务超时处理正确", async ({
  page,
  step,
}) => {
  await step("步骤1-2: 编辑车辆质量立即生成任务 → 配置短超时时间 → 执行后核验结果或日志包含超时原因", async () => {
    await expectDataQualityRuleTaskTimeoutHandlingContract(
      page,
      "SR-2099-01-DQ-RULE-TASK-TIMEOUT-HANDLING-L7924",
    );
  });
});
});
