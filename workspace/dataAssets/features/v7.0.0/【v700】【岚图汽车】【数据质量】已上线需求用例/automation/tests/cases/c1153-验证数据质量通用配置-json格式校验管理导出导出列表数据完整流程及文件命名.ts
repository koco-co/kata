// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1153",
  "title": "验证【数据质量 通用配置-json格式校验管理 导出】导出列表数据完整流程及文件命名",
  "steps": [
    {
      "action": "进入【数据质量 → 通用配置】页面，等待json格式校验管理列表数据加载完成",
      "expected": "json格式校验管理页面打开，列表显示已有key数据"
    },
    {
      "action": "点击列表右上角【导出】按钮",
      "expected": "弹出确认弹窗，提示文本为「请确认是否导出列表数据」"
    },
    {
      "action": "点击确认弹窗中的【确认】按钮，等待文件下载完成",
      "expected": "浏览器下载文件，文件命名为 json_format_YYYYMMDD.xlsx（YYYYMMDD为执行当天日期），打开文件后包含以下列：\n1) key\n2) 中文名称\n3) value格式\n4) 数据源类型\n5) 创建人\n6) 创建时间\n7) 更新人\n8) 更新时间\n9) 层级关系\n数据内容与列表一致"
    }
  ]
} as const;

test.describe("验证【数据质量 通用配置-json格式校验管理 导出】导出列表数据完整流程及文件命名", () => {
  test("C1153 验证【数据质量 通用配置-json格式校验管理 导出】导出列表数据完整流程及文件命名", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
