// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C205",
  "title": "验证数据标准-查询",
  "steps": [
    {
      "action": "默认查询",
      "expected": "默认展示所有数据标准"
    },
    {
      "action": "根据目录查询：点击左侧任一目录",
      "expected": "右侧列表展示对应目录下的未删除的数据标准"
    },
    {
      "action": "根据标准名称搜索查询：在搜索框中输入任一字符，回车或点击搜索icon",
      "expected": "列表展示中文名称/英文名称/英文缩写相匹配的数据标准"
    },
    {
      "action": "根据上线状态筛选：状态分别筛选待上线/已上线/待审批",
      "expected": "列表展示待上线/已上线/待审批的数据标准"
    },
    {
      "action": "分页查询：“上一页”/“下一页”翻页",
      "expected": "1）“上一页”数据正确\n2）“下一页”数据正确"
    },
    {
      "action": "分页查询：指定页码翻页",
      "expected": "数据正确"
    },
    {
      "action": "分页查询：筛选后翻页",
      "expected": "数据正确"
    },
    {
      "action": "分页查询：翻页后筛选\n先翻页到最后一页（最后一页数据小于每页最大条数）\n再进行筛选查询（筛选后页数要小于筛选前页数）",
      "expected": "1）页码更新为第一页\n2）筛选数据正确"
    }
  ]
} as const;

test.describe("验证数据标准-查询", () => {
  test("C205 验证数据标准-查询", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
