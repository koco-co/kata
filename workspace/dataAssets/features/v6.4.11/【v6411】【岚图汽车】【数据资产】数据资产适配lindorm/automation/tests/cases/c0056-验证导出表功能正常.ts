// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0056",
  "title": "验证导出表功能正常",
  "steps": [
    {
      "action": "点击【导出表】按钮",
      "expected": "弹二次确认弹窗"
    },
    {
      "action": "导出元数据弹窗UI CHECK",
      "expected": "确认导出元数据？\n取消，确定按钮"
    },
    {
      "action": "点击【确定】按钮",
      "expected": "元数据下载_日期.csv文件导出成功"
    },
    {
      "action": "查看CSV文件内容",
      "expected": "表名，字段名，字段中文名，字段描述，数据类型，字段标签，SQL信息，技术属性，业务属性，表描述信息，表标签，任务依赖，服务依赖 信息展示正确"
    }
  ]
} as const;

test.describe("验证导出表功能正常", () => {
  test("C0056 验证导出表功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
