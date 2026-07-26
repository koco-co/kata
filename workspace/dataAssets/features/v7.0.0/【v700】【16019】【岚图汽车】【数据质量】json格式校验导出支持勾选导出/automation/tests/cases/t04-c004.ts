// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C004",
  "title": "验证表头全选后点击导出，文件含当前列表全量数据",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】，等待列表数据加载完成",
      "expected": "1) 列表正常加载，表头显示全选复选框\n2) 每行显示复选框"
    },
    {
      "action": "点击表头的全选复选框",
      "expected": "1) 当前页所有行复选框变为选中态，表头复选框变为全选态\n2) 列表底部「当前选中」计数等于当前页行数"
    },
    {
      "action": "点击顶部【导出】按钮，等待文件下载完成",
      "expected": "浏览器触发文件下载"
    },
    {
      "action": "打开下载的导出文件，与列表数据逐行对比",
      "expected": "1) 导出文件记录条数与全选的可见行数一致\n2) 各行 key、中文名称、value 格式、数据源类型与列表显示一致"
    }
  ]
} as const;

test.describe("验证表头全选后点击导出，文件含当前列表全量数据", () => {
  test("C004 验证表头全选后点击导出，文件含当前列表全量数据", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
