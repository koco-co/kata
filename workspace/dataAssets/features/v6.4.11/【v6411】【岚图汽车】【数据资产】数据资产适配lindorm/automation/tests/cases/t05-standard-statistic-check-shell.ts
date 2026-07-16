// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3284,#L3298,#L3312,#L3326,#L3340,#L3354,#L3368,#L3382,#L3396,#L3410
// intent: SR-INTENT-2099-01-STD-001
// probe: SR-UI-PROBE-20260522-STANDARD-001
// page: _shared/pages/2099-01-lt-dq-main-flow/standard-page.ts
// generated_at: 2026-05-22T03:20:00Z
// META: {"id":"STD-001","priority":"P2/P3","title":"标准统计与落标检查 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-STAT-STATUS-L3284, SR-2099-01-STD-STAT-CODE-ROOT-L3298, SR-2099-01-STD-STAT-HOT-STANDARD-L3312, SR-2099-01-STD-STAT-HOT-CODE-L3326, SR-2099-01-STD-STAT-CATALOG-STANDARD-L3340, SR-2099-01-STD-STAT-CATALOG-CODE-L3354, SR-2099-01-STD-STAT-TREND-STANDARD-L3368, SR-2099-01-STD-STAT-TREND-CODE-L3382, SR-2099-01-STD-STAT-SOURCE-STANDARD-L3396, SR-2099-01-STD-STAT-SOURCE-CODE-L3410, SR-2099-01-STD-001, SR-UI-PROBE-20260522-STANDARD-001, SR-SELF-RUN-STANDARD-001
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataStandardQueryShell,
  expectStandardBasisSearchShell,
  expectStandardCheckShell,
  expectStandardStatisticApis,
  expectStandardStatisticShell,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/standard-page";

test.setTimeout(90000);

test("【P2/P3】数据标准统计模块与落标检查列表 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入标准统计页面 → 统计模块与接口可见", async () => {
    await expectStandardStatisticShell(page, "SR-2099-01-STD-001");
    await expectStandardStatisticApis(page, "SR-2099-01-STD-001");
  });

  await step("步骤2: 进入落标检查页面 → 列表字段与操作入口可见", async () => {
    await expectStandardCheckShell(page, "SR-2099-01-STD-001");
  });
});

// continuation: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L3549,#L4276,#L4457
// intent: SR-INTENT-2099-01-STD-002
// probe: SR-UI-PROBE-20260523-STANDARD-DEF-001
// META: {"id":"STD-002","priority":"P1/P2","title":"数据标准列表查询与标准基础搜索 Shell 可核验"}
// SourceRefs: SR-2099-01-STD-002, SR-UI-PROBE-20260523-STANDARD-DEF-001, SR-SELF-RUN-STANDARD-002
test("【P1/P2】数据标准列表查询与标准基础搜索 Shell 可核验", async ({ page, step }) => {
  await step("步骤1: 进入标准定义页面 → 默认列表、搜索框与空态查询可见", async () => {
    await expectDataStandardQueryShell(page, "SR-2099-01-STD-002");
  });

  await step("步骤2: 进入词根与码表管理页面 → 搜索列表 Shell 与空态查询可见", async () => {
    await expectStandardBasisSearchShell(page, "SR-2099-01-STD-002");
  });
});
