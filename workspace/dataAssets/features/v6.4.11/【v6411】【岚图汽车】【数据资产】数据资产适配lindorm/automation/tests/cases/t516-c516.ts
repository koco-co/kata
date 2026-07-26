// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C516",
  "title": "验证接收人通知生效",
  "steps": [
    {
      "action": "1） 新增元数据实时同步-通知配置\n2） 接收人选择a,b,c用户\n3） 输入必填信息，点击确认按钮\n4） 该元数据实时同步任务触发告警通知",
      "expected": "a,b,c用户接收告警通知正常"
    },
    {
      "action": "1）新增元数据实时同步-通知配置\n2） 接收人选择a,b,c用户\n3） 资产平台移除a 用户\n4） 该元数据实时同步任务触发告警通知",
      "expected": "1）  b,c用户接收告警通知正常\n2） a 用户无法解决告警通知\n3） 列表内不存在a"
    }
  ]
} as const;

test.describe("验证接收人通知生效", () => {
  test("C516 验证接收人通知生效", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
