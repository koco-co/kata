// spec: features/2099-01-lt-dq-main-flow/岚图主流程用例整理.md#L4583-L4597
// intent: SR-INTENT-2099-01-DM-002
// probe: SR-UI-PROBE-20260522-MODEL-WIZARD-001
// page: _shared/pages/2099-01-lt-dq-main-flow/model-page.ts
// generated_at: 2026-05-22T13:36:56Z
// META: {"id":"DM-002","priority":"P1","title":"数据模型建表表类型与 HDFS 路径交互可核验"}
// SourceRefs: SR-2099-01-DM-002, SR-UI-PROBE-20260522-MODEL-WIZARD-001
import { test } from "../../../../../../_shared/automation/fixtures/step-screenshot";
import { expectModelBuildTableTypeHdfsInteraction } from "../../../../../../_shared/automation/pages/data-model/model-page";
import { MODEL_BUILD_TABLE_TYPE_SCOPE, SR_2099_01_DM_002 } from "../fixtures/model-contract";

test.setTimeout(120000);

test("【P1】数据模型建表表类型与 hdfs 存储路径交互可核验", async ({ page, step }) => {
  test.info().annotations.push({
    type: "scope",
    description: `${MODEL_BUILD_TABLE_TYPE_SCOPE.title}: non-submit interaction coverage for ${MODEL_BUILD_TABLE_TYPE_SCOPE.datasourceLabel}`,
  });

  await step("步骤1: 进入新建表页面并选择 HADOOP 数据源 → 表类型和 hdfs 存储路径展示", async () => {
    await expectModelBuildTableTypeHdfsInteraction(page, SR_2099_01_DM_002);
  });
});
