// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C009",
  "title": "验证先搜索筛选再勾选导出，文件仅含搜索结果中勾选的行",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置 → json格式校验管理】，等待列表数据加载完成",
      "expected": "列表正常加载，顶部显示搜索框「请输入key名称查询」"
    },
    {
      "action": "在搜索框输入 vehicle，触发查询，等待列表刷新",
      "expected": "列表仅显示 key 名含 vehicle 的记录"
    },
    {
      "action": "勾选搜索结果中的 1 行，点击顶部【导出】按钮，等待文件下载完成",
      "expected": "1) 该行复选框选中，列表底部显示「当前选中：1」\n2) 浏览器触发文件下载"
    },
    {
      "action": "打开下载的导出文件，核对记录",
      "expected": "文件仅含步骤 3 勾选的那行记录，不含未勾选的其它 vehicle 记录，也不含被搜索过滤掉的记录"
    }
  ]
} as const;

test.describe("验证先搜索筛选再勾选导出，文件仅含搜索结果中勾选的行", () => {
  test("C009 验证先搜索筛选再勾选导出，文件仅含搜索结果中勾选的行", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
