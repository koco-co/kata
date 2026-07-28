// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C1348",
  "title": "验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「新建标准」，「技术属性」-「车型/车系」切换后，「技术属性」中的数据对应切换",
  "steps": [
    {
      "action": "进入【资产】-【数据标准】-【标准管理】-【标准定义】页面",
      "expected": "进入成功"
    },
    {
      "action": "点击【新建标准】按钮",
      "expected": "进入[新建标准]配置页面"
    },
    {
      "action": "业务属性配置如下：\n[中文名称] 最大功率\n[英文名称] Maximum power\n[英文缩写] MaxP\n[标准目录] tst\n[车系/车型]宝马x型/x5；宝马x型/x3；宝马x型/x1M35Li",
      "expected": "【技术属性】配置完成"
    },
    {
      "action": "技术属性配置如下：\n[数据类型] 数值型\n[数据长度] <=5\n[数据精度] 4/3\n[是否允许空值] 否\n[是否允许重复] 是\n[默认值] 不作填写\n[初始值] 不作填写\n[无效值] 500\n[精度倍数] 1.1\n[偏移量] 20",
      "expected": "【技术属性】配置完成"
    },
    {
      "action": "点击【车型】选择框，将【车型】属性改为车型2",
      "expected": "数据更改成功，【技术属性】版块更新，【是否复制属性】变更为【是否将 车型1 属性粘贴到 车型2 ？】且后置确认按钮，其他内容清空"
    },
    {
      "action": "填写部分内容后，将【车型】属性改为车型1",
      "expected": "【技术属性】中的数据对应切换"
    },
    {
      "action": "点击【保存】按钮",
      "expected": "弹出提示\"数据标准保存成功\"，返回【标准定义】页面"
    },
    {
      "action": "找到【测试】标准，点击编辑",
      "expected": "进入【编辑标准】配置页面"
    },
    {
      "action": "点击【技术属性】下的【车系/车型】进行切换",
      "expected": "可根据车型车系查看不同技术属性"
    }
  ]
} as const;

test.describe("验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「新建标准」，「技术属性」-「车型/车系」切换后，「技术属性」中的数据对应切换", () => {
  test("C1348 验证【「数据标准」-「标准定义」字段调整】「标准管理」-「标准定义」-「新建标准」，「技术属性」-「车型/车系」切换后，「技术属性」中的数据对应切换", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
