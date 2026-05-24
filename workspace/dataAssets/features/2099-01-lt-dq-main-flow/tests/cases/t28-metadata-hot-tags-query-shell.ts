// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L498-L615
// intent: SR-INTENT-2099-01-MD-026
// probe: results/20260524-mf-metadata-hot-query-02/playwright/ui-probe/probe.json
// page: _shared/pages/2099-01-lt-dq-main-flow/metadata-search-page.ts
// generated_at: 2026-05-24T18:20:00+08:00
// META: {"id":"MD-026","priority":"P3/P1","title":"数据地图热门标签/热门查询与首页关键词搜索 Shell 可核验"}
// status: ready_for_serial_orchestrator_registration
// SourceRefs: SR-2099-01-MD-026, SR-UI-PROBE-20260524-MF-METADATA-HOT-QUERY-002, SR-SELF-RUN-20260524-MF-METADATA-HOT-QUERY-002
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { expectDataMapHotSectionsAndKeywordSearchShell } from "../../../../_shared/pages/2099-01-lt-dq-main-flow/metadata-search-page";

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
      "SR-2099-01-MD-026",
    );
  });
});
