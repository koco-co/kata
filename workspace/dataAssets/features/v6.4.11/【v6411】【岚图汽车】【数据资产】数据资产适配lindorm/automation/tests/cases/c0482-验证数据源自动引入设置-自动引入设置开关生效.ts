// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0482",
  "title": "验证数据源自动引入设置-自动引入设置开关生效",
  "steps": [
    {
      "action": "1）数据源类型为“全部”，并关闭离线开发的自动引入设置；\n2）离线项目对接新计算引擎；\n3）查看数据源管理",
      "expected": "未自动引入对应引擎的meta数据源"
    },
    {
      "action": "1）数据源类型为“全部”，并开启离线开发的自动引入设置；\n2）离线项目对接新计算引擎；\n3）查看数据源管理",
      "expected": "自动引入对应引擎的meta数据源，并生成对应的元数据同步周期任务"
    },
    {
      "action": "1）数据源类型为“Sparkthrift;MySQL”，并开启离线开发的自动引入设置；\n2）离线项目对接Hadoop和Oracle计算引擎；\n3）查看数据源管理",
      "expected": "自动引入Sparkthfit的meta数据源，并生成对应的元数据同步周期任务"
    }
  ]
} as const;

test.describe("验证数据源自动引入设置-自动引入设置开关生效", () => {
  test("C0482 验证数据源自动引入设置-自动引入设置开关生效", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
