// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0746",
  "title": "验证「监控规则」-「合理性校验」-「多表字段值对比」任务不通过结果详情正确",
  "steps": [
    {
      "action": "进入「资产-【数据资产】-【数据质量】-【校验结果查询】」页面",
      "expected": "页面正常打开，页面显示「test_rule2」相关任务，校验结果为\"校验不通过\""
    },
    {
      "action": "点击「test_rule2」任务表名称",
      "expected": "抽屉展开结果详情"
    },
    {
      "action": "查看详情",
      "expected": "页面包含：\n任务名称、监控报告tab、表级报告tab"
    },
    {
      "action": "点击【监控报告】tab",
      "expected": "包含：\n1）子规则一-「合理性校验」-「多表字段值对比」-「计算结果对比」配置的详情：\n「字段」：「 field_smallint」\n「统计函数」：「 多表字段值对比」\n「过滤条件」：「--」\n「校验表主键」：「id」\n「关联表1」：「 B」，\n「关联表1主键」：「 id」\n「对比方法」：「计算结果对比」\n「计算逻辑」：「A.field_smallint+B.field_smallint=（A.field_bigint+B.field_int）*field_tinyint」 「强弱规则」：「弱规则」\n「规则描述」：「测试规则」\n2）显示「查看明细」按钮\n3）子规则二-「合理性校验」-「多表字段值对比」-「计算结果值判断」配置的详情：\n「字段」：「 field_float」\n「统计函数」：「 多表字段值对比」\n「过滤条件」：「--」\n「校验表主键」：「id」\n「关联表1」：「 B」，\n「关联表1主键」：「 id」\n「对比方法」：「计算结果值判断」\n「计算逻辑」：「（A.field_float-B.field_float）/A.field_float>=100且=10000」 「强弱规则」：「弱规则」\n「规则描述」：「测试规则」\n4）显示「查看明细」按钮"
    },
    {
      "action": "点击「查看明细」按钮",
      "expected": "1）标题：\"查看\"合理性校验-多表字段值对比\"明细\"\n2）列表记录不符合的数据，表头展示所有校验表主键、校验表字段、关联表主键、关联表字段，校验字段标红展示\n3）显示「下载明细」按钮"
    },
    {
      "action": "点击【下载明细】按钮",
      "expected": "支持下载明细，内容正确"
    },
    {
      "action": "点击【表级报告】tab",
      "expected": "包含\n1）数据表信息汇总（表名、总分区数量、数据源、数据源类型、数据库），空白时显示\"--\"；\n2）表级统计（记录数、报警数），报警数显示\"2\"；\n3）最近30次综合报告（记录数平均波动率、平均记录数、日平均告警数、平均告警数）；\n4）最近30次表级统计；\n5）最近30次表数据波动图"
    }
  ]
} as const;

test.describe("验证「监控规则」-「合理性校验」-「多表字段值对比」任务不通过结果详情正确", () => {
  test("C0746 验证「监控规则」-「合理性校验」-「多表字段值对比」任务不通过结果详情正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
