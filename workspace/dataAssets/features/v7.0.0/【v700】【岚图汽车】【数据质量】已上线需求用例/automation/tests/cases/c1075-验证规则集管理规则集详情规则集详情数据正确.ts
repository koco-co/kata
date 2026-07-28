// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1075",
  "title": "验证【规则集管理 ❯ 规则集详情 ❯】规则集详情数据正确",
  "steps": [
    {
      "action": "进入【数据资产】-【数据质量】-【规则集管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择规则集rule01, 点击表名",
      "expected": "右侧抽屉形式展开详情页, 包含基本信息和规则详情, 具体如下:1) 标题: ${数据表名称}规则集详情2) 基本信息: 包含表名、所属数据库、所属数据源、规则包数量、规则数量、规则集描述、更新人、更新时间3) 规则详情: - 展示该规则集记录中已配置的规则包内容, 包含规则包名称及关联的校验规则- 每个规则包支持折叠, 默认展开"
    },
    {
      "action": "检查【规则集详情页】中的基本信息&规则详情数据",
      "expected": "1) 基本信息与规则集列表记录保持一致2) 规则详情与规则集记录中配置的规则包内容一致"
    },
    {
      "action": "进入【规则任务管理】中, 配置规则任务引入该规则包并保存",
      "expected": "保存成功"
    },
    {
      "action": "检查【规则任务详情页】",
      "expected": "显示规则任务关联的规则包中, 所有的校验规则"
    },
    {
      "action": "运行规则任务后, 进入【校验结果查询】, 检查【校验结果详情页】",
      "expected": "显示规则任务关联的规则包中, 所有的校验规则"
    }
  ]
} as const;

test.describe("验证【规则集管理 ❯ 规则集详情 ❯】规则集详情数据正确", () => {
  test("C1075 验证【规则集管理 ❯ 规则集详情 ❯】规则集详情数据正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
