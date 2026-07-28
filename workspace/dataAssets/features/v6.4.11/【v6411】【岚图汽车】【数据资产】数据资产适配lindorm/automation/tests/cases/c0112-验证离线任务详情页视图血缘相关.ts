// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0112",
  "title": "验证离线任务详情页视图血缘相关",
  "steps": [
    {
      "action": "查看离线任务详情页-血缘关系",
      "expected": "操作成功"
    },
    {
      "action": "1）查看“任务SQL”-“sql解析日志”-“查看血缘图谱”\n2）在血缘图谱中点击视图",
      "expected": "展示视图元数据信息正确"
    },
    {
      "action": "1）查看“任务SQL”-“sql解析日志”-“查看血缘图谱”\n2）在血缘图谱中点击视图；\n3）是视图抽屉中点击【查看详情】",
      "expected": "跳转至视图详情页，且元数据信息正确"
    },
    {
      "action": "查看跨库血缘",
      "expected": "1）表级血缘和字段级血缘正常\n2）页面跳转正确"
    }
  ]
} as const;

test.describe("验证离线任务详情页视图血缘相关", () => {
  test("C0112 验证离线任务详情页视图血缘相关", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
