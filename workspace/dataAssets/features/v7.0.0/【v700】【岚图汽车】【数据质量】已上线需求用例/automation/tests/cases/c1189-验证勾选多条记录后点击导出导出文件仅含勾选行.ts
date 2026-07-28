// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1189",
  "title": "验证勾选多条记录后点击导出，导出文件仅含勾选行",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】，等待列表数据加载完成",
      "expected": "1) 列表每行首列显示复选框，表头显示全选复选框\n2) 顶部依次显示【导入】【导出】【新增】按钮\n3) 所有行复选框初始均未勾选"
    },
    {
      "action": "勾选 exportA、exportB 两行复选框，不勾选 exportC",
      "expected": "1) exportA、exportB 复选框变为选中态\n2) 列表底部显示「当前选中：2」\n3) exportC 复选框仍为未选中态"
    },
    {
      "action": "点击顶部【导出】按钮，等待文件下载完成",
      "expected": "1) 弹窗提示: 请确认导出数据\n2) 浏览器触发文件下载"
    },
    {
      "action": "打开下载的导出文件，核对数据行与内容",
      "expected": "1) 文件仅含 exportA、exportB 两条记录，不含 exportC\n2) 列按顺序为：key、中文名称、value 格式、数据源类型、创建人、创建时间、更新人、更新时间、层级关系、父 Key"
    }
  ]
} as const;

test.describe("验证勾选多条记录后点击导出，导出文件仅含勾选行", () => {
  test("C1189 验证勾选多条记录后点击导出，导出文件仅含勾选行", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
