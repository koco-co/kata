// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0053",
  "title": "验证数据地图表详情页操作按钮与信息分区展示",
  "steps": [
    {
      "action": "展示如下：\n表名，表名复制按钮，删除表按钮，导出按钮，订阅按钮\n表结构，数据预览，血缘关系，任务依赖，版本变更，操作记录\n基本信息，技术属性，业务属性，热度统计",
      "expected": "操作成功"
    }
  ]
} as const;

test.describe("验证数据地图表详情页操作按钮与信息分区展示", () => {
  test("C0053 验证数据地图表详情页操作按钮与信息分区展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
