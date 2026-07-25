---
suite_name: "Hotfix 用例 - 【数据资产】离线开发任务中用到了上游依赖的表，资产血缘关系表的上游血缘关系没有展示出来"
description: "验证 Bug #151888 修复效果"
keywords: "5.2 | 数据资产 | Hive | DTHadoop | 5.2 | 离线SQL含参数变量时血缘解析不支持导致上游血缘断开未展示"
tags:
  - hotfix
  - bug-151888
create_at: "2026-06-11"
status: 草稿
origin: zentao
zentao_url: "http://zenpms.dtstack.cn/zentao/bug-view-151888.html"
---

## 数据资产

### 元数据

#### 元数据详情 - 血缘关系

##### 【151888】验证离线任务 SQL 含参数变量时下游表上游血缘完整展示

> 前置条件

```
1. 已部署包含 hotfix_5.2.x_152187 修复的包，并更新血缘解析相关插件与服务（元数据血缘服务、离线开发血缘同步服务）。
2. 已在产品页面接入测试数据源，引擎为 DTHadoop 2.0.0，数据库选择待测库 hotfix_151888_db（下文 SQL 直接使用裸表名，库通过页面数据源选择切换）。
3. 使用当前数据库执行以下 SQL，准备两张上游表与下游目标表（含历史分区数据），任务创建、提交与血缘查看在用例步骤中完成。建表前先 DROP，避免 Hive metastore 残留旧表（其 HDFS 目录已删）导致 CREATE 时报 FileNotFoundException：

DROP TABLE IF EXISTS ods_hr_staff_info_da;
DROP TABLE IF EXISTS ods_hr_dept_info_da;
DROP TABLE IF EXISTS dwd_hr_staff_base_info_da;
DROP TABLE IF EXISTS dwd_hr_staff_latest_da;

CREATE TABLE IF NOT EXISTS ods_hr_staff_info_da (
  staff_id BIGINT COMMENT '员工ID',
  staff_name STRING COMMENT '员工姓名',
  dept_code STRING COMMENT '部门编码'
)
PARTITIONED BY (ds STRING COMMENT '业务日期');

CREATE TABLE IF NOT EXISTS ods_hr_dept_info_da (
  dept_code STRING COMMENT '部门编码',
  dept_name STRING COMMENT '部门名称'
)
PARTITIONED BY (ds STRING COMMENT '业务日期');

CREATE TABLE IF NOT EXISTS dwd_hr_staff_base_info_da (
  staff_id BIGINT COMMENT '员工ID',
  staff_name STRING COMMENT '员工姓名',
  dept_code STRING COMMENT '部门编码',
  dept_name STRING COMMENT '部门名称'
)
PARTITIONED BY (ds STRING COMMENT '业务日期');

CREATE TABLE IF NOT EXISTS dwd_hr_staff_latest_da (
  staff_id BIGINT COMMENT '员工ID',
  staff_name STRING COMMENT '员工姓名',
  dept_code STRING COMMENT '部门编码',
  rn BIGINT COMMENT '部门内排名'
)
PARTITIONED BY (ds STRING COMMENT '业务日期');

INSERT OVERWRITE TABLE ods_hr_staff_info_da PARTITION (ds='20260527')
VALUES (1, '张三', 'D001');

INSERT OVERWRITE TABLE ods_hr_dept_info_da PARTITION (ds='20260527')
VALUES ('D001', '人力资源部');
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在「离线开发」新建一个 Hive/SQL 任务，任务 SQL 中使用调度参数变量（${...} 形式），读取两张上游表并写入下游表 dwd_hr_staff_base_info_da：<br><br>INSERT OVERWRITE TABLE dwd_hr_staff_base_info_da PARTITION (ds='${bdp.system.bizdate}')<br>SELECT s.staff_id, s.staff_name, s.dept_code, d.dept_name<br>FROM ods_hr_staff_info_da s<br>LEFT JOIN ods_hr_dept_info_da d ON s.dept_code = d.dept_code<br>WHERE s.ds = '${bdp.system.bizdate}'; | 任务保存成功，SQL 中的 ${bdp.system.bizdate} 参数变量被正常接受 |
| 2 | 将该离线任务提交到运维中心（任务可处于冻结/未周期调度状态，复现 bug 现场），等待元数据血缘解析 / 血缘同步完成 | 任务成功提交到运维中心；血缘解析任务正常完成，无解析报错 |
| 3 | 进入「数据资产」，搜索并打开下游表 dwd_hr_staff_base_info_da 的元数据详情页，切换到「血缘关系」Tab，血缘类型选择「表级血缘」 | 表详情页正常打开，「血缘关系」Tab 以 dwd_hr_staff_base_info_da 为中心节点正常渲染，无报错、无空白 |
| 4 | 查看 dwd_hr_staff_base_info_da 的上游血缘 | 上游节点 ods_hr_staff_info_da、ods_hr_dept_info_da 均完整展示，血缘连线指向当前表，不出现上游断开/缺失（修复前因 SQL 含 ${bdp.system.bizdate} 参数变量解析失败，上游血缘断开不展示） |
| 5 | 在表级血缘中右键中心节点，查看其全链路血缘 | 全链路向上游可正确展开两张 ods 上游表，链路不中断 |
| 6 | 血缘类型切换为「字段级血缘」，查看 dept_name 字段来源 | 字段级血缘可正确展示 dwd_hr_staff_base_info_da.dept_name 来源于 ods_hr_dept_info_da.dept_name，含参数变量的 SQL 字段血缘同样解析成功 |
| 7 | 进入「元数据 → 元数据质量 → 血缘分析」页面，以 dwd_hr_staff_base_info_da 为入口查看血缘 | 血缘分析页展示的上游血缘与表详情页一致，均能看到两张 ods 上游表，结果在两个入口保持一致 |
| 8 | 相邻回归：将任务 SQL 的参数变量替换为自定义调度参数（如 ${bizdate}）后重新提交并等待血缘解析，再次查看上游血缘 | 自定义参数变量场景下血缘解析仍成功，上游 ods 表完整展示，不因参数命名不同而再次断开 |
| 9 | 相邻回归（Hive WITH + 开窗函数 OVER）：在「离线开发」新建第二个 Hive/SQL 任务，使用 WITH（CTE）写法且 CTE 内包含开窗函数 OVER，读取 ods_hr_staff_info_da 写入 dwd_hr_staff_latest_da：<br><br>INSERT OVERWRITE TABLE dwd_hr_staff_latest_da PARTITION (ds='${bdp.system.bizdate}')<br>WITH ranked AS (<br>&nbsp;&nbsp;SELECT staff_id, staff_name, dept_code,<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;ROW_NUMBER() OVER (PARTITION BY dept_code ORDER BY staff_id DESC) AS rn<br>&nbsp;&nbsp;FROM ods_hr_staff_info_da<br>&nbsp;&nbsp;WHERE ds = '${bdp.system.bizdate}'<br>)<br>SELECT staff_id, staff_name, dept_code, rn FROM ranked WHERE rn = 1; | 任务保存并成功提交运维中心，血缘解析无报错 |
| 10 | 打开 dwd_hr_staff_latest_da 表的「血缘关系」Tab，查看表级与字段级上游血缘 | WITH（CTE）+ 开窗函数 OVER 的 SQL 被正确解析：表级血缘展示上游表 ods_hr_staff_info_da 不断开；字段级血缘可追溯 dwd_hr_staff_latest_da.staff_id 等字段来源于 ods_hr_staff_info_da 对应字段，开窗派生字段 rn 不导致整条上游血缘丢失 |
