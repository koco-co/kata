// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C062",
  "title": "验证【表结构】-【批量编辑】模块功能正常",
  "steps": [
    {
      "action": "查看【元数据-数据地图】表详情页；",
      "expected": "列表左下角显示【批量编辑】按钮"
    },
    {
      "action": "点击【批量编辑】",
      "expected": "列表进入编辑状态；\n【批量编辑】按钮变为【保存】按钮；\n列表当前页“字段描述”列、“字段中文名”列以及“字段标签”列展示为输入框并自动加载对应字段描述/字段中文名/字段标签值；"
    },
    {
      "action": "1）进入批量编辑状态；\n2）修改字段描述；\n3）修改字段中文名\n4）新增/删除字段标签；\n点击【保存】",
      "expected": "保存成功；\n字段描述/字段中文名/字段标签更新成功"
    },
    {
      "action": "1）手动维护表A字段中文名、字段描述\n2）元数据页面，元数据同步，选择临时同步表A\n3）元数据，数据地图，点击查看表A详情页",
      "expected": "字段中文名和字段描述都不改变"
    },
    {
      "action": "1）没有手动维护表A字段中文名、字段描述\n2）元数据页面，元数据同步，选择临时同步表A\n3）元数据，数据地图，点击查看表A详情页",
      "expected": "字段中文名和字段描述随着改变"
    },
    {
      "action": "1）手动维护表A字段中文名，没有手动维护字段描述\n2）元数据页面，元数据同步，选择临时同步表A\n3）元数据，数据地图，点击查看表A详情页",
      "expected": "字段中文名不改变，字段描述随着同步改变"
    },
    {
      "action": "1）没有手动维护字段中文名，手动维护表A字段描述\n2）元数据页面，元数据同步，选择临时同步表A\n3）元数据，数据地图，点击查看表A详情页",
      "expected": "字段中文名随着同步改变，字段描述不改变"
    },
    {
      "action": "进入批量编辑状态；\n点击“表结构”tab外的其他tab页面",
      "expected": "提示“先保存编辑信息”"
    },
    {
      "action": "进入批量编辑状态；\n点击一级导航栏，除“元数据”以外的菜单",
      "expected": "提示“先保存编辑信息”"
    },
    {
      "action": "进入批量编辑状态；\n点击左侧树状菜单栏，除“数据地图”以外的菜单",
      "expected": "提示“先保存编辑信息”"
    }
  ]
} as const;

test.describe("验证【表结构】-【批量编辑】模块功能正常", () => {
  test("C062 验证【表结构】-【批量编辑】模块功能正常", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
