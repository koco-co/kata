// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0007",
  "title": "验证元数据同步 Doris 周期同步任务新建与临时同步流程",
  "steps": [
    {
      "action": "进入【元数据】-【元数据同步】页面",
      "expected": "页面加载成功，\"新增周期同步任务\"按钮可见"
    },
    {
      "action": "点击【新增周期同步任务】",
      "expected": "进入同步任务配置流程"
    },
    {
      "action": "选择数据源类型为Doris",
      "expected": "数据源类型选择成功"
    },
    {
      "action": "选择数据库、数据表",
      "expected": "选择成功"
    },
    {
      "action": "依次点击【添加】→【下一步】→【新增】",
      "expected": "同步任务创建成功"
    },
    {
      "action": "点击【临时同步】",
      "expected": "同步任务开始运行"
    }
  ]
} as const;

test.describe("验证元数据同步 Doris 周期同步任务新建与临时同步流程", () => {
  test("C0007 验证元数据同步 Doris 周期同步任务新建与临时同步流程", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
