// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0530",
  "title": "验证【数据质量 规则任务管理 P0-主流程】格式-json格式校验完整主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看通过实例",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "点击【新建规则集】，在 Step 1 基础信息中按顺序配置如下：\n- *选择数据源：测试数据源_Doris\n-*选择数据库：quality_test_db\n- *选择数据表：json_format_test\n- 规则集描述：无\n-*规则包名称：P0主流程测试包（点击【新增】按钮添加）\n点击【下一步】",
      "expected": "Step 1 校验通过，进入 Step 2 监控规则页面"
    },
    {
      "action": "在 Step 2 监控规则中，在「P0主流程测试包」下点击【新增规则】，选择【有效性校验】，按顺序配置如下：\n- *规则类型：字段级\n-*字段：info（json）\n- *统计规则：格式-json格式校验\n-*校验key：person-name、person-age\n- 强弱规则：强规则\n- 过滤条件：无\n- 规则描述：无\n点击规则行的【保存】按钮，再点击页面底部【保存】",
      "expected": "规则集保存成功，列表新增 json_format_test 表对应的规则集记录，规则包「P0主流程测试包」下显示已保存的「格式-json格式校验」规则"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】页面，等待规则任务列表加载完成，点击【新建监控规则】，在 Step 1 基础信息中按顺序配置如下：\n- *规则名称：json格式校验任务_P0\n-*选择数据源：测试数据源_Doris\n- *选择数据库：quality_test_db\n-*选择数据表：json_format_test\n点击【下一步】",
      "expected": "Step 1 校验通过，进入 Step 2 监控规则页面"
    },
    {
      "action": "在 Step 2 监控规则中点击【导入规则包】，选择规则集管理中刚创建的规则包「P0主流程测试包」并确认导入",
      "expected": "规则包导入成功，Step 2 页面仅展示从规则集管理导入的「格式-json格式校验」相关规则，无额外手工新增规则"
    },
    {
      "action": "点击【下一步】进入 Step 3 调度属性，填写调度属性后点击【保存】",
      "expected": "规则任务创建成功，返回任务列表后可查询到任务「json格式校验任务\\\\_P0」"
    },
    {
      "action": "在规则任务列表中找到「json格式校验任务\\\\_P0」，点击操作列的【立即执行】按钮",
      "expected": "页面弹出提示信息，提示任务已提交执行"
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，等待列表加载完成，找到「json格式校验任务\\\\_P0」最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录，任务名称与执行时间与本次操作匹配\n2) 实例状态显示「已完成」，最新校验结果显示「校验通过」\n3) 实例详情中「格式-json格式校验」规则行展示：规则类型=「有效性校验」、规则名称=「格式-json格式校验」、字段类型=「json」、质检结果=「校验通过」、未通过原因=「--」、详情说明=「符合规则key为\"person-name;person-age\"时的value格式要求」\n4) 操作列不显示「查看详情」链接"
    }
  ]
} as const;

test.describe("验证【数据质量 规则任务管理 P0-主流程】格式-json格式校验完整主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看通过实例", () => {
  test("C0530 验证【数据质量 规则任务管理 P0-主流程】格式-json格式校验完整主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看通过实例", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
