// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C017",
  "title": "验证项目信息新增表单校验和保存成功",
  "steps": [
    {
      "action": "进入【数据质量 → 项目管理】页面，等待项目列表加载完成",
      "expected": "页面 URL 为 `#/dq/project/projectList`，展示【创建项目】按钮和项目列表"
    },
    {
      "action": "点击【创建项目】，等待创建项目弹窗加载完成",
      "expected": "弹窗展示项目名称、项目标识、管理员、项目描述字段"
    },
    {
      "action": "项目名称输入 65 个字符，项目标识输入包含特殊字符的 65 个字符，不选择管理员，点击【确定】，等待表单校验完成",
      "expected": "项目名称提示不超过 64 个字符；项目标识提示不超过 64 个字符且只支持字母、数字、下划线；管理员提示请选择管理员用户"
    },
    {
      "action": "将项目名称改为“v63回归项目”，项目标识改为“v63_regression_project”，管理员选择当前登录用户，项目描述输入“v63回归项目描述”",
      "expected": "表单字段展示输入值"
    },
    {
      "action": "点击【确定】，等待项目列表刷新完成",
      "expected": "提示创建成功，项目列表展示“v63回归项目”和项目标识“v63_regression_project”"
    },
    {
      "action": "使用项目名称“v63回归项目”搜索并等待列表刷新完成",
      "expected": "列表仅展示匹配的项目记录"
    }
  ]
} as const;

test.describe("验证项目信息新增表单校验和保存成功", () => {
  test("C017 验证项目信息新增表单校验和保存成功", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
