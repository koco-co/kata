// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C386",
  "title": "验证数据权限-行级权限校验功能正常",
  "steps": [
    {
      "action": "1）在「数据安全-数据权限分配」配置dql行级级权限为（=）：col1 = value1 ；\n2）在「元数据-数据地图」对该表数据预览",
      "expected": "只显示符合col1 = value1条件的数据"
    },
    {
      "action": "1）在「数据安全-数据权限分配」配置dql行级级权限为（!=）：col1 != value1 ；\n2）在「元数据-数据地图」对该表数据预览",
      "expected": "只显示符合col1 != value1条件的数据"
    },
    {
      "action": "1）在「数据安全-数据权限分配」配置dql行级级权限为（包含）：col1 like \"%value1%\"；\n2）在「元数据-数据地图」对该表数据预览",
      "expected": "只显示符合col1 like \"%value1%\"条件的数据"
    },
    {
      "action": "1）在「数据安全-数据权限分配」配置dql行级级权限为（正则）：col1 REGEXP '^value1'；\n2）在「元数据-数据地图」对该表数据预览",
      "expected": "只显示符合col1 REGEXP '^value1'条件的数据"
    },
    {
      "action": "1）在「数据安全-数据权限分配」配置dql行级级权限为（in）：col1 in ('value1','value2')；\n2）在「元数据-数据地图」对该表数据预览",
      "expected": "只显示符合col1 in ('value1','value2')条件的数据"
    },
    {
      "action": "1）在「数据安全-数据权限分配」配置dql行级级权限为（not in）：col1 not in ('value1','value2')；\n2）在「元数据-数据地图」对该表数据预览",
      "expected": "只显示符合col1 not in ('value1','value2')条件的数据"
    },
    {
      "action": "1）在「数据安全-数据权限分配」配置dql行级级权限为（null）：col1 is null；\n2）在「元数据-数据地图」对该表数据预览",
      "expected": "只显示符合col1 is null条件的数据"
    },
    {
      "action": "1）在「数据安全-数据权限分配」配置dql行级级权限为（in 且 null）：col1 in ('value1','value2') and col2 is null；\n2）在「元数据-数据地图」对该表数据预览",
      "expected": "只显示符合col1 in ('value1','value2') and col2 is null条件的数据"
    },
    {
      "action": "1）在「数据安全-数据权限分配」配置dql行级级权限为（in 或 null）：col1 in ('value1','value2') or col2 is null；\n2）在「元数据-数据地图」对该表数据预览",
      "expected": "只显示符合col1 in ('value1','value2') or col2 is null条件的数据"
    }
  ]
} as const;

test.describe("验证数据权限-行级权限校验功能正常", () => {
  test("C386 验证数据权限-行级权限校验功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
