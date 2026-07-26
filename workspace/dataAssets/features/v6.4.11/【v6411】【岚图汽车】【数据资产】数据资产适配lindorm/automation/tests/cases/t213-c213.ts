// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C213",
  "title": "验证数据标准-审批",
  "steps": [
    {
      "action": "管理员用户进入审批中心",
      "expected": "审批中心可以查询到此申请上线的数据标准"
    },
    {
      "action": "管理员在审批中心对该数据标准进行审批通过",
      "expected": "数据标准列表页，此数据标准为已上线状态"
    },
    {
      "action": "管理员在审批中心对对应的数据标准进行审批不通过",
      "expected": "数据标准列表页，此数据标准为待上线状态"
    },
    {
      "action": "1）数据开发用户对已上线数据标准，触发【下线】\n2）管理员用户进入审批中心",
      "expected": "审批中心可以查询到此申请下线的数据标准"
    },
    {
      "action": "管理员在审批中心对该数据标准进行审批通过",
      "expected": "数据标准列表页，此数据标准为待上线状态"
    },
    {
      "action": "1）数据开发用户对已上线数据标准，触发【下线】\n2）管理员在审批中心对对应的数据标准进行审批不通过",
      "expected": "数据标准列表页，此数据标准为已上线状态"
    }
  ]
} as const;

test.describe("验证数据标准-审批", () => {
  test("C213 验证数据标准-审批", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
