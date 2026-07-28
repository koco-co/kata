// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0737",
  "title": "验证【数据质量 校验结果查询 校验明细与日志】校验不通过时明细数据下载功能中校验字段标红",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待页面加载完成",
      "expected": "校验结果查询页面正常打开，列表加载完成"
    },
    {
      "action": "找到「下载明细测试任务」最新实例记录并打开实例详情，点击「格式-json格式校验」规则行操作列的【查看详情】，等待明细弹窗加载",
      "expected": "明细弹窗打开，显示不符合规则的数据行（id=2 的记录）"
    },
    {
      "action": "在明细弹窗中点击【下载明细数据】按钮，等待文件下载完成",
      "expected": "文件成功下载，文件格式为 Excel（.xlsx）"
    },
    {
      "action": "打开下载的 Excel 文件，查看校验字段（payload列）中不符合规则记录的单元格样式",
      "expected": "文件内容包含全部字段列（id、payload、name）；「payload」列（校验字段）以红色标记展示；其他字段列正常展示"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验明细与日志】校验不通过时明细数据下载功能中校验字段标红", () => {
  test("C0737 验证【数据质量 校验结果查询 校验明细与日志】校验不通过时明细数据下载功能中校验字段标红", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
