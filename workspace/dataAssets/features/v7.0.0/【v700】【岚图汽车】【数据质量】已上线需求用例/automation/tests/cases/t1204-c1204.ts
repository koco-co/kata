// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1204",
  "title": "验证 「元数据」中 Doris 3.x 数据表业务/个性属性维护功能",
  "steps": [
    {
      "action": "进入【数据资产】-【元数据】-【元模型管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "下滑找到Doris 3.x元模型, 点击「编辑元模型」",
      "expected": "1) 展示的技术属性与Doris 2.x保持一致2) 支持维护通用业务属性、个性业务属性3) 通用业务属性默认存在两个字段: 表中文名和负责人"
    },
    {
      "action": "进入【数据资产】-【元数据】-【元数据管理】页面",
      "expected": "进入成功"
    },
    {
      "action": "选择数据源类型为「Doris 3.x」的数据源, 点击进入",
      "expected": "进入成功"
    },
    {
      "action": "点击数据库, 进入数据表页面, 选择一条记录, 点击「编辑」按钮",
      "expected": "1) 弹出「表元数据」弹窗2) 支持编辑通用业务属性中的字段值"
    },
    {
      "action": "「负责人」选择选项「表中文名」输入测试配置完成后, 点击保存",
      "expected": "返回数据表列表页面, toast提示: 业务属性保存成功, 数据表预览内容同步更新"
    }
  ]
} as const;

test.describe("验证 「元数据」中 Doris 3.x 数据表业务/个性属性维护功能", () => {
  test("C1204 验证 「元数据」中 Doris 3.x 数据表业务/个性属性维护功能", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
