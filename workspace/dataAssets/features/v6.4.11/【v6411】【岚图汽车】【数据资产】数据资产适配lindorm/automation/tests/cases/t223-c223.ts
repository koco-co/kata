// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C223",
  "title": "验证数据标准-版本变更",
  "steps": [
    {
      "action": "新建一个标准A，点击查看标准A的版本变更",
      "expected": "版本变更下自动生成版本号为V1.0，编辑用户为当前用户，发布时间为当前时间的记录"
    },
    {
      "action": "点击编辑标准A，不更改内容，点击保存，点击查看标准A 的版本变更",
      "expected": "版本变更下没有新的记录生成"
    },
    {
      "action": "点击编辑标准A，更改内容，点击保存，点击查看标准A 的版本变更",
      "expected": "版本变更下生成版本号为V1.1，编辑用户为当前用户，发布时间为当前时间的记录"
    },
    {
      "action": "切换用户，点击编辑标准A，不更改内容，点击保存，点击查看标准A 的版本变更",
      "expected": "版本变更下没有新的记录生成"
    },
    {
      "action": "切换用户，点击编辑标准A，更改内容，点击保存，点击查看标准A 的版本变更",
      "expected": "版本变更下生成版本号为V1.2，编辑用户为当前用户，发布时间为当前时间的记录"
    }
  ]
} as const;

test.describe("验证数据标准-版本变更", () => {
  test("C223 验证数据标准-版本变更", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
