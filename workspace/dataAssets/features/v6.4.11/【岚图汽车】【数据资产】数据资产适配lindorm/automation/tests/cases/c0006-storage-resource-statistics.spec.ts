// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L4584-L4708
// intent: SR-INTENT-2099-01-DM-001
// probe: SR-UI-PROBE-20260522-MODEL-001
// page: _shared/pages/2099-01-lt-dq-main-flow/model-page.ts
// generated_at: 2026-05-22T03:30:00Z
// META: {"id":"DM-001","priority":"P1/P2/P3","title":"数据模型规范建表列表 Shell 可核验"}
// SourceRefs: SR-2099-01-DM-001, SR-UI-PROBE-20260522-MODEL-001, SR-SELF-RUN-MODEL-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  expectModelApiHealth,
  expectModelBuildTableShell,
} from "../../../../../../_shared/automation/pages/data-model/model-page";

test.setTimeout(90000);

test("【P1/P2/P3】数据模型规范建表列表 Shell 与接口可核验", async ({ page, step }) => {
  await step("步骤1: 进入数据模型规范建表列表 → 列表字段和操作入口可见", async () => {
    await expectModelBuildTableShell(page, "SR-2099-01-DM-001");
  });

  await step("步骤2: 校验规范建表核心接口 → 数据源/表类型/列表接口均已请求", async () => {
    await expectModelApiHealth(page, "SR-2099-01-DM-001");
  });
});
