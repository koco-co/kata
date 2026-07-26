// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C005",
  "title": "验证勾选父节点时子节点被自动级联进导出文件",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】，等待列表数据加载完成",
      "expected": "列表正常加载，parentOnly 行显示展开图标"
    },
    {
      "action": "不展开 parentOnly，仅勾选 parentOnly 一行复选框",
      "expected": "列表底部显示「当前选中：2」"
    },
    {
      "action": "点击顶部【导出】按钮，等待文件下载完成",
      "expected": "浏览器触发文件下载"
    },
    {
      "action": "打开下载的导出文件，核对记录条数",
      "expected": "1) 文件包含两条记录，包含 childNotExport\n2) 说明勾选父节点会自动级联导出其子节点"
    }
  ]
} as const;

test.describe("验证勾选父节点时子节点被自动级联进导出文件", () => {
  test("C005 验证勾选父节点时子节点被自动级联进导出文件", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
