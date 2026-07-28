// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0004",
  "title": "验证筛选条件组合查询功能正常",
  "steps": [
    {
      "action": "选择【查询结果类型】为【数据表】",
      "expected": "选择成功"
    },
    {
      "action": "选择【数据源类型】为 Doris",
      "expected": "1. 筛选框展示资产平台引入的所有数据源类型\n2. Doris 选项可见且可选中\n3. 选择成功"
    },
    {
      "action": "选择【数据源】为 env_rebuild_test 项目绑定的 Doris 数据源",
      "expected": "1. 数据源下拉仅展示已引入的 Doris 数据源名称\n2. 可选中 `env_rebuild_test_DORIS_doris`（或同项目下等价 Doris 数据源）\n3. 选择成功"
    },
    {
      "action": "选择包含 `test_table` 的数据库",
      "expected": "1. 如果当前数据源下没有已同步数据库，则展示为空\n2. 如果已同步 `test_table`/`active_users` 等表，则可成功选中对应数据库"
    },
    {
      "action": "选择负责人",
      "expected": "1. 如果目标表已配置负责人，则下拉可选中对应负责人\n2. 如果未配置负责人，则下拉为空或不展示候选项"
    },
    {
      "action": "选择表标签",
      "expected": "1. 如果目标表已配置表标签，则下拉可选中对应标签\n2. 如果未配置表标签，则下拉为空或不展示候选项"
    },
    {
      "action": "设置完所有筛选条件后，筛选",
      "expected": "1. 过滤出所有符合组合条件的数据\n2. 没有匹配条件的数据则展示“暂无数据”缺省页"
    }
  ]
} as const;

test.describe("验证筛选条件组合查询功能正常", () => {
  test("C0004 验证筛选条件组合查询功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
