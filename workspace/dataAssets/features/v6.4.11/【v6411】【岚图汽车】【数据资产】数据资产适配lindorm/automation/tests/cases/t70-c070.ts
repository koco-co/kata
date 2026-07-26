// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C070",
  "title": "验证【操作记录】功能正确",
  "steps": [
    {
      "action": "离线任务运行以下SQL：\nCREATE TABLE page_view(viewTime INT, userid BIGINT,\n     page_url STRING, referrer_url STRING,\n     ip STRING COMMENT 'IP Address of the User')\nCOMMENT 'This is the page view table'\nPARTITIONED BY(dt STRING, country STRING)\nSTORED AS ORC;\n\nINSERT INTO TABLE page_view PARTITION (dt,country) VALUES\n(1,100001,\"www.sports.com/dashboard\",\"www.sports.com\",\"\\${KATA_CASE_HOST}\",'2023-08-24',\"CN\"),\n(3,100003,\"www.uni.com/orders\",\"www.uni.com\",\"\\${KATA_CASE_HOST}\",'2023-08-24',\"USA\"),\n(1,100001,\"www.lanchu.com/review\",\"www.lanchu.com\",\"\\${KATA_CASE_HOST}\",'2023-08-23',\"CN\");",
      "expected": "page_view同步至资产"
    },
    {
      "action": "查看page_view的表详情页-操作记录",
      "expected": "操作记录新增一条DDL记录（CREATE TABLE），以及一条DML记录（INSERT）；"
    },
    {
      "action": "离线项目A中在项目B中创建表、插入表",
      "expected": "该表详情页操作记录正确"
    },
    {
      "action": "鼠标hover【操作记录】？符号",
      "expected": "记录每张表DDL/DML操作语句"
    },
    {
      "action": "“变更时间”选择xxx-xxx",
      "expected": "返回变更时间在预期范围内的所有操作记录"
    },
    {
      "action": "“操作人”选择XX",
      "expected": "返回所有操作人为XX 的操作记录"
    },
    {
      "action": "在“变更语句”中搜索“insert”",
      "expected": "返回结果中返回符合条件的insert操作记录"
    },
    {
      "action": "“语句类型”复选框查看",
      "expected": "下拉选项：DDL、DML"
    },
    {
      "action": "“语句类型”筛选：DML",
      "expected": "返回数据为DML操作记录"
    },
    {
      "action": "“语句类型”筛选：DDL",
      "expected": "返回数据为DDL操作记录"
    },
    {
      "action": "空白页校验",
      "expected": "展示“暂无数据”"
    }
  ]
} as const;

test.describe("验证【操作记录】功能正确", () => {
  test("C070 验证【操作记录】功能正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
