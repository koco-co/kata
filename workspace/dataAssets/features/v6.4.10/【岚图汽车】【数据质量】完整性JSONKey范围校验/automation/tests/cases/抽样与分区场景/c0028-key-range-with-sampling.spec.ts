// spec: features/completeness-json-key-range/archive.md#case=t28-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t28","priority":"P1","title":"【P1】验证对分区表配置key范围校验规则指定分区下数据校验正确"}
// TODO: 此用例需要分区表 DDL + 分区数据注入的专用测试数据，当前先做骨架。
import { test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证对分区表配置key范围校验规则指定分区下数据校验正确", async () => {
    test.skip(true, "需要分区表 DDL + 分区数据注入的专用测试数据");
  });
});
