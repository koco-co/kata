// TODO: 此用例需要抽样功能配置 + 大数据量前置条件，当前先做骨架。
import { test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证key范围校验规则结合抽样功能正确执行", async () => {
    test.skip(true, "需要抽样功能配置和大数据量专用前置条件");
  });
});
