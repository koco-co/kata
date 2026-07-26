// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C739",
  "title": "验证【数据质量 校验结果查询 校验不通过时明细查看与下载】取值范围&枚举范围规则校验「不通过时下载」明细数据中校验字段标红展示",
  "steps": [
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待列表加载完成",
      "expected": "校验结果查询页面打开，列表显示已有任务记录"
    },
    {
      "action": "在列表中找到 task_15695_and 最新实例记录，点击【查看详情】打开实例详情，再点击取值范围&枚举范围规则行操作列【查看详情】链接",
      "expected": "明细数据页面打开，数据列表显示不通过记录（id=2、id=4、id=5），共 3 条"
    },
    {
      "action": "点击【下载明细】按钮，等待文件下载完成",
      "expected": "浏览器触发文件下载"
    },
    {
      "action": "打开下载的明细文件（Excel 格式），查看 score 字段列的单元格格式及颜色标注",
      "expected": "下载文件展示如下：\n1) 文件可正常打开，包含所有字段列（id、score、category）\n2) score 字段列中不符合规则记录对应单元格以红色背景或红色字体标红展示\n3) 文件中记录数为 3 条（id=2、id=4、id=5），与页面明细列表数量一致"
    }
  ]
} as const;

test.describe("验证【数据质量 校验结果查询 校验不通过时明细查看与下载】取值范围&枚举范围规则校验「不通过时下载」明细数据中校验字段标红展示", () => {
  test("C739 验证【数据质量 校验结果查询 校验不通过时明细查看与下载】取值范围&枚举范围规则校验「不通过时下载」明细数据中校验字段标红展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
