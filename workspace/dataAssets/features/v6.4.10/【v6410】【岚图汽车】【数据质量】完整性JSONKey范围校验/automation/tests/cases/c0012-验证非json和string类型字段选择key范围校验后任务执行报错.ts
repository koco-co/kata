// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0012",
  "title": "验证非json和string类型字段选择key范围校验后任务执行报错",
  "steps": [
    {
      "action": "进入【数据质量 → 规则集管理】页面，等待规则集列表加载完成",
      "expected": "规则集管理页面正常打开，列表加载完成"
    },
    {
      "action": "找到\"rule_set_field_type_test\"，点击操作列的【编辑】按钮，进入 Step 2 监控规则页面，在\"字段类型测试包\"中点击【新增规则】，统计函数选择【key范围校验】，展开字段选择下拉框，依次查看INT类型字段\"age\"、DATE类型字段\"create_date\"、BIGINT类型字段\"user_id\"的可选状态",
      "expected": "1) 字段下拉框中\"age\"（INT）、\"create_date\"（DATE）、\"user_id\"（BIGINT）均**可正常选择**（不置灰）\n2) 前端在配置阶段不对字段类型做拦截"
    },
    {
      "action": "选择\"age\"（INT类型）字段，校验方法选择【包含】，校验内容勾选\"key1（姓名）\"，点击规则行【保存】，再点击页面底部【保存】",
      "expected": "规则集保存成功，未出现前端校验拦截"
    },
    {
      "action": "进入【数据质量 → 规则任务管理】页面，找到\"task_field_type_invalid\"，按提示重新【导入规则包】拉取最新规则后保存任务；点击任务行的表名展开抽屉，点击【立即执行】",
      "expected": "页面提示\"操作成功，稍后可在任务查询中查看详情\""
    },
    {
      "action": "进入【数据质量 → 校验结果查询】页面，找到\"task_field_type_invalid\"最新实例记录并打开实例详情",
      "expected": "1) 本次执行生成新的实例记录\n2) 该规则行**校验异常**（任务运行失败或校验未通过），错误信息提示字段类型不支持 key 范围校验"
    },
    {
      "action": "使用 Doris3.x 数据源重复以上步骤，将 `age`/`create_date`/`user_id` 改为 Doris3.x 对应类型（`INT`/`DATE`/`BIGINT`），其余 UI 操作不变；预期结果与 SparkThrift2.x 一致",
      "expected": "Doris3.x 数据源下，UI 同样允许选择非 json/string 字段，但执行后【校验结果查询】中报错信息一致"
    }
  ]
} as const;

test.describe("验证非json和string类型字段选择key范围校验后任务执行报错", () => {
  test("C0012 验证非json和string类型字段选择key范围校验后任务执行报错", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
