// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0743",
  "title": "验证【数据质量 校验结果查询 校验明细与日志】下载明细数据中校验字段标红展示",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待页面加载完成",
      "expected": "校验结果查询页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"task_json_key_range_test\"结果记录，点击校验不通过规则行操作列的【查看明细】按钮，等待明细页加载完成",
      "expected": "明细数据页面正常打开，数据加载完成"
    },
    {
      "action": "点击明细页面右上角的【下载明细】按钮，等待文件下载完成",
      "expected": "文件成功下载，文件格式为Excel（.xlsx）"
    },
    {
      "action": "打开下载的Excel文件，查看校验字段（info列）中不符合规则记录的单元格样式",
      "expected": "Excel文件中，不符合规则记录的\"info\"字段对应单元格呈红色背景或红色字体标注，与页面展示一致"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验明细与日志】下载明细数据中校验字段标红展示", () => {
  test("C0743 验证【数据质量 校验结果查询 校验明细与日志】下载明细数据中校验字段标红展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
