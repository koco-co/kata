// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0707",
  "title": "验证「任务实例详情」中「多表数据行数对比」规则内容显示正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【任务实例详情】页面",
      "expected": "进入成功"
    },
    {
      "action": "UI CHECK",
      "expected": "监控报告内容如下:1) 标识: 校验未通过(1)2) 完整性校验表格: 规则类型: 多表数据行数对比/表/对比表1所属库/对比表1/分区${若存在多张对比表, 此处依次展示对比表N所属库/对比表N/分区} /强弱规则/规则描述3) 比对规则: 记录数百分比差异，对比表之间的总记录数，差距小于等于【${num}】%时候，计为成功匹配记录数数量差异，对比表之间的总记录数，差距小于等于【${num}】条时候，计为成功匹配"
    },
    {
      "action": "点击「查看明细」按钮",
      "expected": "弹出「查看明细」弹窗"
    },
    {
      "action": "UI CHECK",
      "expected": "1) 弹窗标题: 「查看\"完整性校验-多表数据行数对比\"明细」2) 运行时间: 可选择时间, 格式2025-10-10 10:10:103) 「下载明细」按钮4) 列表信息: 包含表名/分区/所属库/表行数"
    }
  ]
} as const;

test.describe("验证「任务实例详情」中「多表数据行数对比」规则内容显示正确", () => {
  test("C0707 验证「任务实例详情」中「多表数据行数对比」规则内容显示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
