// Generated from the canonical cases YAML; keep business steps in the YAML source.
import { test } from "@playwright/test";
import { runGeneratedCase } from "../../../../../../_shared/helpers/case-runner";

const CASE = {
  "id": "C003",
  "title": "验证「数据模型」规范设计与模型元素展示",
  "steps": [
    {
      "action": "进入「数据模型」-「规范设计」，查看展示",
      "expected": "默认展示ODS、DWD、DWS、ADS、DIM五种数仓层级"
    },
    {
      "action": "1）点击「新建数仓层级」按钮\n中文名称：测试一下\n英文名称：test1\n描述：新建数仓层级测试\n2）点击确定",
      "expected": "1）弹出新增数仓层级弹窗\n2）新建数仓层级成功"
    },
    {
      "action": "1）点击数仓层级的编辑按钮，修改\n中文名称：测试\n英文名称：test\n描述：新建数仓层级测试\n2）点击确定",
      "expected": "1）弹出编辑数仓层级弹窗，回填正确\n2）编辑成功"
    },
    {
      "action": "进入「数据模型」-「规范设计」-「模型元素」",
      "expected": "进入模型元素页面"
    },
    {
      "action": "在「模型元素」-“业务系统”列表，点击「添加元素值」\n中文名：测试\n英文名：CS\n点击对勾",
      "expected": "1）列表新增一行数据，中文名和英文名处为文本输入框\n2）保存成功"
    },
    {
      "action": "点击「测试」后的编辑按钮\n中文名：测试\n英文名：TEST\n点击对勾",
      "expected": "保存成功"
    },
    {
      "action": "点击「测试」后的添加按钮\n中文名：二级\n英文名：two",
      "expected": "1）模型元素「测试」下级新增一行数据，中文名和英文名处为文本输入框\n2）二级元素保存成功"
    },
    {
      "action": "点击「二级」后的删除按钮，二次确认删除",
      "expected": "删除成功"
    },
    {
      "action": "1）进入「规范设计」页面，点击数仓测试“测试”的规范设计\n2）选择“业务系统”“主题域”“自定义内容（固定项）”“更新方式（固定项）”\n3）点击确定",
      "expected": "保存成功"
    },
    {
      "action": "1）进入「规范建表」-「建表」-「建表配置」页面，查看展示\n2）对数据源类型进行勾选/取消勾选",
      "expected": "1）进入页面成功，展示所有数据源中心存在的建表支持的数据源类型\n2）勾选/取消勾选成功"
    },
    {
      "action": "1）进入「规范建表」-「建表」-「规范建表」页面\n2）查看写入数据源",
      "expected": "1）进入页面成功\n2）只展示「建表配置」页面已勾选的数据源类型的数据源"
    },
    {
      "action": "1）查看数仓层级\n2）选择数仓层级【测试】",
      "expected": "1）展示「规范设计」页面的所有数仓层级，包含步骤三中的数仓层级「测试」\n2）展示“业务系统”“主题域”“更新方式（固定项）”选择框"
    },
    {
      "action": "1）查看“业务系统”“主题域”“更新方式（固定项）”选择框内容\n2）选择“业务系统”“主题域”“更新方式（固定项）”，查看表名",
      "expected": "1）展示与「规范设计」-「模型元素」内容一致\n2）表名根据“业务系统”“主题域”“自定义”“更新方式（固定项）”的顺序拼接英文名，自定义位置为输入框"
    },
    {
      "action": "1）管理员用户进入「规范设计」-「建表」，点击「新建表」：\n写入数据源：doris数据源「DS_doris_A」\n写入数据库：「DB_doris_A」\n选择数仓层级、模型元素\n表名：自定义内容：「T_doris_A」\n中文名：doris表A\n数据模型类型：【主键表】\n生命周期：9999天\n2）点击下一步",
      "expected": "1）进入数据模型新建页面\n2）进入表结构页面"
    },
    {
      "action": "1）左侧解析输入框中输入：\n已存在的标准、不存在词根：邮箱\n不存在的标准、不存在词根：地址\n已存在的标准、词根：年龄\n不存在标准、存在的词根：编号\n不存在标准、不存在词根：姓名\n2）点击解析按钮",
      "expected": "右侧新增五行数据，\n1）只要存在标准，则展示标准的中文名、英文名以及对应的属性，所属标准为对应标准，中文名英文名不能修改。\n2）如果只存在词根，则展示词根的中文名、英文名，所属标准为空，中文名英文名可以修改。\n3）如果不存在词根和标准，则只回填中文名，英文名为空。中文名可以修改"
    },
    {
      "action": "点击字段的上移、下移、删除按钮",
      "expected": "功能正常"
    },
    {
      "action": "删除所有字段",
      "expected": "删除成功"
    },
    {
      "action": "新增字段，数据类型分别为：CHAR,VARCHAR,STRING,BOOLEAN,TINTINT,SMALLINT,INT,BIGINT,LARGEINT,DECIMAL,DATE,DATETIME",
      "expected": "添加成功"
    },
    {
      "action": "新增字段ID，勾选主键，分区字段，动态分区，分桶字段(分桶数1)，编辑动态分区配置：\nPROPERTIES (\n    \"dynamic_partition.enable\" = \"true\",\n    \"dynamic_partition.time_unit\" = \"DAY\",\n    \"dynamic_partition.start\" = \"-3\",\n    \"dynamic_partition.end\" = \"3\",\n    \"dynamic_partition.prefix\" = \"p\",\n    \"dynamic_partition.replication_num\" = \"1\"\n);",
      "expected": "新增成功"
    },
    {
      "action": "点击【生成建表语句】按钮，建表",
      "expected": "新增表成功，「数据模型」-「规范建表」列表新增一行数据，数据展示正确"
    },
    {
      "action": "点击表名",
      "expected": "进入「数据地图」-「表详情页」，展示数据正确"
    },
    {
      "action": "底层命令：show dynamic partition XXX;查看配置",
      "expected": "动态分区配置正确"
    },
    {
      "action": "1）在「规范建表」，点击编辑按钮，查看页面展示\n2）点击下一步，查看页面",
      "expected": "1）进入编辑页面，基础信息只有中文名和生命周期可以编辑，其他都不可编辑\n2）表结构页面原有字段置灰不可编辑，新增字段只支持设置中文名、字段名、数据类型、动态分区的PROPERTIES设置属性、非null；不支持设置主键、分桶信息。"
    },
    {
      "action": "新增字段，编辑动态分区的属性，点击生成建表语句-建表",
      "expected": "1）建表成功，新增字段正确，底层动态分区生效。\n2）表详情展示正确，"
    },
    {
      "action": "在「规范建表」，点击删除按钮\n选择删除元数据表、输入正确的表名，点击删除",
      "expected": "删除成功，资产平台上表不存在，底层表还存在"
    },
    {
      "action": "在「规范建表」，点击删除按钮\n选择删除源表、输入正确的表名，点击删除",
      "expected": "删除成功，资产平台和底层表都不存在"
    },
    {
      "action": "1）管理员用户进入「规范设计」-「建表」，点击「新建表」：\n写入数据源：doris数据源「DS_doris_A」\n写入数据库：「DB_doris_A」\n选择数仓层级、模型元素\n表名：自定义内容：「T_doris_B」\n中文名：doris表B\n数据模型类型：【聚合表】\n生命周期：9999天\n2）点击下一步",
      "expected": "1）进入数据模型新建页面\n2）进入表结构页面"
    },
    {
      "action": "新增字段id，然后新增字段数据类型分别为：CHAR,VARCHAR,STRING,BOOLEAN,TINTINT,SMALLINT,INT,BIGINT,LARGEINT,FLOAT,DOUBLE,DECIMAL,DATE,DATETIME,HLL,BITMAP,QUANTILE_STATE,AGG_STATE,IPv4,IPv6",
      "expected": "添加成功"
    },
    {
      "action": "1）同时勾选字段id的排序键和指标列\n2）只勾选指标列，查看展示",
      "expected": "1）不允许同时勾选\n2）展示聚合类型下拉框：SUM,REPLACE,MAX,MIN,PEPLACE_IF_NOT_NULL,HLL_UNION,BITMAP_UNION"
    },
    {
      "action": "1）字段id，勾给排序键、非null（默认值1），分区字段（列表分区）、分桶数3\n2）列表分区：log1:“log1_test1\",\"log1_test2”、log2:“log2_test1\",\"log2_test2”,\"log3_test2”,点击保存",
      "expected": "1）勾选成功\n2）列表分区保存成功"
    },
    {
      "action": "1)给三个数值型字段勾选指标列，选择SUM、MAX、MIN\n2)给两个字段分别勾选指标列，选择REPLACE、PEPLACE_IF_NOT_NULL\n3）给hill类型的字段，勾选指标列，选择HLL_UNION\n4）给BITMAP类型的字段，勾选指标列，选择BITMAP_UNION",
      "expected": "选择成功"
    },
    {
      "action": "1）点击【生成建表语句】按钮，建表\n2）点击表名",
      "expected": "1）新增表成功，「数据模型」-「规范建表」列表新增一行数据，数据展示正确\n2）进入「数据地图」-「表详情页」，展示数据正确"
    },
    {
      "action": "1）在「规范建表」，点击编辑按钮，查看页面展示\n2）点击下一步，查看页面",
      "expected": "1）进入编辑页面，基础信息只有中文名和生命周期可以编辑，其他都不可编辑\n2）表结构页面原有字段置灰不可编辑，新增字段只支持设置中文名、字段名、数据类型、指标列、聚合函数、非null；不支持设置排序键、分桶信息。"
    },
    {
      "action": "新增字段，点击生成建表语句-建表",
      "expected": "1）建表成功，新增字段正确\n2）表详情展示正确，"
    },
    {
      "action": "1）管理员用户进入「规范设计」-「建表」，点击「新建表」：\n写入数据源：doris数据源「DS_doris_A」\n写入数据库：「DB_doris_A」\n选择数仓层级、模型元素\n表名：自定义内容：「T_doris_C」\n中文名：doris表C\n数据模型类型：【明细表】\n生命周期：9999天\n2）点击下一步",
      "expected": "1）进入数据模型新建页面\n2）进入表结构页面"
    },
    {
      "action": "新增字段id，然后新增字段数据类型分别为：CHAR,VARCHAR,STRING,BOOLEAN,TINTINT,SMALLINT,INT,BIGINT,LARGEINT,FLOAT,DOUBLE,DECIMAL,DATE,DATETIME,ARRAY,MAP,STRUCT,JSON,VARIANT,HLL,BITMAP,QUANTILE_STATE,AGG_STATE,IPv4,IPv6",
      "expected": "添加成功"
    },
    {
      "action": "1）字段id，勾给排序键、非null（默认值1），分区字段（范围分区）、分桶数3\n2）查看范围分区\n3）添加分区名：log1:1、log2：2、log3：3",
      "expected": "1）勾选成功\n2）范围分区只有分区名和字段id两个列\n3）添加成功"
    },
    {
      "action": "1）新增字段name，勾选分区字段，重新编辑范围分区\n2）添加name的分区值：log1:1，张三、log2:2，李四、log3:3，王五",
      "expected": "1）新增字段name，原来已存在的分区中，name为空\n2）添加成功"
    },
    {
      "action": "1）点击【生成建表语句】按钮，建表\n2）点击表名",
      "expected": "1）新增表成功，「数据模型」-「规范建表」列表新增一行数据，数据展示正确\n2）进入「数据地图」-「表详情页」，展示数据正确"
    },
    {
      "action": "1）在「规范建表」，点击编辑按钮，查看页面展示\n2）点击下一步，查看页面",
      "expected": "1）进入编辑页面，基础信息只有中文名和生命周期可以编辑，其他都不可编辑\n2）表结构页面原有字段置灰不可编辑，新增字段只支持设置中文名、字段名、数据类型、非null；不支持设置排序键、分桶信息"
    },
    {
      "action": "新增字段，点击生成建表语句-建表",
      "expected": "1）建表成功，新增字段正确\n2）表详情展示正确，"
    },
    {
      "action": "1）管理员用户进入「规范设计」-「建表」，点击「新建表」：\n写入数据源：sparkthrift数据源「DS_sparkthrift_A」\n写入数据库：「DB_sparkthrift_A」\n选择数仓层级、模型元素\n表名：自定义内容：「T_sparkthrift_A」\n中文名：sparkthrift表A\n存储格式：parquet\n表类型：内部表：\nhdfs存储路径为空\n2）点击下一步",
      "expected": "1）进入数据模型新建页面\n2）进入表结构页面"
    },
    {
      "action": "进入建表流程-“表结构”步骤；\n选择“建表语句解析模式”；\n输入建表语句，进行解析：\nCREATE TABLE IF NOT EXISTS spark1(\n`busine_line_id` STRING COMMENT '业务线ID',\n`busine_line` INT COMMENT '业务线',\n`bu_id` STRING COMMENT '事业 部ID',\n`bu_name` STRING COMMENT '事业部',\n`busi_team` STRING COMMENT '隶属商务团队',\n`busi_team_date` STRING COMMENT '隶属时间',\n`load_dt` TIMESTAMP COMMENT '隶属时间'\n)\nCOMMENT 'dim维度表_新核心业务线'\nPARTITIONED BY (\n`data_dt` STRING COMMENT '数据时间',\n`is_save` INT COMMENT '数据是否保留：0-否，1-是'\n)\nSTORED AS PARQUET\nTBLPROPERTIES ('transactional'='true');",
      "expected": "每个字段解析正确；\n所属标准匹配成功；\n分区字段解析正确"
    },
    {
      "action": "点击【生成建表语句】，确认建表",
      "expected": "建表语句正确、建表成功"
    },
    {
      "action": "进入表详情页",
      "expected": "表详情展示正确"
    },
    {
      "action": "1）在「规范建表」，点击编辑按钮，查看页面展示\n2）点击下一步，查看页面",
      "expected": "1）进入编辑页面，基础信息只有中文名和生命周期可以编辑，其他都不可编辑\n2）表结构页面原有字段置灰不可编辑，新增字段只支持设置中文名、字段名、数据类型"
    },
    {
      "action": "新增字段，点击生成建表语句-建表",
      "expected": "1）建表成功，新增字段正确\n2）表详情展示正确，"
    },
    {
      "action": "数据开发用户进入「规范设计」-「建表」，点击「新建表」：\n写入数据源：sparkthrift数据源「DS_sparkthrift_A」\n写入数据库：「DB_sparkthrift_A」\n选择数仓层级、模型元素\n表名：自定义内容：「T_sparkthrift_B」\n中文名：sparkthrift表B\n存储格式：orc\n表类型：外部表：\nhdfs存储路径：为指定路径（非默认路径）\n2）点击下一步",
      "expected": "1）进入数据模型新建页面\n2）进入表结构页面"
    },
    {
      "action": "批量解析模式，输入字段中文名：编号、邮箱，已存在同名标准，点击解析",
      "expected": "绑定标准编号id、邮箱email"
    },
    {
      "action": "点击【生成建表语句】，确认建表",
      "expected": "提示已提交审批"
    },
    {
      "action": "1）管理员进入「公共管理」-「审批中心」-「待我审批」\n2）审批上述建表工单，如果审批拒绝\n3）审批上述建表工单，如果审批通过",
      "expected": "1）新增一条建表申请工单\n2）审批成功，未建表\n3）审批成功，建表成功"
    },
    {
      "action": "数据开发用户进入「数据资产」-「数据模型」-「规范建表」，点击数据模型的编辑按钮，新增一个字段，点击「生成建表语句」-「确认建表」",
      "expected": "已提交审批"
    },
    {
      "action": "1）管理员进入「公共管理」-「审批中心」-「待我审批」\n2）审批上述编辑工单，如果审批拒绝\n3）审批上述编辑工单，如果审批通过",
      "expected": "1）新增一条编辑申请工单\n2）审批成功，表结构未修改\n3）审批成功，编辑成功，表结构修改"
    },
    {
      "action": "数据开发用户进入「数据资产」-「数据模型」-「规范建表」，点击数据模型的删除按钮，删除元数据表",
      "expected": "已提交审批"
    },
    {
      "action": "1）管理员进入「公共管理」-「审批中心」-「待我审批」\n2）审批上述删除元数据工单，如果审批拒绝\n3）审批上述删除元数据工单，如果审批通过",
      "expected": "1）新增一条编辑申请工单\n2）审批成功，平台和底层表都未删除\n3）审批成功，平台表删除，底层表存在"
    },
    {
      "action": "数据开发用户进入「数据资产」-「数据模型」-「规范建表」，点击数据模型的删除按钮，删除源表",
      "expected": "已提交审批"
    },
    {
      "action": "1）管理员进入「公共管理」-「审批中心」-「待我审批」\n2）审批上述删除源表工单，如果审批拒绝\n3）审批上述删除源表工单，如果审批通过",
      "expected": "1）新增一条编辑申请工单\n2）审批成功，平台和底层表都未删除\n3）审批成功，平台和底层表都不存在"
    },
    {
      "action": "数据开发角色进入「数据资产」-「数据模型」-「审批与授权」-「我的模型页面」",
      "expected": "进入页面成功，展示已审批和待审批页面"
    },
    {
      "action": "查看待审批页面",
      "expected": "展示当前用户的建表、编辑模型、删除元数据表、删除源表的未审批工单，数据正确"
    },
    {
      "action": "查看已审批页面",
      "expected": "展示当前用户已审批完成的建表、编辑模型、删除元数据表、删除源表的工单，数据正确，审批结果正确"
    }
  ]
} as const;

test.describe("验证「数据模型」规范设计与模型元素展示", () => {
  test("C003 验证「数据模型」规范设计与模型元素展示", async ({ page }) => {
    await runGeneratedCase(page, CASE);
  });
});
