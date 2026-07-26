// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C375",
  "title": "验证【项目管理-项目信息】项目列表、创建与编辑功能正常",
  "steps": [
    {
      "action": "进入【数据质量 → 项目管理 → 项目信息】页面",
      "expected": "1)页面展示「创建项目」按钮\n2)列表列包含「项目名称」「项目标识」「项目描述」「项目成员」「项目管理员」「创建时间」「项目空间关联」「操作」"
    },
    {
      "action": "点击「创建项目」填写项目名称、项目标识、项目描述和项目管理员后保存，再点击「编辑」修改描述",
      "expected": "1)项目创建成功并展示在列表\n2)编辑保存成功\n3)列表回显修改后的项目描述"
    }
  ]
} as const;

test.describe("验证【项目管理-项目信息】项目列表、创建与编辑功能正常", () => {
  test("C375 验证【项目管理-项目信息】项目列表、创建与编辑功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
