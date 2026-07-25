---
suite_name: "Hotfix 用例 - 【数据资产】metadata服务突然cpu打高"
description: "验证 Bug #149480 修复效果"
keywords: "6.3 | 元数据管理 | | | 6.3 | 离线并发血缘解析时线程池参数配置不合理导致metadata服务cpu打满"
tags:
  - hotfix
  - bug-149480
create_at: "2026-06-11"
status: 草稿
origin: zentao
zentao_url: "http://zenpms.dtstack.cn/zentao/bug-view-149480.html"
---

## 数据资产

### 元数据管理

#### 血缘解析

##### 【149480】验证离线复杂SQL任务高并发触发血缘解析时metadata服务CPU使用率回落

> 前置条件

```sql
一、部署与监控
1. 已部署包含 hotfix_6.3.x_gate_149480 修复的定制化 metadata 服务包（修复工程 cus-metadata63），并重启 metadata 服务。
2. 已具备 metadata 服务进程 CPU 使用率的观察入口（EM 监控面板，或登录服务器用 top/htop 看该进程），并已知修复前同等压力下的 CPU 表现（修复前某些时段会打满，接近 100%）。
3. 本验证只针对离线 SQL 任务并发触发的血缘解析压力，与数据同步任务无关，无需配置任何同步任务。

二、接入计算源并准备库
4. 已在离线开发接入 Hadoop 计算源（引擎 DTHadoop 3.2.0），数据库选择一个测试用库（下面所有 SQL 直接使用裸表名）。

三、在该库一次性执行下列 14 张 ODS 源表的建表与造数 SQL（供后续复杂加工 SQL 解析血缘）

DROP TABLE IF EXISTS hotfix_149480_ods_user;
CREATE TABLE hotfix_149480_ods_user (user_id BIGINT, user_name STRING, gender STRING, level INT, reg_time STRING);
INSERT INTO hotfix_149480_ods_user VALUES
(1,'u1','M',3,'2026-01-01'),(2,'u2','F',2,'2026-01-02'),(3,'u3','M',1,'2026-01-03');

DROP TABLE IF EXISTS hotfix_149480_ods_user_ext;
CREATE TABLE hotfix_149480_ods_user_ext (user_id BIGINT, phone_area STRING, occupation STRING, credit_score INT);
INSERT INTO hotfix_149480_ods_user_ext VALUES
(1,'0571','engineer',720),(2,'025','teacher',680),(3,'020','doctor',750);

DROP TABLE IF EXISTS hotfix_149480_ods_region;
CREATE TABLE hotfix_149480_ods_region (region_id BIGINT, province STRING, city STRING);
INSERT INTO hotfix_149480_ods_region VALUES
(201,'浙江','杭州'),(202,'江苏','南京');

DROP TABLE IF EXISTS hotfix_149480_ods_store;
CREATE TABLE hotfix_149480_ods_store (store_id BIGINT, store_name STRING, region_id BIGINT, store_level STRING);
INSERT INTO hotfix_149480_ods_store VALUES
(301,'s1',201,'A'),(302,'s2',202,'B');

DROP TABLE IF EXISTS hotfix_149480_ods_category;
CREATE TABLE hotfix_149480_ods_category (category_id BIGINT, cat_name STRING, parent_id BIGINT);
INSERT INTO hotfix_149480_ods_category VALUES
(401,'电子',NULL),(402,'手机',401),(403,'电脑',401);

DROP TABLE IF EXISTS hotfix_149480_ods_brand;
CREATE TABLE hotfix_149480_ods_brand (brand_id BIGINT, brand_name STRING, country STRING);
INSERT INTO hotfix_149480_ods_brand VALUES
(501,'brandA','CN'),(502,'brandB','US');

DROP TABLE IF EXISTS hotfix_149480_ods_product;
CREATE TABLE hotfix_149480_ods_product (product_id BIGINT, product_name STRING, category_id BIGINT, brand_id BIGINT);
INSERT INTO hotfix_149480_ods_product VALUES
(601,'p1',402,501),(602,'p2',403,502);

DROP TABLE IF EXISTS hotfix_149480_ods_sku;
CREATE TABLE hotfix_149480_ods_sku (sku_id BIGINT, product_id BIGINT, sku_name STRING, cost_price DOUBLE);
INSERT INTO hotfix_149480_ods_sku VALUES
(701,601,'p1-黑',1500.0),(702,602,'p2-银',4500.0);

DROP TABLE IF EXISTS hotfix_149480_ods_coupon;
CREATE TABLE hotfix_149480_ods_coupon (coupon_id BIGINT, coupon_type STRING, discount_amt DOUBLE);
INSERT INTO hotfix_149480_ods_coupon VALUES
(801,'满减',100.0),(802,'折扣',50.0);

DROP TABLE IF EXISTS hotfix_149480_ods_order;
CREATE TABLE hotfix_149480_ods_order (order_id BIGINT, user_id BIGINT, store_id BIGINT, coupon_id BIGINT, total_amt DOUBLE, pay_amt DOUBLE, status STRING, order_time STRING);
INSERT INTO hotfix_149480_ods_order VALUES
(2001,1,301,801,1999.0,1899.0,'paid','2026-02-01 09:00:00'),
(2002,2,302,802,5998.0,5948.0,'paid','2026-02-05 10:00:00'),
(2003,3,301,NULL,1999.0,1999.0,'unpaid','2026-02-08 11:00:00');

DROP TABLE IF EXISTS hotfix_149480_ods_order_detail;
CREATE TABLE hotfix_149480_ods_order_detail (detail_id BIGINT, order_id BIGINT, sku_id BIGINT, qty INT, price DOUBLE, discount DOUBLE);
INSERT INTO hotfix_149480_ods_order_detail VALUES
(3001,2001,701,1,1999.0,100.0),
(3002,2002,702,1,4999.0,50.0),
(3003,2002,701,1,999.0,0.0),
(3004,2003,702,1,1999.0,0.0);

DROP TABLE IF EXISTS hotfix_149480_ods_pay;
CREATE TABLE hotfix_149480_ods_pay (pay_id BIGINT, order_id BIGINT, pay_type STRING, pay_amt DOUBLE, pay_time STRING);
INSERT INTO hotfix_149480_ods_pay VALUES
(9001,2001,'alipay',1899.0,'2026-02-01 09:05:00'),
(9002,2002,'wechat',5948.0,'2026-02-05 10:05:00');

DROP TABLE IF EXISTS hotfix_149480_ods_refund;
CREATE TABLE hotfix_149480_ods_refund (refund_id BIGINT, order_id BIGINT, refund_amt DOUBLE, refund_time STRING);
INSERT INTO hotfix_149480_ods_refund VALUES
(7001,2002,999.0,'2026-02-07 12:00:00');

DROP TABLE IF EXISTS hotfix_149480_ods_behavior_log;
CREATE TABLE hotfix_149480_ods_behavior_log (log_id BIGINT, user_id BIGINT, sku_id BIGINT, action STRING, log_time STRING);
INSERT INTO hotfix_149480_ods_behavior_log VALUES
(1,1,701,'view','2026-02-01 08:50:00'),
(2,1,701,'cart','2026-02-01 08:55:00'),
(3,2,702,'view','2026-02-05 09:50:00'),
(4,2,701,'cart','2026-02-05 09:52:00'),
(5,3,702,'view','2026-02-08 10:50:00');

四、新建以下 14 个离线 Spark SQL 周期任务（task01~task14），每个任务对应一段 SQL；SQL 相同的任务只标注「同 taskNN，仅改目标表名」，不再重复粘贴。

【task01】目标表 hotfix_149480_dwd_trade_detail_wide_01，SQL 如下（最复杂：单条 SQL 关联 13 张表 + 退款子查询 + 2 个窗口函数，血缘解析压力主要来自它）：
DROP TABLE IF EXISTS hotfix_149480_dwd_trade_detail_wide_01;
CREATE TABLE hotfix_149480_dwd_trade_detail_wide_01 AS
SELECT
  o.order_id, o.order_time, o.status,
  d.detail_id, d.qty, d.price, d.discount,
  (d.qty * d.price - d.discount)                       AS detail_amt,
  u.user_id, u.user_name, u.level, u.gender,
  ue.occupation, ue.credit_score,
  s.sku_id, s.sku_name, s.cost_price,
  p.product_id, p.product_name,
  c.category_id, c.cat_name, pc.cat_name               AS parent_cat_name,
  b.brand_id, b.brand_name, b.country                  AS brand_country,
  st.store_id, st.store_name, st.store_level,
  r.province, r.city                                   AS store_city,
  pay.pay_type, pay.pay_amt,
  cp.coupon_type, cp.discount_amt                       AS coupon_discount,
  rf.refund_amt,
  CASE WHEN rf.refund_amt IS NOT NULL THEN 1 ELSE 0 END AS is_refund,
  CASE WHEN rf.refund_amt IS NOT NULL THEN '退款'
       WHEN o.status = 'paid'        THEN '有效'
       ELSE '未支付' END                                AS trade_state,
  ROW_NUMBER() OVER (PARTITION BY u.user_id ORDER BY o.order_time)       AS user_order_seq,
  SUM(d.qty * d.price) OVER (PARTITION BY o.order_id)                    AS order_gmv
FROM hotfix_149480_ods_order o
JOIN      hotfix_149480_ods_order_detail d ON o.order_id   = d.order_id
JOIN      hotfix_149480_ods_sku          s ON d.sku_id     = s.sku_id
JOIN      hotfix_149480_ods_product      p ON s.product_id = p.product_id
JOIN      hotfix_149480_ods_category     c ON p.category_id = c.category_id
LEFT JOIN hotfix_149480_ods_category     pc ON c.parent_id = pc.category_id
JOIN      hotfix_149480_ods_brand        b ON p.brand_id   = b.brand_id
JOIN      hotfix_149480_ods_user         u ON o.user_id    = u.user_id
LEFT JOIN hotfix_149480_ods_user_ext     ue ON u.user_id   = ue.user_id
JOIN      hotfix_149480_ods_store        st ON o.store_id  = st.store_id
JOIN      hotfix_149480_ods_region       r ON st.region_id = r.region_id
LEFT JOIN hotfix_149480_ods_pay          pay ON o.order_id = pay.order_id
LEFT JOIN hotfix_149480_ods_coupon       cp ON o.coupon_id = cp.coupon_id
LEFT JOIN (
  SELECT order_id, SUM(refund_amt) AS refund_amt
  FROM hotfix_149480_ods_refund
  GROUP BY order_id
) rf ON o.order_id = rf.order_id;

【task02】SQL 同 task01，仅将目标表名（DROP / CREATE TABLE 两处）改为 hotfix_149480_dwd_trade_detail_wide_02。
【task03】SQL 同 task01，仅将目标表名改为 hotfix_149480_dwd_trade_detail_wide_03。
【task04】SQL 同 task01，仅将目标表名改为 hotfix_149480_dwd_trade_detail_wide_04。
【task05】SQL 同 task01，仅将目标表名改为 hotfix_149480_dwd_trade_detail_wide_05。
【task06】SQL 同 task01，仅将目标表名改为 hotfix_149480_dwd_trade_detail_wide_06。
【task07】SQL 同 task01，仅将目标表名改为 hotfix_149480_dwd_trade_detail_wide_07。
【task08】SQL 同 task01，仅将目标表名改为 hotfix_149480_dwd_trade_detail_wide_08。
【task09】SQL 同 task01，仅将目标表名改为 hotfix_149480_dwd_trade_detail_wide_09。
【task10】SQL 同 task01，仅将目标表名改为 hotfix_149480_dwd_trade_detail_wide_10。
   （task01~task10 是 10 个除目标表名外完全相同的复杂任务，用于步骤 2 的并发压力。）

【task11】SQL 同 task01，仅将目标表名改为 hotfix_149480_dwd_trade_detail_wide（无 _NN 后缀）。
   （task11 产出血缘长链的基础宽表，供 task12/task13 解析上游；与 task12~task14 一起用于步骤 4 的血缘正确性验证。）

【task12】目标表 hotfix_149480_dws_user_trade_summary，SQL 如下（多层 CTE + 行为日志聚合 + NTILE 窗口；上游是 task11 的宽表）：
DROP TABLE IF EXISTS hotfix_149480_dws_user_trade_summary;
CREATE TABLE hotfix_149480_dws_user_trade_summary AS
WITH trade AS (
  SELECT user_id, order_id, detail_amt, is_refund, brand_id, category_id, order_time
  FROM hotfix_149480_dwd_trade_detail_wide
),
beh AS (
  SELECT user_id,
         COUNT(CASE WHEN action = 'view' THEN 1 END) AS view_cnt,
         COUNT(CASE WHEN action = 'cart' THEN 1 END) AS cart_cnt
  FROM hotfix_149480_ods_behavior_log
  GROUP BY user_id
),
agg AS (
  SELECT user_id,
         COUNT(DISTINCT order_id)  AS order_cnt,
         SUM(detail_amt)           AS total_amt,
         SUM(is_refund)            AS refund_cnt,
         COUNT(DISTINCT brand_id)  AS brand_cnt,
         COUNT(DISTINCT category_id) AS cat_cnt,
         MAX(order_time)           AS last_order_time
  FROM trade
  GROUP BY user_id
)
SELECT a.user_id, a.order_cnt, a.total_amt, a.refund_cnt,
       a.brand_cnt, a.cat_cnt, a.last_order_time,
       COALESCE(b.view_cnt, 0) AS view_cnt,
       COALESCE(b.cart_cnt, 0) AS cart_cnt,
       u.level, u.gender,
       NTILE(4) OVER (ORDER BY a.total_amt DESC) AS amt_quartile
FROM agg a
JOIN      hotfix_149480_ods_user u ON a.user_id = u.user_id
LEFT JOIN beh b                    ON a.user_id = b.user_id;

【task13】目标表 hotfix_149480_dws_store_cat_summary，SQL 如下（基于 task11 宽表的多维聚合 + RANK 窗口）：
DROP TABLE IF EXISTS hotfix_149480_dws_store_cat_summary;
CREATE TABLE hotfix_149480_dws_store_cat_summary AS
SELECT
  w.store_id, w.store_name, w.parent_cat_name, w.brand_name,
  SUM(w.detail_amt)                                              AS sales_amt,
  SUM(CASE WHEN w.is_refund = 1 THEN w.detail_amt ELSE 0 END)    AS refund_amt,
  COUNT(DISTINCT w.user_id)                                      AS buyer_cnt,
  SUM(w.detail_amt) / NULLIF(COUNT(DISTINCT w.user_id), 0)       AS arpu,
  RANK() OVER (PARTITION BY w.parent_cat_name ORDER BY SUM(w.detail_amt) DESC) AS cat_rank
FROM hotfix_149480_dwd_trade_detail_wide w
WHERE w.trade_state = '有效'
GROUP BY w.store_id, w.store_name, w.parent_cat_name, w.brand_name;

【task14】目标表 hotfix_149480_ads_user_rfm，SQL 如下（基于 task12 的 RFM 模型：多层 CTE + NTILE + UNION ALL 汇总行；血缘链末端）：
DROP TABLE IF EXISTS hotfix_149480_ads_user_rfm;
CREATE TABLE hotfix_149480_ads_user_rfm AS
WITH base AS (
  SELECT user_id, total_amt, order_cnt, refund_cnt, last_order_time,
         datediff('2026-03-01', to_date(last_order_time)) AS recency_days
  FROM hotfix_149480_dws_user_trade_summary
),
scored AS (
  SELECT user_id, total_amt, order_cnt, recency_days,
         CASE WHEN recency_days <= 30 THEN 3 WHEN recency_days <= 60 THEN 2 ELSE 1 END AS r_score,
         CASE WHEN order_cnt >= 3 THEN 3 WHEN order_cnt = 2 THEN 2 ELSE 1 END          AS f_score,
         NTILE(3) OVER (ORDER BY total_amt) AS m_score
  FROM base
)
SELECT CAST(user_id AS BIGINT) AS user_id, total_amt, order_cnt, recency_days,
       r_score, f_score, m_score,
       (r_score * 100 + f_score * 10 + m_score) AS rfm_code,
       CASE WHEN r_score = 3 AND f_score >= 2 AND m_score >= 2 THEN '重要价值'
            WHEN r_score <= 1 AND f_score >= 2                 THEN '重要挽留'
            ELSE '一般' END                                     AS user_segment
FROM scored
UNION ALL
SELECT CAST(-1 AS BIGINT), SUM(total_amt), SUM(order_cnt), CAST(NULL AS INT),
       CAST(NULL AS INT), CAST(NULL AS INT), CAST(NULL AS INT), CAST(NULL AS INT), '汇总'
FROM base;
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| ---- | ---- | ---- |
| 1 | 在 metadata 服务进程的 CPU 观察入口（EM 监控或服务器 top）记录并发压测前的 CPU 基线，并确认已知修复前同等压力下的 CPU 表现作为对比。 | 记录到空闲期稳定的 CPU 基线，metadata 服务运行正常、无异常告警。 |
| 2 | 制造并发压力：将前置条件中 task01~task10 这 10 个任务（同一段 13 表复杂 SQL，仅目标表后缀 `_01`~`_10` 不同）的调度时间设为同一时刻（或手动同时立即运行），使 10 段复杂 SQL 在同一时段并发触发血缘解析。 | task01~task10 均正常进入运行并陆续执行成功，生成 `hotfix_149480_dwd_trade_detail_wide_01` ~ `_10`；无任务因 metadata 服务卡死而失败或长时间挂起。 |
| 3 | 在 10 个复杂任务并发执行的高峰时段持续观察 metadata 服务进程 CPU 使用率，与修复前同等压力下的表现对比。 | metadata 服务 CPU 使用率明显低于修复前同等压力水平，不再长时间打满（持续接近 100%）；并发高峰过后 CPU 能及时回落。 |
| 4 | 验证血缘解析正确性（长链路）：依次运行 **task11→task12→task13→task14**，跑通完整 ODS→DWD→DWS→ADS 链路；随后进入数据资产元数据/血缘页面，抽查血缘末端表 `hotfix_149480_ads_user_rfm` 与 DWS 表 `hotfix_149480_dws_store_cat_summary` 的血缘。 | `ads_user_rfm` 能逐级回溯到上游 `dws_user_trade_summary`→`dwd_trade_detail_wide`→14 张 `ods_*` 源表；`dws_store_cat_summary` 能回溯到 `dwd_trade_detail_wide` 及其全部 ODS 上游；血缘上下游完整、字段级/表级关系无缺失、无错连。 |
| 5 | 复测：再次同时运行 task01~task10 一轮，重复观察 CPU 使用率与服务稳定性。 | 复测结果与首轮一致，CPU 使用率稳定可控、无打满；metadata 服务无 OOM、无频繁 Full GC、无进程重启或 dump。 |
