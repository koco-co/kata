// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0074",
  "title": "验证【热度统计】-内容展示正确",
  "steps": [
    {
      "action": "订阅数",
      "expected": "用户A订阅表A；\n用户B订阅表A；\n第二天查看表详情页-热度统计；\n用户A取消订阅表A；\n第二天查看表详情页-热度统计；"
    },
    {
      "action": "使用次数",
      "expected": "预期 2（内容较长，展开查看完整内容）\n查看表A详情页-热度统计\n离线任务A对表A进行创建（create）、插入（insert）、更新（alter）、查询（select），任务SQL如下：\nCREATE TABLE page_view(viewTime INT, userid BIGINT,\n     page_url STRING, referrer_url STRING,\n     ip STRING COMMENT 'IP Address of the User')\nCOMMENT 'This is the..."
    },
    {
      "action": "查看次数",
      "expected": "查看表A详情页-热度统计\n数据地图中进入表A详情页二次；\n第二天查看表详情页-热度统计；\nhover“查看次数”"
    },
    {
      "action": "影响表数",
      "expected": "在表A详情页，手动添加影响表，手动添加的血缘关系如下：\n\t1）表A->表B\n\t2）表A->表C->表D-表E->表F\n\t3）表A-->表C->表D->表G\n第二天查看表详情页-热度统计；\n删除表A与表E、表F的血缘关系；\n第二天查看表详情页-热度统计；\n离线任务A1生成表A1的血缘关系：\n\t1）表A1->任务A1->表B1\n\t2）表A1->任务A1->表C1->表D1-表E1->表F1\n\t3）表A1-->表C1->表D1->表G1\n第二天查看表详情页-热度统计；"
    },
    {
      "action": "数据价值排行-查看次数/使用次数只统计最近7天数据",
      "expected": "位置：资产盘点-数据价值排行"
    },
    {
      "action": "再次点击表详情页右侧【热度统计】栏",
      "expected": "侧边栏收起"
    }
  ]
} as const;

test.describe("验证【热度统计】-内容展示正确", () => {
  test("C0074 验证【热度统计】-内容展示正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
