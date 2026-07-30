// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3424,#L3460,#L3492
// scope: read-only shell subset; delete and 100-child limit remain held out
// intent: SR-INTENT-2099-01-STD-035
// probe: SR-UI-PROBE-20260524-MF-STANDARD-DIRECTORY-CRUD-002
// page: _shared/pages/2099-01-lt-dq-main-flow/standard-page.ts
// META: {"id":"STD-035","priority":"P1/P2/P3","title":"标准目录创建、编辑与六层限制 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-035, SR-UI-PROBE-20260524-MF-STANDARD-DIRECTORY-CRUD-002
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { expectStandardDirectoryCreateEditSixLevelShell } from "../pages/standard-page";

test.setTimeout(120000);

test("【P1/P2/P3】标准目录创建、编辑与六层限制 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入标准定义 → 标准目录创建、重名校验和目录编辑可见", async () => {
    await expectStandardDirectoryCreateEditSixLevelShell(page, "SR-2099-01-STD-035");
  });
});
