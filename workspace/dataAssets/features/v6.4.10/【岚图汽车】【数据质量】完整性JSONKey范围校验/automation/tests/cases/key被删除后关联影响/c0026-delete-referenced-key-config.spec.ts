// TODO: 此用例需要专用的 key 删除场景测试数据（key_del_1, key_del_2, key_del_3）
//       以及对应的规则集配置。需新增 test-data.ts 中的 TABLE_DEFINITION。
import { test } from "../../../../../../../_shared/automation/fixtures/step-screenshot";

test.setTimeout(600000);

const SUITE_NAME = "【内置规则丰富】完整性，json中key值范围校验(#15693)";

test.describe(SUITE_NAME, () => {
  test("验证删除已被规则引用的key后规则配置回显和编辑功能正常", async () => {
    test.skip(true, "需要专用的 key 删除场景测试数据 + json-config-helpers 交互");
  });
});
