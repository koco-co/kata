// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L498,#L517,#L533,#L553,#L569,#L584,#L598,#L615
// intent: SR-INTENT-2099-01-MD-026
// probe: results/20260524-mf-metadata-hot-query-02/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-search-page.ts
// generated_at: 2026-05-24T18:20:00+08:00
// META: {"id":"MD-026","priority":"P3/P1","title":"数据地图热门标签/热门查询与首页关键词搜索 Shell 可核验"}
// status: ready_for_serial_orchestrator_registration
// SourceRefs: SR-2099-01-MD-026-L498, SR-2099-01-MD-TABLE-TAG-L517, SR-2099-01-MD-FIELD-TAG-L533, SR-2099-01-MD-VIEW-TAG-L553, SR-2099-01-MD-HOT-QUERY-SHELL-L569, SR-2099-01-MD-HOT-QUERY-SIZE-L584, SR-2099-01-MD-HOT-QUERY-COUNT-L598, SR-2099-01-MD-HOT-QUERY-JUMP-L615, SR-UI-PROBE-20260524-MF-METADATA-HOT-QUERY-002, SR-SELF-RUN-20260524-MF-METADATA-HOT-QUERY-002
import { test } from "../../../../_shared/fixtures/step-screenshot";
import {
  expectDataMapHotQueryHistoryShell,
  expectDataMapHotSectionsAndKeywordSearchShell,
  expectDataMapHotTagsNavigationShell,
} from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-search-page";

test.use({
  storageState:
    process.env.UI_AUTOTEST_SESSION_PATH ??
    "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc-local.json",
});
test.setTimeout(90000);

test("【P3/P1】元数据数据地图热门区与首页关键词搜索 Shell 可核验", async ({
  page,
  step,
}) => {
  await step("步骤1: 进入数据地图首页 → 热门标签与热门查询模块可见", async () => {
    await expectDataMapHotSectionsAndKeywordSearchShell(
      page,
      "qa_auto_metadata_hot_query",
      "SR-2099-01-MD-026-L498",
    );
  });
});

test("【P1/P2】元数据数据地图热门标签表字段视图跳转入口可核验", async ({ page, step }) => {
  await step("步骤1-3: 热门标签区展示标签类型，存在测试标签时点击后带条件进入数据地图结果区", async () => {
    await expectDataMapHotTagsNavigationShell(
      page,
      "SR-2099-01-MD-TABLE-TAG-L517, SR-2099-01-MD-FIELD-TAG-L533, SR-2099-01-MD-VIEW-TAG-L553",
    );
  });
});

test("【P3/P1】元数据数据地图热门查询次数、大小与点击跳转入口可核验", async ({ page, step }) => {
  await step("步骤1-4: 产生 test1/test2/test3 查询记录，核验热门查询展示、hover 次数信息与点击跳转", async () => {
    await expectDataMapHotQueryHistoryShell(
      page,
      "SR-2099-01-MD-HOT-QUERY-SHELL-L569, SR-2099-01-MD-HOT-QUERY-SIZE-L584, SR-2099-01-MD-HOT-QUERY-COUNT-L598, SR-2099-01-MD-HOT-QUERY-JUMP-L615",
    );
  });
});
