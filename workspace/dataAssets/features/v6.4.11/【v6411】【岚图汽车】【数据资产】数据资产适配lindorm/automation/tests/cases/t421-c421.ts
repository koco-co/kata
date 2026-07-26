// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C421",
  "title": "验证数据地图搜索页-批量权限申请",
  "steps": [
    {
      "action": "1）当前用户对于表A、表B的表级权限如下：\n    - 表A：DQL，有效期：2023-10-18\n    - 表B：DML、DQL （已配置行级权限），有效期：永久\n    - 表C：DDL，有效期：永久\n\n2）勾选表A、表B，进行批量权限申请：\n    - 勾选“权限”：DDL\n    - 有效期选择：2023-10-30",
      "expected": "审批中心生成2条待审批记录（无表C的申请记录），分别为：\n    - 表A：DDL\n    - 表B：DDL"
    },
    {
      "action": "审批中心通过申请后",
      "expected": "「我的权限查看」页面：\n    - 表A，表级权限：DQL、DDL，行级权限不变\n    - 表B，表级权限：DQL、DDL、DML，行级权限不变\n    - 表C，表级权限：DDL，行级权限不变"
    },
    {
      "action": "1）当前用户对于表A、表B的表级权限如下：\n    - 表A：DQL，有效期：2023-10-18\n    - 表B：DML、DQL （已配置行级权限），有效期：永久\n    - 表C：DDL，有效期：永久\n\n2）勾选表A、表B，进行批量权限申请：\n    - 勾选“权限”：DML\n    - 有效期选择：2023-10-30",
      "expected": "1）「安全审计」新增2条审计日志（分别为表A、表C的申请记录）：\n\t\t- 操作模块：元数据\n\t\t- 动作：表权限申请\n\t\t- 详细内容：请${数据源名称}数据源下${数据库名称}数据库表A/表C数据表的dml权限，有效期至2023-10-30\n2）审批中心生成2条待审批记录（无表B的申请记录），分别为：\n    - 表A：DML\n    - 表C：DML"
    },
    {
      "action": "审批中心通过申请后",
      "expected": "「我的权限查看」页面：\n    - 表A，表级权限：DQL、DML，行级权限不变\n    - 表B，表级权限：DQL、DML，行级权限不变\n    - 表C，表级权限：DDL、DML，行级权限不变"
    }
  ]
} as const;

test.describe("验证数据地图搜索页-批量权限申请", () => {
  test("C421 验证数据地图搜索页-批量权限申请", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
