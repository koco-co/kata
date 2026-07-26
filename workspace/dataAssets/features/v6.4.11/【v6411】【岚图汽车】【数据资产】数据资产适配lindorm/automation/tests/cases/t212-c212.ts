// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C212",
  "title": "验证数据标准-下线",
  "steps": [
    {
      "action": "1）当前用户为管理员用户\n2）数据标准列表页，对待上线标准，点击【下线】按钮",
      "expected": "该数据标准状态更新为“待上线”"
    },
    {
      "action": "管理员对已存在映射关系的数据标准进行【下线】操作",
      "expected": "1）该数据标准状态更新为“待上线”\n2）标准映射页，该标准的映射结果也不展示\n3）映射该标准的表详情页，字段列表中对应映射字段也不展示标准标识"
    },
    {
      "action": "1）当前用户为数据开发用户\n2）数据标准列表页，对已上线标准，点击【下线】按钮",
      "expected": "该数据标准状态更新为“待审批”"
    }
  ]
} as const;

test.describe("验证数据标准-下线", () => {
  test("C212 验证数据标准-下线", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
