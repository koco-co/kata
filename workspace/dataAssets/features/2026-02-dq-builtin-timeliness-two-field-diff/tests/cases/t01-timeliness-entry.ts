// spec: features/2026-02-shi-xiao-xing-ji-shi-xing/archive.md#case=t01-timeliness-entry
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t1","priority":"P0","title":"验证监控对象配置后支持添加时效性校验"}
import { expect, test } from "../../../../_shared/fixtures/step-screenshot";
import { uniqueName } from "../../../../_shared/helpers/test-setup";
import { MONITOR_OBJECT, SUITE_NAME } from "../data/timeliness-multi-field-data";
import {
  expectTimelinessRuleEntry,
  fetchMonitorTableColumns,
  fillMonitorObject,
  gotoMonitorRuleCreate,
  gotoMonitorRulesStep,
} from "../../../../_shared/pages/2026-02-shi-xiao-xing-ji-shi-xing/timeliness-monitor-page";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc.json" });
test.setTimeout(180000);

test.describe(`${SUITE_NAME} - 监控规则配置`, () => {
  test("验证监控对象配置后支持添加时效性校验", async ({ page, step }) => {
    await step("步骤1: 打开新建单表校验规则页面 → 监控对象表单可见", async () => {
      await gotoMonitorRuleCreate(page);
    });

    await step("步骤2: 选择 SparkThrift 数据源、pw_test 库和目标表 → 目标表时间字段存在", async () => {
      await fillMonitorObject(page, uniqueName("timeliness_multi"));
      const columns = await fetchMonitorTableColumns(page);
      const columnNames = columns.map((column) => column.key);
      expect(columnNames).toEqual(expect.arrayContaining([...MONITOR_OBJECT.compareFields]));
      expect(columnNames).toEqual(expect.arrayContaining([...MONITOR_OBJECT.additionalTimeFields]));
    });

    await step("步骤3: 进入监控规则步骤并展开添加规则 → 下拉项包含时效性校验", async () => {
      await gotoMonitorRulesStep(page);
      await expectTimelinessRuleEntry(page);
    });
  });
});
