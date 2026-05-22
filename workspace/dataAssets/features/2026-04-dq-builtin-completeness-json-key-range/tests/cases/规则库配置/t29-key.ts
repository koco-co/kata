// spec: features/completeness-json-key-range/archive.md#case=t29-key
// intent: SR-INTENT-MIGRATED
// probe: SR-UI-PROBE-MIGRATED
// page: _shared/pages/PLACEHOLDER-page.ts
// META: {"id":"t29","priority":"P1","title":"【P1】验证规则库中新增key范围校验内置规则展示信息正确"}
// TODO: 此用例需要规则库页面导航 + 内置规则展示验证的专用测试数据。
import { test } from "../../../../../_shared/fixtures/step-screenshot";

test.use({ storageState: process.env.UI_AUTOTEST_SESSION_PATH ?? "workspace/dataAssets/.kata/auth/dataAssets/session-ltqc.json" });
test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证规则库中新增key范围校验内置规则展示信息正确", async () => {
    test.skip(true, "需要专用的规则库页面导航+内置规则展示验证测试数据");
  });
});
