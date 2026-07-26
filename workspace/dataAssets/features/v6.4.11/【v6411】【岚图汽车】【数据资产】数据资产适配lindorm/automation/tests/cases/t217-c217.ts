// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C217",
  "title": "验证数据标准-导入标准-重复处理规则",
  "steps": [
    {
      "action": "1) \"重复处理逻辑\"选择“重复则跳过”\n2）导入的文件中包含一个数据标准中文名与已有标准重复：国家-Country_copy-cntr_copy（中文名-英文名-英文缩写）",
      "expected": "文件中的重复的标准不导入，已有标准不更新"
    },
    {
      "action": "1) \"重复处理逻辑\"选择“重复则跳过”\n2）导入的文件中包含一个数据标准英文名称与已有标准重复：国家_copy-Country-cntr_copy（中文名-英文名-英文缩写）",
      "expected": "文件中的重复的标准不导入，已有标准不更新"
    },
    {
      "action": "1) \"重复处理逻辑\"选择“重复则跳过”\n2）导入的文件中包含一个数据标准英文缩写与已有标准重复：国家_copy-Country_copy-cntr（中文名-英文名-英文缩写）",
      "expected": "文件中的重复的标准不导入，已有标准不更新"
    },
    {
      "action": "1) \"重复处理逻辑\"选择“重复则覆盖更新”\n2）导入的文件中包含一个数据标准中文名与已有标准重复：国家-Country_copy-cntr_copy（中文名-英文名-英文缩写）",
      "expected": "文件中的重复的标准导入，已有标准更新为导入文件中的内容"
    },
    {
      "action": "1) \"重复处理逻辑\"选择“重复则覆盖更新”\n2）导入的文件中包含一个数据标准英文名称与已有标准重复：国家_copy-Country-cntr_copy（中文名-英文名-英文缩写）",
      "expected": "文件中的重复的标准导入，已有标准更新为导入文件中的内容"
    },
    {
      "action": "1) \"重复处理逻辑\"选择“重复则覆盖更新”\n2）导入的文件中包含一个数据标准英文缩写与已有标准重复：国家_copy-Country_copy-cntr（中文名-英文名-英文缩写）",
      "expected": "文件中的重复的标准导入，已有标准更新为导入文件中的内容"
    }
  ]
} as const;

test.describe("验证数据标准-导入标准-重复处理规则", () => {
  test("C217 验证数据标准-导入标准-重复处理规则", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
