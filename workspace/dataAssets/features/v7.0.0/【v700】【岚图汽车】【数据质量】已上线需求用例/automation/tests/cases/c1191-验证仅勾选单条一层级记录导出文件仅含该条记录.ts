// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1191",
  "title": "验证仅勾选单条一层级记录导出，文件仅含该条记录",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】，等待列表数据加载完成",
      "expected": "列表正常加载，每行显示复选框"
    },
    {
      "action": "仅勾选 singleExport 一行复选框",
      "expected": "1) 仅 singleExport 行为选中态，其余行未选中\n2) 列表底部显示「当前选中：1」"
    },
    {
      "action": "点击顶部【导出】按钮，等待文件下载完成",
      "expected": "浏览器触发文件下载"
    },
    {
      "action": "打开下载的导出文件，核对记录条数与字段值",
      "expected": "1) 文件仅含 1 条记录\n2) 该记录字段为：key=singleExport、中文名称=单行导出、value 格式=^\\d+$、数据源类型=SparkThrift2.x、层级关系=一层、父 Key=空"
    }
  ]
} as const;

test.describe("验证仅勾选单条一层级记录导出，文件仅含该条记录", () => {
  test("C1191 验证仅勾选单条一层级记录导出，文件仅含该条记录", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
