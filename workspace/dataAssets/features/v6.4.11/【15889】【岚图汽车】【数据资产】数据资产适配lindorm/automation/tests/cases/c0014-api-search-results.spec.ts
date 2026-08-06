// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3442-L3458,#L3958-L3996,#L4191-L4204
// intent: SR-INTENT-2099-01-STD-014
// probe: SR-UI-PROBE-20260523-MF-STANDARD-DIR-MAP-001
// generated_at: 2026-05-23T16:20:00+08:00
// META: {"id":"STD-014","priority":"P1/P2/P3","title":"标准目录与标准映射只读 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-014, SR-UI-PROBE-20260523-MF-STANDARD-DIR-MAP-001, SR-SELF-RUN-20260523-MF-STANDARD-DIR-MAP-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import {
  expectStandardDirectoryShell,
  expectStandardMappingShell,
} from "../pages/standard-page";

test.setTimeout(90000);

test("【P1/P2/P3】标准目录与标准映射只读 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入标准定义页面 → 标准目录、列表字段与只读入口可见", async () => {
    await expectStandardDirectoryShell(page, "SR-2099-01-STD-014");
  });

  await step("步骤2: 进入标准映射页面 → 映射列表字段、入口与搜索契约可见", async () => {
    await expectStandardMappingShell(page, "SR-2099-01-STD-014");
  });
});
