// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C0392",
  "title": "验证「数据权限分配」-筛选配置交互逻辑正确",
  "steps": [
    {
      "action": "「权限范围选择」选择数据表如下：\n数据库：schema1，数据表：全部",
      "expected": "「行列权限配置」“数据库”，“数据表”可选项逻辑如下：\n1）“数据库”可选项为：schema1且默认选中；\n2）“数据库”选择“schema1”后，“数据表”可选项为schema1下所有表；"
    },
    {
      "action": "「权限范围选择」选择数据表如下：\n数据库：schema1，数据表：s1_table1",
      "expected": "「行列权限配置」“数据库”，“数据表”可选项逻辑如下：\n1）“数据库”可选项为：schema1且默认选中；\n2）“数据表”可选项为：s1_table1且默认选中；"
    },
    {
      "action": "「权限范围选择」选择数据表如下：\n数据库：schema1，数据表：s1_table1、s1_table2、s1_table3\n数据库：schema2，数据表：s2_table1",
      "expected": "「行列权限配置」“数据库”，“数据表”可选项逻辑如下：\n1）“数据库”可选项为：schema1、schema2；\n2）“数据库”选择“schema1”后，“数据表”可选项为s1_table1、s1_table2、s1_table3；\n3）“数据库”选择“schema2”后，“数据表”可选项为s2_table1；"
    },
    {
      "action": "「权限范围选择」选择数据表如下：\n数据库：schema1，数据表：s1_table1、s1_table2、s1_table3\n数据库：schema2，数据表：s2_table1\n数据库：schema1，数据表：s1_table1、s1_table2、s1_table3、s1_table4",
      "expected": "「行列权限配置」“数据库”，“数据表”可选项逻辑如下：\n1）“数据库”可选项为：schema1、schema2；\n2）“数据库”选择“schema1”后，“数据表”可选项为s1_table1、s1_table2、s1_table3、s1_table4；\n3）“数据库”选择“schema2”后，“数据表”可选项为s2_table1；"
    },
    {
      "action": "「权限范围选择」选择数据表如下：\n数据库：schema1，数据表：s1_table1、s1_table2、s1_table3\n数据库：schema2，数据表：s2_table1\n数据库：schema1，数据表：全部",
      "expected": "「行列权限配置」“数据库”，“数据表”可选项逻辑如下：\n1）“数据库”可选项为：schema1、schema2；\n2）“数据库”选择“schema1”后，“数据表”可选项为schema1下所有表；\n3）“数据库”选择“schema2”后，“数据表”可选项为s2_table1；"
    },
    {
      "action": "「权限范围选择」选择数据表如下：\n数据库：全部，数据表：全部",
      "expected": "「行列权限配置」“数据库”，“数据表”可选项逻辑如下：\n1）“数据库”可选项为：所选数据源下所有schema；\n2）“数据库”选择schema后，“数据表”可选项为所选schema下所有表；"
    }
  ]
} as const;

test.describe("验证「数据权限分配」-筛选配置交互逻辑正确", () => {
  test("C0392 验证「数据权限分配」-筛选配置交互逻辑正确", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
