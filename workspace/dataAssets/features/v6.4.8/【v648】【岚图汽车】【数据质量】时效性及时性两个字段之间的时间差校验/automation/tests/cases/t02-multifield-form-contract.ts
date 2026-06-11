// spec: features/timeliness-monitor/archive.md#case=t02-multifield-form-contract
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t2","priority":"P1","title":"验证及时性校验-多字段时间差校验配置区域字段完整"}
import { test } from "../../../../_shared/fixtures/step-screenshot";
import { uniqueName } from "../../../../_shared/helpers/test-setup";
import { SUITE_NAME } from "../data/timeliness-multi-field-data";
import {
  expectMultiFieldTimelinessContract,
  fillMonitorObject,
  gotoMonitorRuleCreate,
  gotoMonitorRulesStep,
  selectTimelinessRule,
} from "../../../../_shared/pages/timeliness-monitor/timeliness-monitor-page";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc.json" });
test.setTimeout(180000);

test.describe(`${SUITE_NAME} - 多字段时间差配置`, () => {
  test("验证及时性校验-多字段时间差校验配置区域字段完整", async ({ page, step }) => {
    await step("步骤1: 配置监控对象并进入监控规则步骤 → 添加规则按钮可用", async () => {
      await gotoMonitorRuleCreate(page);
      await fillMonitorObject(page, uniqueName("timeliness_contract"));
      await gotoMonitorRulesStep(page);
    });

    await step("步骤2: 添加时效性校验规则 → 配置区展示多字段时间差校验必要字段", async () => {
      await selectTimelinessRule(page);
      await expectMultiFieldTimelinessContract(page);
    });
  });
});
