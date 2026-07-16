// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3476,#L3506
// intent: SR-INTENT-2099-01-STD-040
// probe: SR-UI-PROBE-20260524-MF-STANDARD-DIRECTORY-CRUD-002
// page: _shared/pages/2099-01-lt-dq-main-flow/standard-page.ts
// generated_at: 2026-05-27T00:00:00+08:00
// META: {"id":"STD-040","priority":"P3","title":"标准目录删除与子目录数量限制 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-DIR-DELETE-L3476, SR-2099-01-STD-DIR-CHILD-LIMIT-L3506, SR-2099-01-STD-040, SR-UI-PROBE-20260524-MF-STANDARD-DIRECTORY-CRUD-002
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectStandardDirectoryDeleteAndLimitShell } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/standard-page";

test.setTimeout(120000);

test("【P3】标准目录删除与子目录数量限制入口可核验", async ({ page, step }) => {
  await step("步骤1: 进入标准定义 → 标准目录树、删除入口和子目录数量限制操作区可见", async () => {
    await expectStandardDirectoryDeleteAndLimitShell(
      page,
      "SR-2099-01-STD-DIR-DELETE-L3476, SR-2099-01-STD-DIR-CHILD-LIMIT-L3506",
    );
  });
});
