// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0741",
  "title": "验证【数据质量 校验结果查询 校验明细与日志】校验失败时支持查看日志",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待页面加载完成",
      "expected": "校验结果查询页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"task_json_fail_test\"，找到执行状态为\"执行失败\"的记录行",
      "expected": "目标记录可正常定位，执行状态与实际一致"
    },
    {
      "action": "点击该记录行操作列的【查看日志】按钮，等待日志内容加载",
      "expected": "日志弹窗正常打开，显示任务执行失败的错误日志内容，日志内容包含报错时间戳和错误描述信息"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验明细与日志】校验失败时支持查看日志", () => {
  test("C0741 验证【数据质量 校验结果查询 校验明细与日志】校验失败时支持查看日志", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
