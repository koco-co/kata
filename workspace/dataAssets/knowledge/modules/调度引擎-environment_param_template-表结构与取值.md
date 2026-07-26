---
title: 调度引擎 environment_param_template 表结构与取值
type: module
tags: [调度引擎, 环境参数, Spark, SQL, 落标检查]
status: verified
source: repos:customltem/dagschedulex mapper+sql种子; repos:customltem/dt-center-assets SparkSqlOperator
updated: 2026-07-26
---

# 调度引擎 environment_param_template 表

## 表结构(引擎库,非资产库)

- 列: id, task_type, task_name, task_version, app_type, params, gmt_create, gmt_modified, is_deleted。没有 job_type 列。
- 查询逻辑(EnvironmentParamTemplate-mapper.xml): `where task_type=#{taskType} and (app_type=-1 or app_type=#{appType}) and task_version is null(或匹配) and is_deleted=0 order by app_type desc`——app_type=-1 为全局默认模板,租户/产品级模板用各自 app_type 覆盖。

## 已核实取值

- task_type=0 即 SPARK_SQL(种子数据 task_name='SPARK_SQL',task_version 有 2.1/2.4/3.2/3.5 多行)。
- app_type=9 为数据资产(引擎 EModuleAppTypeMapping.DATAASSETS("dataAssets",9,...))。
- 资产后端取模板: SparkSqlOperator/HiveSqlOperator 调 taskParamApiClient.getTaskEnvironmentParam(version, EJobType.XX.getType(), AppType.ASSETS.getType())。
- 核查租户是否配置 Spark SQL 参数模板: `SELECT * FROM environment_param_template WHERE task_type=0 AND app_type IN (-1,9) AND is_deleted=0;`

## 踩坑

- 早期 hotfix 用例写过 `WHERE job_type=3 AND app_type=5`,列名与取值均无据,系编造;以本条目为准。
- EJobType/AppType 枚举定义在外部 maven 依赖 com.dtstack.dtcenter.common.enums,克隆的源码仓库里没有,数值以引擎种子 SQL 与 EModuleAppTypeMapping 交叉验证。
