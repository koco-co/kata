// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C495",
  "title": "验证移除用户-移出产品-权限转让功能正常",
  "steps": [
    {
      "action": "1）数据地图中表A的负责人为用户A\n2）选择用户A点击【移出产品】；\n3）选择转让人为用户B",
      "expected": "查看表A的表详情页，负责人变更为用户B；"
    },
    {
      "action": "1）周期同步任务，告警接收人为用户A\n2）选择用户A点击【移出产品】；\n3）选择转让人为用户B，配置webhook",
      "expected": "查看此周期同步任务，告警接收人变更为用户B，webhook变更为用户B的webhook"
    },
    {
      "action": "1）实时同步任务，告警接收人为用户A\n2）选择用户A点击【移出产品】；\n3）选择转让人为用户B，配置webhook",
      "expected": "查看此周期同步任务，告警接收人变更为用户B，webhook变更为用户B的webhook"
    },
    {
      "action": "1）数据质量项目A的项目管理员为用户A\n2）选择用户A点击【移出产品】；\n3）选择转让人为用户B",
      "expected": "数据质量-项目信息，项目A的项目管理员变更为用户B"
    },
    {
      "action": "1）数据质量任务，告警接受人为用户A；\n2）选择用户A点击【移出产品】；\n3）选择转让人为用户B，配置webhook",
      "expected": "该质量任务，告警接收人变更为用户B，webhook变更为用户B的webhook"
    },
    {
      "action": "1）数据治理项目A的项目负责人为用户A\n2）选择用户A点击【移出产品】；\n3）选择转让人为用户B",
      "expected": "数据治理项目A的项目管理员变更为用户B，治理通知webhook变更为用户B的webhook"
    },
    {
      "action": "1）数据治理存在指派给用户A的待处理的问题\n2）选择用户A点击【移出产品】；\n3）选择转让人为用户B，配置webhook",
      "expected": "该待处理问题处理人变更为用户B，webhook变更为用户B的webhook"
    },
    {
      "action": "1）数据模型中存在用户A提交的待审批记录\n2）选择用户A点击【移出产品】；\n3）选择转让人为用户B",
      "expected": "数据模型-审批授权-待审批中，该记录提交人变更为用户B"
    }
  ]
} as const;

test.describe("验证移除用户-移出产品-权限转让功能正常", () => {
  test("C495 验证移除用户-移出产品-权限转让功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
