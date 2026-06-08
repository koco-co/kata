#!/usr/bin/env bun

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const featureDir = resolve(scriptDir, "..");
const archivePath = resolve(featureDir, "岚图已上线需求主流程用例.md");
const SchemaA = "${SchemaA}";

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceCase(markdown, oldTitle, nextBlock) {
  const pattern = new RegExp(
    `${escapeRegExp(oldTitle)}[\\s\\S]*?(?=\\n##### 【P[0-3]】|\\n### |\\n## |$)`,
  );
  if (!pattern.test(markdown)) {
    throw new Error(`case not found: ${oldTitle}`);
  }
  return markdown.replace(pattern, nextBlock.trimEnd());
}

function replaceCaseAny(markdown, titles, nextBlock) {
  for (const title of titles) {
    const pattern = new RegExp(
      `${escapeRegExp(title)}[\\s\\S]*?(?=\\n##### 【P[0-3]】|\\n### |\\n## |$)`,
    );
    if (pattern.test(markdown)) {
      return markdown.replace(pattern, nextBlock.trimEnd());
    }
  }
  throw new Error(`case not found: ${titles.join(" | ")}`);
}

const jsonFailCase = `##### 【P0】验证【有效性校验-字段级-格式-json格式校验】质量规则任务校验不通过

> 前置条件

\`\`\`sql
/*
1. 已引入 SparkThrift2.x 数据源，数据库 ${SchemaA}。
2. 已在【数据质量 → 通用配置 → json格式校验管理】中维护：
-- key路径：order-amount，中文名称：订单金额，value格式正则：^\\d+\\.\\d{2}$
-- key路径：order-status，中文名称：订单状态，value格式正则：^(pending|paid|cancelled)$
3. 执行以下 SparkThrift2.x 前置 SQL，准备同表正/异常分区数据。
*/

USE ${SchemaA};

DROP TABLE IF EXISTS dwd_voyah_dq_json_format_fail;

CREATE TABLE dwd_voyah_dq_json_format_fail (
  order_id STRING COMMENT '订单号',
  order_info STRING COMMENT '订单 JSON 字符串',
  remark STRING COMMENT '样本说明'
)
COMMENT '岚图格式-json格式校验不通过主流程测试表'
PARTITIONED BY (stat_date STRING COMMENT '分区字段，格式 yyyyMMdd')
STORED AS ORC;

INSERT INTO TABLE dwd_voyah_dq_json_format_fail PARTITION (stat_date='20260116')
VALUES
('ORD_JSON_PASS_001','{"order-amount":"100.00","order-status":"paid"}','positive row 1'),
('ORD_JSON_PASS_002','{"order-amount":"50.50","order-status":"pending"}','positive row 2');

INSERT INTO TABLE dwd_voyah_dq_json_format_fail PARTITION (stat_date='20260115')
VALUES
('ORD_JSON_FAIL_001','{"order-amount":"abc","order-status":"unknown"}','amount and status invalid'),
('ORD_JSON_FAIL_002','{"order-amount":"50.5","order-status":"cancelled"}','amount format invalid');

SELECT COUNT(1) AS json_value_format_fail_cnt
FROM dwd_voyah_dq_json_format_fail
WHERE stat_date='20260116'
  AND (order_info NOT RLIKE '"order-amount":"[0-9]+\\\\.[0-9]{2}"'
    OR order_info NOT RLIKE '"order-status":"(pending|paid|cancelled)"');
-- 预期结果：0

SELECT COUNT(1) AS json_value_format_fail_cnt
FROM dwd_voyah_dq_json_format_fail
WHERE stat_date='20260115'
  AND (order_info NOT RLIKE '"order-amount":"[0-9]+\\\\.[0-9]{2}"'
    OR order_info NOT RLIKE '"order-status":"(pending|paid|cancelled)"');
-- 预期结果：2
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】，点击「新建规则集」:<br>- 选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_json_format_fail<br>- 规则集描述: 有效性字段级 json value 格式校验<br>- 新增规则包名称: json格式校验规则包<br>点击「下一步」 | 1)规则集基础信息保存成功<br>2)规则包「json格式校验规则包」创建成功 |
| 2 | 选择规则包「json格式校验规则包」，新增「有效性校验」规则:<br>- 生效范围: 字段级<br>- 字段: order_info<br>- 统计函数: 格式-json格式校验<br>- 校验key: order-amount、order-status<br>- 过滤条件: 无<br>- 强弱规则: 强规则<br>- 规则描述: 校验订单金额和订单状态 value 格式<br>点击「保存」并保存规则集 | 1)规则保存成功<br>2)规则集详情中展示 order_info 的「格式-json格式校验」规则<br>3)规则描述回显为「校验订单金额和订单状态 value 格式」 |
| 3 | 进入【数据质量 → 规则任务管理】，点击「新建监控规则」:<br>- 规则名称: SparkThrift2.x+有效性校验+字段级+json格式不通过<br>- 选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_json_format_fail<br>- 选择已有分区: stat_date='20260116'<br>点击「下一步」 | 1)监控对象配置成功<br>2)进入「监控规则」页面 |
| 4 | 在「监控规则」中引用质量规则:<br>- 规则包: json格式校验规则包<br>- 规则类型: 有效性校验<br>点击「导入规则包」后点击「下一步」 | 1)规则包导入成功<br>2)页面展示从规则集导入的「格式-json格式校验」规则<br>3)进入「调度属性」页面 |
| 5 | 在「调度属性」中配置:<br>- 调度周期: 手动触发<br>- 规则拼接包: 1<br>- 实例生成方式: 立即生成<br>- 超时时间: 不限制<br>- 告警配置: 无<br>- 报告配置: 无需生成报告<br>点击「保存」，进入规则任务表详情抽屉后在「规则管理」区域点击「立即执行」 | 1)调度属性配置成功<br>2)规则任务保存成功<br>3)任务提交执行成功 |
| 6 | 进入【数据质量 → 校验结果查询】，使用「请输入表名/任务名称搜索」查询任务「SparkThrift2.x+有效性校验+字段级+json格式不通过」最新实例详情 | 1)最新实例为「校验通过」<br>2)order_info json value 格式不通过数为 0<br>3)明细仅统计 stat_date='20260116' 分区 |
| 7 | 进入【数据质量 → 规则任务管理】，编辑规则任务「SparkThrift2.x+有效性校验+字段级+json格式不通过」，仅变更选择分区:<br>- stat_date='20260116' -> stat_date='20260115'<br>保存后再次在详情抽屉「规则管理」区域点击「立即执行」 | 1)规则集和规则包内容未改动<br>2)任务分区保存成功<br>3)任务提交执行成功 |
| 8 | 进入【数据质量 → 校验结果查询】，使用「请输入表名/任务名称搜索」查询该任务最新实例详情 | 1)最新实例为「校验不通过」<br>2)order_info json value 格式不通过数为 2<br>3)不通过明细包含 order_id=ORD_JSON_FAIL_001、ORD_JSON_FAIL_002<br>4)明细仅统计 stat_date='20260115' 分区 |
`;

const jsonPassCase = `##### 【P0】验证【有效性校验-字段级-格式-json格式校验】质量规则任务校验通过

> 前置条件

\`\`\`sql
/*
1. 已引入 SparkThrift2.x 数据源，数据库 ${SchemaA}。
2. 已在【数据质量 → 通用配置 → json格式校验管理】中维护：
-- key路径：person-name，中文名称：人员姓名，value格式正则：^[\\u4e00-\\u9fa5]+$
-- key路径：person-age，中文名称：人员年龄，value格式正则：^\\d{1,3}$
3. 执行以下 SparkThrift2.x 前置 SQL，准备同表正/异常分区数据。
*/

USE ${SchemaA};

DROP TABLE IF EXISTS dwd_voyah_dq_json_format_pass;

CREATE TABLE dwd_voyah_dq_json_format_pass (
  user_id STRING COMMENT '用户标识',
  person_info STRING COMMENT '人员 JSON 字符串',
  remark STRING COMMENT '样本说明'
)
COMMENT '岚图格式-json格式校验通过主流程测试表'
PARTITIONED BY (stat_date STRING COMMENT '分区字段，格式 yyyyMMdd')
STORED AS ORC;

INSERT INTO TABLE dwd_voyah_dq_json_format_pass PARTITION (stat_date='20260115')
VALUES
('USER_JSON_FAIL_001','{"person-name":"Tom","person-age":"25"}','name format invalid'),
('USER_JSON_FAIL_002','{"person-name":"李四","person-age":"1000"}','age format invalid');

INSERT INTO TABLE dwd_voyah_dq_json_format_pass PARTITION (stat_date='20260116')
VALUES
('USER_JSON_PASS_001','{"person-name":"张三","person-age":"25"}','positive row 1'),
('USER_JSON_PASS_002','{"person-name":"李四","person-age":"30"}','positive row 2');

SELECT COUNT(1) AS json_value_format_fail_cnt
FROM dwd_voyah_dq_json_format_pass
WHERE stat_date='20260115'
  AND (person_info NOT RLIKE '"person-name":"[\\\\u4e00-\\\\u9fa5]+"'
    OR person_info NOT RLIKE '"person-age":"[0-9]{1,3}"');
-- 预期结果：2

SELECT COUNT(1) AS json_value_format_fail_cnt
FROM dwd_voyah_dq_json_format_pass
WHERE stat_date='20260116'
  AND (person_info NOT RLIKE '"person-name":"[\\\\u4e00-\\\\u9fa5]+"'
    OR person_info NOT RLIKE '"person-age":"[0-9]{1,3}"');
-- 预期结果：0
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】，点击「新建规则集」:<br>- 选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_json_format_pass<br>- 规则集描述: 有效性字段级人员 json value 格式校验<br>- 新增规则包名称: 人员json格式规则包<br>点击「下一步」 | 1)规则集基础信息保存成功<br>2)规则包「人员json格式规则包」创建成功 |
| 2 | 选择规则包「人员json格式规则包」，新增「有效性校验」规则:<br>- 生效范围: 字段级<br>- 字段: person_info<br>- 统计函数: 格式-json格式校验<br>- 校验key: person-name、person-age<br>- 过滤条件: 无<br>- 强弱规则: 强规则<br>- 规则描述: 校验人员姓名和人员年龄 value 格式<br>点击「保存」并保存规则集 | 1)规则保存成功<br>2)规则集详情中展示 person_info 的「格式-json格式校验」规则<br>3)规则描述回显为「校验人员姓名和人员年龄 value 格式」 |
| 3 | 进入【数据质量 → 规则任务管理】，点击「新建监控规则」:<br>- 规则名称: SparkThrift2.x+有效性校验+字段级+json格式通过<br>- 选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_json_format_pass<br>- 选择已有分区: stat_date='20260115'<br>点击「下一步」 | 1)监控对象配置成功<br>2)进入「监控规则」页面 |
| 4 | 在「监控规则」中引用质量规则:<br>- 规则包: 人员json格式规则包<br>- 规则类型: 有效性校验<br>点击「导入规则包」后点击「下一步」 | 1)规则包导入成功<br>2)页面展示从规则集导入的「格式-json格式校验」规则<br>3)进入「调度属性」页面 |
| 5 | 在「调度属性」中配置:<br>- 调度周期: 手动触发<br>- 规则拼接包: 1<br>- 实例生成方式: 立即生成<br>- 超时时间: 不限制<br>- 告警配置: 无<br>- 报告配置: 无需生成报告<br>点击「保存」，进入规则任务表详情抽屉后在「规则管理」区域点击「立即执行」 | 1)调度属性配置成功<br>2)规则任务保存成功<br>3)任务提交执行成功 |
| 6 | 进入【数据质量 → 校验结果查询】，使用「请输入表名/任务名称搜索」查询任务「SparkThrift2.x+有效性校验+字段级+json格式通过」最新实例详情 | 1)最新实例为「校验不通过」<br>2)person_info json value 格式不通过数为 2<br>3)明细仅统计 stat_date='20260115' 分区 |
| 7 | 进入【数据质量 → 规则任务管理】，编辑规则任务「SparkThrift2.x+有效性校验+字段级+json格式通过」，仅变更选择分区:<br>- stat_date='20260115' -> stat_date='20260116'<br>保存后再次在详情抽屉「规则管理」区域点击「立即执行」 | 1)规则集和规则包内容未改动<br>2)任务分区保存成功<br>3)任务提交执行成功 |
| 8 | 进入【数据质量 → 校验结果查询】，使用「请输入表名/任务名称搜索」查询该任务最新实例详情 | 1)最新实例为「校验通过」<br>2)person_info json value 格式不通过数为 0<br>3)操作列不显示「查看详情」链接<br>4)明细仅统计 stat_date='20260116' 分区 |
`;

const keyRangeCase = `##### 【P0】验证【完整性校验-字段级-key范围校验】质量规则任务校验正常

> 前置条件

\`\`\`sql
/*
1. 已引入 SparkThrift2.x 数据源，数据库 ${SchemaA}。
2. 已在【数据质量 → 通用配置 → json格式校验管理】中维护：
-- 第一层级：key1（姓名）、key2（年龄）
-- 第二层级：key11（省份）、key22（城市）
3. 执行以下 SparkThrift2.x 前置 SQL，准备同表正/异常分区数据。
*/

USE ${SchemaA};

DROP TABLE IF EXISTS dwd_voyah_dq_json_key_range;

CREATE TABLE dwd_voyah_dq_json_key_range (
  row_id STRING COMMENT '样本编号',
  info STRING COMMENT 'JSON 字符串',
  remark STRING COMMENT '样本说明'
)
COMMENT '岚图完整性字段级 key 范围校验主流程测试表'
PARTITIONED BY (stat_date STRING COMMENT '分区字段，格式 yyyyMMdd')
STORED AS ORC;

INSERT INTO TABLE dwd_voyah_dq_json_key_range PARTITION (stat_date='20260116')
VALUES
('KEY_RANGE_PASS_001','{"key1":"张三","key2":"25","key11":"广东","key22":"深圳"}','contains key1 and key2'),
('KEY_RANGE_PASS_002','{"key1":"李四","key2":"30","key11":"浙江","key22":"杭州"}','contains key1 and key2');

INSERT INTO TABLE dwd_voyah_dq_json_key_range PARTITION (stat_date='20260115')
VALUES
('KEY_RANGE_FAIL_001','{"key1":"王五","key11":"北京"}','missing key2'),
('KEY_RANGE_FAIL_002','{"key2":"35","key22":"上海"}','missing key1');

SELECT COUNT(1) AS missing_required_key_cnt
FROM dwd_voyah_dq_json_key_range
WHERE stat_date='20260116'
  AND (info NOT LIKE '%"key1"%' OR info NOT LIKE '%"key2"%');
-- 预期结果：0

SELECT COUNT(1) AS missing_required_key_cnt
FROM dwd_voyah_dq_json_key_range
WHERE stat_date='20260115'
  AND (info NOT LIKE '%"key1"%' OR info NOT LIKE '%"key2"%');
-- 预期结果：2
\`\`\`

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】，点击「新建规则集」:<br>- 选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_json_key_range<br>- 规则集描述: 完整性字段级 key 范围校验<br>- 新增规则包名称: key范围校验规则包<br>点击「下一步」 | 1)规则集基础信息保存成功<br>2)规则包「key范围校验规则包」创建成功 |
| 2 | 选择规则包「key范围校验规则包」，新增「完整性校验」规则:<br>- 生效范围: 字段级<br>- 字段: info<br>- 统计函数: key范围校验<br>- 校验方法: 包含<br>- 校验内容: key1、key2<br>- 过滤条件: 无<br>- 强弱规则: 强规则<br>- 规则描述: 校验 info 中必须同时包含 key1 和 key2<br>点击「保存」并保存规则集 | 1)规则保存成功<br>2)规则集详情中展示 info 的「key范围校验」规则<br>3)规则描述回显为「校验 info 中必须同时包含 key1 和 key2」 |
| 3 | 进入【数据质量 → 规则任务管理】，点击「新建监控规则」:<br>- 规则名称: SparkThrift2.x+完整性校验+字段级+key范围<br>- 选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_json_key_range<br>- 选择已有分区: stat_date='20260116'<br>点击「下一步」 | 1)监控对象配置成功<br>2)进入「监控规则」页面 |
| 4 | 在「监控规则」中引用质量规则:<br>- 规则包: key范围校验规则包<br>- 规则类型: 完整性校验<br>点击「导入规则包」后点击「下一步」 | 1)规则包导入成功<br>2)页面展示从规则集导入的「key范围校验」规则<br>3)进入「调度属性」页面 |
| 5 | 在「调度属性」中配置:<br>- 调度周期: 手动触发<br>- 规则拼接包: 1<br>- 实例生成方式: 立即生成<br>- 超时时间: 不限制<br>- 告警配置: 无<br>- 报告配置: 无需生成报告<br>点击「保存」，进入规则任务表详情抽屉后在「规则管理」区域点击「立即执行」 | 1)调度属性配置成功<br>2)规则任务保存成功<br>3)任务提交执行成功 |
| 6 | 进入【数据质量 → 校验结果查询】，使用「请输入表名/任务名称搜索」查询任务「SparkThrift2.x+完整性校验+字段级+key范围」最新实例详情 | 1)最新实例为「校验通过」<br>2)info 缺失必填 key 数为 0<br>3)明细仅统计 stat_date='20260116' 分区 |
| 7 | 进入【数据质量 → 规则任务管理】，编辑规则任务「SparkThrift2.x+完整性校验+字段级+key范围」，仅变更选择分区:<br>- stat_date='20260116' -> stat_date='20260115'<br>保存后再次在详情抽屉「规则管理」区域点击「立即执行」 | 1)规则集和规则包内容未改动<br>2)任务分区保存成功<br>3)任务提交执行成功 |
| 8 | 进入【数据质量 → 校验结果查询】，使用「请输入表名/任务名称搜索」查询该任务最新实例详情 | 1)最新实例为「校验不通过」<br>2)info 缺失必填 key 数为 2<br>3)不通过明细包含 row_id=KEY_RANGE_FAIL_001、KEY_RANGE_FAIL_002<br>4)明细仅统计 stat_date='20260115' 分区 |
`;

let markdown = readFileSync(archivePath, "utf8");
markdown = replaceCaseAny(
  markdown,
  [
    "##### 【P0】P0-主流程 验证格式-json格式校验校验不通过主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看失败明细",
    "##### 【P0】验证【有效性校验-字段级-格式-json格式校验】质量规则任务校验不通过",
  ],
  jsonFailCase,
);
markdown = replaceCaseAny(
  markdown,
  [
    "##### 【P0】P0-主流程 验证格式-json格式校验完整主流程：规则集配置+导入规则包+执行任务+在校验结果查询中查看通过实例",
    "##### 【P0】验证【有效性校验-字段级-格式-json格式校验】质量规则任务校验通过",
  ],
  jsonPassCase,
);
markdown = replaceCaseAny(
  markdown,
  [
    "##### 【P0】导入规则包-key范围校验 验证key范围校验完整：规则集配置+导入规则包+执行任务+在校验结果查询中查看实例结果",
    "##### 【P0】验证【完整性校验-字段级-key范围校验】质量规则任务校验正常",
  ],
  keyRangeCase,
);

writeFileSync(archivePath, markdown.endsWith("\n") ? markdown : `${markdown}\n`);
console.log(JSON.stringify({ archive: archivePath, rewrittenCases: 3 }));
