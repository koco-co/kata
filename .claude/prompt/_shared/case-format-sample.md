<!--
用例级节点格式 fewshot：仅供 case-draft / case-edit 参考用例内容写法，不作需求事实来源。
取材自 workspace/dataAssets/features/2099-01-lt-dq-main-flow/tmp/lt-dq-main-flow-sample.md。
⚠️ 本 fewshot 取材自岚图项目，其中的菜单/页面名（规则集管理、规则任务管理、校验结果查询、通用配置 等）是岚图定制文案，**仅供格式参照，禁止照抄到其它客户用例**。菜单/字段文案一律从目标环境 `sites/<host>/dom-*.md` 或用户截图取真实文案——标品（如浙商证券 zszq：概览/规则配置/任务查询/实时校验/项目管理）与岚图菜单结构本就不同，套岚图名即失真。

渲染格式（标题层级 ##### 【Pn】、前置条件代码块、步骤表格 | 编号 | 步骤 | 预期 |、
  frontmatter 字段、XMind topic 镜像与 priority marker）由 `kata archive-gen` 和
  `kata xmind-gen` 编码；不需手写格式框架，只需提供结构化内容。

以下内容规则不在 CLI 中，必须人工遵守：
- 标题三段式：验证动词 + 验证对象 + 验证场景
- 前置 SQL 顶部 /* ... */ 多行注释说明环境与目的；SELECT 末尾 -- 预期结果：N
- 占位符：数据库/Schema 用 ${SchemaA}，不得硬编码租户库名
- 业务括号：UI/字段用「」；优先级与业务对象用【】
- 步骤=单页面：不同页面动作拆成不同步骤行
- 步骤多子项用 `-` 列表项 + `<br>` 换行，别堆成单行密文（见下例 step 单元格）
- 多条预期必须用 `1) 2) N)` 编号 + `<br>` 换行，逐条独立可核对（见下例 expected 单元格）；只有单条预期可不编号
- 枚举值覆盖：需求/PRD 列出的多取值（数据源类型、状态、层级、value 格式等）要覆盖全部支持项——每个值至少 1 条用例或显式声明抽样范围，不得只取一个把覆盖缩窄
- 规则描述等描述字段必填，预期需验证保存+回显
- frontmatter 事实字段（suite_name/prd_id/prd_version）无证据必须 AskUserQuestion 索要，禁占位/默认值糊弄；字段→xmind 渲染映射见 ./case-format-sample.xmind.md
- 前置条件只写可核对的数据/环境状态（数据源、维表、已存在的具体记录等，如本例 SQL 块）。
  禁写「使用 admin 账号登录系统」——除非需求明确写了权限差异，否则一律不写登录账号；
  禁写「版本为 X 分支 / 客户平台版本」——开发分支、平台版本只进 metadata，不进前置条件、不进 xmind 根节点。
  禁写「数据资产平台与数据质量各服务已正常部署运行 / 系统已正常运行 / 环境已就绪 / 已启动 / 各服务正常」等系统级状态占位——这类断言不可核对、无测试数据，等于没写；前置必须落到具体数据源名、库/表、已存在记录 ID 或建表 SQL。
- UI 元素（列表提示文案、按钮态、tooltip、枚举值）逐字照截图/DOM/源码证据写，看不到证据先 AskUserQuestion，禁按常规交互脑补。
- 不抽「通用前置条件」公共块：每条用例前置自包含、可跨条重复（含本条数据源/库表准备与建表 SQL），禁把多条共用前提抽成顶部共享块。
- 措辞精确、忌举例式：前置与步骤禁用「如／像／例如／类似／等等」这类模糊或举例措辞；需列举具体内容的场景（规则集导入、批量数据准备），逐项列全——导入哪些规则包、各包含哪些规则。
- 数据源类型/版本写大版本形式（SparkThrift2.x、StarRocks 3.x、Doris3），不写补丁小版本（3.3.18）。
-->

---
suite_name: "<真实需求名，来自 ZenTao/用户，禁自创、禁加客户前缀>"
prd_id: <真实 ZenTao 需求 id，数字，禁编号>
prd_version: "<lanhu-prd 迭代版本，如 7.0.0，与 feature 目录版本一致；非开发分支版本 6.0_浙商证券>"
product_line: "<产品线名，固定，如 数据资产；决定 xmind 根节点产品线段，缺省回退 --project>"
description: "<一句话用例集描述>"
tags:
  - "<关键词>"
create_at: "<YYYY-MM-DD>"
status: "草稿 | 已评审"
case_count: <实际用例数，必须等于正文 ##### 条数>
# root_name: "<可选，仅用户显式要求覆盖 xmind 根节点标题时填>"
---

### 数据质量

#### 规则任务管理

##### 【P0】验证【完整性校验-字段级-空值数】质量规则任务校验正常

> 前置条件

```sql
/*
1. 已引入 SparkThrift2.x 数据源，数据库 ${SchemaA}。
2. 已在【数据质量 → 通用配置 → 报告关联维表设置】中为表 dwd_voyah_dq_vehicle_null_cnt 设置：
-- 车辆数统计字段：vehicle_count
-- 车系关联字段：car_series_code
-- 车型关联字段：car_model_code
-- 动力类型关联字段：power_type
3. 执行以下 SparkThrift2.x 前置 SQL，准备分区表和测试数据。
*/

USE ${SchemaA};

DROP TABLE IF EXISTS dwd_voyah_dq_vehicle_null_cnt;

CREATE TABLE dwd_voyah_dq_vehicle_null_cnt (
  order_id STRING COMMENT '销售订单号',
  vin STRING COMMENT '车辆识别代码',
  vehicle_count BIGINT COMMENT '车辆数统计字段',
  car_series_code STRING COMMENT '车系关联字段',
  car_series_name STRING COMMENT '车系名称',
  car_model_code STRING COMMENT '车型关联字段',
  car_model_name STRING COMMENT '车型名称，用于空值数校验',
  power_type STRING COMMENT '动力类型关联字段',
  final_price DECIMAL(20,2) COMMENT '最终成交价',
  delivery_center STRING COMMENT '交付中心'
)
COMMENT '岚图车辆质量规则字段级空值数测试表'
PARTITIONED BY (stat_date STRING COMMENT '分区字段，格式 yyyyMMdd')
STORED AS ORC;

INSERT INTO TABLE dwd_voyah_dq_vehicle_null_cnt PARTITION (stat_date='20260115')
VALUES
('ORD_NULL_001','LTV_FREE_001',1,'FREE','岚图FREE','FREE_STD','岚图FREE 标准版','REEV',261900.00,'武汉交付中心'),
('ORD_NULL_002','LTV_DREAM_002',1,'DREAM','岚图梦想家','DREAM_LONG','岚图梦想家 长续航版','PHEV',365000.00,'杭州交付中心'),
('ORD_NULL_003','LTV_PASSION_003',1,'PASSION','岚图追光','PASSION_STD',NULL,'EV',252800.00,'深圳交付中心'),
('ORD_NULL_004','LTV_FREE_004',1,'FREE','岚图FREE','FREE_LONG','岚图FREE 长续航版','REEV',260000.00,'成都交付中心');

INSERT INTO TABLE dwd_voyah_dq_vehicle_null_cnt PARTITION (stat_date='20260116')
VALUES
('ORD_NULL_005','LTV_FREE_005',1,'FREE','岚图FREE','FREE_STD','岚图FREE 标准版','REEV',262000.00,'上海交付中心');

SELECT COUNT(1) AS car_model_name_null_cnt
FROM dwd_voyah_dq_vehicle_null_cnt
WHERE stat_date='20260115' AND car_model_name IS NULL;
-- 预期结果：1

SELECT COUNT(1) AS car_model_name_null_cnt
FROM dwd_voyah_dq_vehicle_null_cnt
WHERE stat_date='20260116' AND car_model_name IS NULL;
-- 预期结果：0
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则集管理】, 点击「新建规则集」:<br>- 选择数据源: SparkThrift2.x<br>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_vehicle_null_cnt<br>- 规则集描述: 完整性字段级空值数校验<br>- 新增规则包名称: 字段空值数规则包<br>点击「下一步」 | 1)规则集基础信息保存成功<br>2)规则包创建成功 |
| 2 | 选择规则包(字段空值数规则包), 新增「完整性校验」规则:<br>- 生效范围: 字段级<br>- 字段: car_model_name<br>- 统计函数: 空值数<br>- 过滤条件: 无<br/>- 校验方法: 固定值<br>- 期望值: = 0<br>- 强弱规则: 强规则<br>- 规则描述: 校验指定分区内车型名称空值数为0<br/>点击「保存」并保存规则集 | 1)规则保存成功<br>2)规则集详情中展示 car_model_name 空值数规则<br>3)期望值为固定值 = 0<br>4)规则描述展示为「校验指定分区内车型名称空值数为0」 |
| 3 | 进入【数据质量 → 规则任务管理】, 点击「新建监控规则」:<br>- 规则名称: SparkThrift2.x+完整性校验+字段级+空值数<br>- 选择数据源: SparkThrift2.x<br/>- 选择数据库: ${SchemaA}<br>- 选择数据表: dwd_voyah_dq_vehicle_null_cnt<br>- 选择已有分区: stat_date='20260116'<br>点击「下一步」 | 1)监控对象配置成功<br>2)进入监控规则页面 |
| 4 | 在「监控规则」中引用质量规则:<br>- 规则包: 字段空值数规则包<br/>- 规则类型: 完整性校验<br/>点击「下一步」 | 1)监控规则配置成功<br/>2)进入调度属性页面 |
| 5 | 在「调度属性」中配置:<br/>1)调度配置:<br/>- 调度周期: 手动触发<br>- 规则拼接包: 1<br/>- 实例生成方式: 立即生成<br>- 超时时间: 不限制<br/>2)告警配置: 无<br/>3)报告配置: 无需生成报告<br/>点击保存, 进入规则任务${SchemaA}.dwd_voyah_dq_vehicle_null_cnt详情页, 点击「立即执行」 | 1)调度属性配置成功<br>2)规则任务保存成功<br>3)进入规则任务${SchemaA}.dwd_voyah_dq_vehicle_null_cnt详情页<br>4)任务提交执行成功 |
| 6 | 进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验+字段级+空值数)最新实例详情 | 1)最新实例为「校验通过」<br>2)car_model_name 空值数实际值为 0<br>3)期望值为 0<br>4)明细仅统计 stat_date='20260116' 分区 |
| 7 | 进入【数据质量 → 规则任务管理】, 编辑规则任务(SparkThrift2.x+完整性校验+字段级+空值数), 仅变更选择分区:<br>- 选择已有分区: stat_date='20260116' -> stat_date='20260115'<br>保存后再次点击「立即执行」 | 1)规则集和规则包内容未改动<br>2)任务分区保存成功<br>3)任务提交执行成功 |
| 8 | 进入【数据质量 → 校验结果查询】, 查询任务名称(SparkThrift2.x+完整性校验+字段级+空值数)最新实例详情 | 1)最新实例为「校验不通过」<br>2)car_model_name 空值数实际值为 1<br>3)期望值为 0<br>4)不通过明细包含 order_id=ORD_NULL_003<br>5)明细仅统计 stat_date='20260115' 分区 |
