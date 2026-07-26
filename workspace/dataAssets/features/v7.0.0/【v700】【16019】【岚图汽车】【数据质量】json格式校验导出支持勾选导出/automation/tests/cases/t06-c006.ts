// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C006",
  "title": "验证勾选导出文件列结构完整且顺序正确",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】，等待列表数据加载完成",
      "expected": "列表正常加载，每行显示复选框"
    },
    {
      "action": "勾选任意 1 行，点击顶部【导出】按钮，等待文件下载完成",
      "expected": "1) 所选行复选框选中\n2) 浏览器触发文件下载"
    },
    {
      "action": "打开下载的导出文件，核对表头列与顺序",
      "expected": "导出文件表头按顺序为 10 列：key、中文名称、value 格式、数据源类型、创建人、创建时间、更新人、更新时间、层级关系、父 Key，无缺列、无多余列、顺序与列表一致"
    }
  ]
} as const;

test.describe("验证勾选导出文件列结构完整且顺序正确", () => {
  test("C006 验证勾选导出文件列结构完整且顺序正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
