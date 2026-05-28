---
suite_name: "数据资产v6.3回归"
root_name: "数据资产v6.3回归"
description: "2026年05月数据资产v6.3标品主流程回归测试用例，覆盖规则集、单表规则、多表比对、任务实例查询、质量报告、项目信息和脏数据管理"
tags:
  - "数据资产"
  - "v6.3"
  - "标品"
  - "回归"
  - "数据质量"
create_at: "2026-05-07"
status: "草稿"
case_count: 20
prd_version: "v6.3"
---

## 通用前置条件

> 环境与数据
- 使用回归计划中的标品环境登录，租户为 hadoop2，质量项目使用当前会话默认项目 test_007，SparkThrift schema 使用 pw_test。
- 已在数据资产中引入 SparkThrift 数据源，并完成数据库 pw_test 下表 dq_test_user_info_300 的元数据同步。
- 主测试表直接使用已创建并已插入数据的 SparkThrift 表 dq_test_user_info_300，不在用例中重新建表或插数。
- dq_test_user_info_300 的数据口径使用回归计划准备数据：320 字段宽表、按 stat_date 分区；用例不假设固定行数，执行前通过 SparkThrift 统计 SQL 取得预期值。
- string 数字字段强转专项表 dq_test_string_cast_int 用于覆盖 string 类型强转 int 的规则回归；执行专项用例前需按下方 Spark SQL 建表、插数并同步元数据。
- 回归用例不保存真实 Cookie、Token、账号密码。

> 校验表 - Spark SQL

```sql
-- ============================================================
-- 数据质量规则测试表 - Spark SQL / Hive 版本（320 字段宽表）
-- 按 stat_date 分区，便于 1天/7天/月度 波动检测
-- 字段构成：23 个核心业务字段 + 297 个扩展字段
-- ============================================================
DROP TABLE IF EXISTS dq_test_user_info_300;
CREATE TABLE IF NOT EXISTS dq_test_user_info_300 (
    -- ============ 核心业务字段（23个）============
    id                BIGINT         COMMENT '主键ID',
    -- 字符串类（空值/空串、长度、重复性校验）
    user_code         STRING         COMMENT '用户编码（含NULL和空串）',
    user_name         STRING         COMMENT '用户姓名',
    nick_name         STRING         COMMENT '昵称（高重复率）',
    -- 格式类（身份证、手机号、邮箱格式校验）
    id_card_no        STRING         COMMENT '身份证号（18位）',
    mobile_no         STRING         COMMENT '手机号（11位）',
    email             STRING         COMMENT '邮箱',
    -- 枚举类
    gender            TINYINT        COMMENT '性别：0未知 1男 2女',
    user_type         STRING         COMMENT '用户类型：VIP/NORMAL/GUEST',
    status            STRING         COMMENT '状态：A/I/D',
    -- 整型数值（求和、求平均、范围、正负零值比）
    age               INT            COMMENT '年龄',
    score             INT            COMMENT '积分（含正负零）',
    -- 长整型
    balance_cent      BIGINT         COMMENT '余额（分）',
    -- 定点/浮点（精度校验）
    salary            DECIMAL(12,2)  COMMENT '薪资（精度2位）',
    discount_rate     DECIMAL(5,4)   COMMENT '折扣率（精度4位）',
    weight_kg         DOUBLE         COMMENT '体重',
    -- 日期时间
    birth_date        DATE           COMMENT '出生日期',
    register_time     TIMESTAMP      COMMENT '注册时间',
    last_login_time   TIMESTAMP      COMMENT '最后登录时间',
    -- 布尔标记
    is_active         TINYINT        COMMENT '是否激活：0/1',
    -- 长文本
    remark            STRING         COMMENT '备注',
    -- 系统字段
    create_time       TIMESTAMP      COMMENT '创建时间',
    update_time       TIMESTAMP      COMMENT '更新时间',
    -- ---- col_str (STRING) x 55 ----
    col_str_001       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #1',
    col_str_002       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #2',
    col_str_003       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #3',
    col_str_004       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #4',
    col_str_005       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #5',
    col_str_006       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #6',
    col_str_007       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #7',
    col_str_008       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #8',
    col_str_009       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #9',
    col_str_010       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #10',
    col_str_011       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #11',
    col_str_012       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #12',
    col_str_013       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #13',
    col_str_014       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #14',
    col_str_015       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #15',
    col_str_016       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #16',
    col_str_017       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #17',
    col_str_018       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #18',
    col_str_019       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #19',
    col_str_020       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #20',
    col_str_021       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #21',
    col_str_022       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #22',
    col_str_023       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #23',
    col_str_024       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #24',
    col_str_025       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #25',
    col_str_026       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #26',
    col_str_027       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #27',
    col_str_028       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #28',
    col_str_029       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #29',
    col_str_030       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #30',
    col_str_031       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #31',
    col_str_032       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #32',
    col_str_033       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #33',
    col_str_034       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #34',
    col_str_035       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #35',
    col_str_036       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #36',
    col_str_037       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #37',
    col_str_038       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #38',
    col_str_039       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #39',
    col_str_040       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #40',
    col_str_041       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #41',
    col_str_042       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #42',
    col_str_043       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #43',
    col_str_044       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #44',
    col_str_045       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #45',
    col_str_046       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #46',
    col_str_047       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #47',
    col_str_048       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #48',
    col_str_049       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #49',
    col_str_050       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #50',
    col_str_051       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #51',
    col_str_052       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #52',
    col_str_053       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #53',
    col_str_054       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #54',
    col_str_055       STRING         COMMENT '扩展字符串字段（空值/空串/长度/重复性校验） #55',
    -- ---- col_int (INT) x 45 ----
    col_int_001       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #1',
    col_int_002       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #2',
    col_int_003       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #3',
    col_int_004       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #4',
    col_int_005       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #5',
    col_int_006       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #6',
    col_int_007       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #7',
    col_int_008       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #8',
    col_int_009       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #9',
    col_int_010       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #10',
    col_int_011       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #11',
    col_int_012       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #12',
    col_int_013       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #13',
    col_int_014       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #14',
    col_int_015       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #15',
    col_int_016       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #16',
    col_int_017       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #17',
    col_int_018       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #18',
    col_int_019       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #19',
    col_int_020       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #20',
    col_int_021       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #21',
    col_int_022       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #22',
    col_int_023       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #23',
    col_int_024       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #24',
    col_int_025       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #25',
    col_int_026       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #26',
    col_int_027       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #27',
    col_int_028       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #28',
    col_int_029       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #29',
    col_int_030       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #30',
    col_int_031       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #31',
    col_int_032       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #32',
    col_int_033       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #33',
    col_int_034       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #34',
    col_int_035       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #35',
    col_int_036       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #36',
    col_int_037       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #37',
    col_int_038       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #38',
    col_int_039       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #39',
    col_int_040       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #40',
    col_int_041       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #41',
    col_int_042       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #42',
    col_int_043       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #43',
    col_int_044       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #44',
    col_int_045       INT            COMMENT '扩展整型字段（求和/求平均/范围/正负零值比） #45',
    -- ---- col_bigint (BIGINT) x 25 ----
    col_bigint_001    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #1',
    col_bigint_002    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #2',
    col_bigint_003    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #3',
    col_bigint_004    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #4',
    col_bigint_005    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #5',
    col_bigint_006    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #6',
    col_bigint_007    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #7',
    col_bigint_008    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #8',
    col_bigint_009    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #9',
    col_bigint_010    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #10',
    col_bigint_011    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #11',
    col_bigint_012    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #12',
    col_bigint_013    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #13',
    col_bigint_014    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #14',
    col_bigint_015    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #15',
    col_bigint_016    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #16',
    col_bigint_017    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #17',
    col_bigint_018    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #18',
    col_bigint_019    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #19',
    col_bigint_020    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #20',
    col_bigint_021    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #21',
    col_bigint_022    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #22',
    col_bigint_023    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #23',
    col_bigint_024    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #24',
    col_bigint_025    BIGINT         COMMENT '扩展长整型字段（求和/求平均） #25',
    -- ---- col_dec2 (DECIMAL(18,2)) x 30 ----
    col_dec2_001      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #1',
    col_dec2_002      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #2',
    col_dec2_003      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #3',
    col_dec2_004      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #4',
    col_dec2_005      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #5',
    col_dec2_006      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #6',
    col_dec2_007      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #7',
    col_dec2_008      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #8',
    col_dec2_009      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #9',
    col_dec2_010      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #10',
    col_dec2_011      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #11',
    col_dec2_012      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #12',
    col_dec2_013      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #13',
    col_dec2_014      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #14',
    col_dec2_015      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #15',
    col_dec2_016      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #16',
    col_dec2_017      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #17',
    col_dec2_018      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #18',
    col_dec2_019      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #19',
    col_dec2_020      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #20',
    col_dec2_021      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #21',
    col_dec2_022      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #22',
    col_dec2_023      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #23',
    col_dec2_024      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #24',
    col_dec2_025      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #25',
    col_dec2_026      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #26',
    col_dec2_027      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #27',
    col_dec2_028      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #28',
    col_dec2_029      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #29',
    col_dec2_030      DECIMAL(18,2)  COMMENT '扩展金额字段（精度2位，求和/求平均） #30',
    -- ---- col_dec4 (DECIMAL(10,4)) x 15 ----
    col_dec4_001      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #1',
    col_dec4_002      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #2',
    col_dec4_003      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #3',
    col_dec4_004      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #4',
    col_dec4_005      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #5',
    col_dec4_006      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #6',
    col_dec4_007      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #7',
    col_dec4_008      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #8',
    col_dec4_009      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #9',
    col_dec4_010      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #10',
    col_dec4_011      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #11',
    col_dec4_012      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #12',
    col_dec4_013      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #13',
    col_dec4_014      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #14',
    col_dec4_015      DECIMAL(10,4)  COMMENT '扩展比率字段（精度4位） #15',
    -- ---- col_dec6 (DECIMAL(20,6)) x 10 ----
    col_dec6_001      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #1',
    col_dec6_002      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #2',
    col_dec6_003      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #3',
    col_dec6_004      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #4',
    col_dec6_005      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #5',
    col_dec6_006      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #6',
    col_dec6_007      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #7',
    col_dec6_008      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #8',
    col_dec6_009      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #9',
    col_dec6_010      DECIMAL(20,6)  COMMENT '扩展高精度字段（精度6位） #10',
    -- ---- col_double (DOUBLE) x 20 ----
    col_double_001    DOUBLE         COMMENT '扩展双精度浮点字段 #1',
    col_double_002    DOUBLE         COMMENT '扩展双精度浮点字段 #2',
    col_double_003    DOUBLE         COMMENT '扩展双精度浮点字段 #3',
    col_double_004    DOUBLE         COMMENT '扩展双精度浮点字段 #4',
    col_double_005    DOUBLE         COMMENT '扩展双精度浮点字段 #5',
    col_double_006    DOUBLE         COMMENT '扩展双精度浮点字段 #6',
    col_double_007    DOUBLE         COMMENT '扩展双精度浮点字段 #7',
    col_double_008    DOUBLE         COMMENT '扩展双精度浮点字段 #8',
    col_double_009    DOUBLE         COMMENT '扩展双精度浮点字段 #9',
    col_double_010    DOUBLE         COMMENT '扩展双精度浮点字段 #10',
    col_double_011    DOUBLE         COMMENT '扩展双精度浮点字段 #11',
    col_double_012    DOUBLE         COMMENT '扩展双精度浮点字段 #12',
    col_double_013    DOUBLE         COMMENT '扩展双精度浮点字段 #13',
    col_double_014    DOUBLE         COMMENT '扩展双精度浮点字段 #14',
    col_double_015    DOUBLE         COMMENT '扩展双精度浮点字段 #15',
    col_double_016    DOUBLE         COMMENT '扩展双精度浮点字段 #16',
    col_double_017    DOUBLE         COMMENT '扩展双精度浮点字段 #17',
    col_double_018    DOUBLE         COMMENT '扩展双精度浮点字段 #18',
    col_double_019    DOUBLE         COMMENT '扩展双精度浮点字段 #19',
    col_double_020    DOUBLE         COMMENT '扩展双精度浮点字段 #20',
    -- ---- col_float (FLOAT) x 10 ----
    col_float_001     FLOAT          COMMENT '扩展单精度浮点字段 #1',
    col_float_002     FLOAT          COMMENT '扩展单精度浮点字段 #2',
    col_float_003     FLOAT          COMMENT '扩展单精度浮点字段 #3',
    col_float_004     FLOAT          COMMENT '扩展单精度浮点字段 #4',
    col_float_005     FLOAT          COMMENT '扩展单精度浮点字段 #5',
    col_float_006     FLOAT          COMMENT '扩展单精度浮点字段 #6',
    col_float_007     FLOAT          COMMENT '扩展单精度浮点字段 #7',
    col_float_008     FLOAT          COMMENT '扩展单精度浮点字段 #8',
    col_float_009     FLOAT          COMMENT '扩展单精度浮点字段 #9',
    col_float_010     FLOAT          COMMENT '扩展单精度浮点字段 #10',
    -- ---- col_tinyint (TINYINT) x 20 ----
    col_tinyint_001   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #1',
    col_tinyint_002   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #2',
    col_tinyint_003   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #3',
    col_tinyint_004   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #4',
    col_tinyint_005   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #5',
    col_tinyint_006   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #6',
    col_tinyint_007   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #7',
    col_tinyint_008   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #8',
    col_tinyint_009   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #9',
    col_tinyint_010   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #10',
    col_tinyint_011   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #11',
    col_tinyint_012   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #12',
    col_tinyint_013   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #13',
    col_tinyint_014   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #14',
    col_tinyint_015   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #15',
    col_tinyint_016   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #16',
    col_tinyint_017   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #17',
    col_tinyint_018   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #18',
    col_tinyint_019   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #19',
    col_tinyint_020   TINYINT        COMMENT '扩展枚举/标记字段（枚举范围/枚举个数） #20',
    -- ---- col_smallint (SMALLINT) x 10 ----
    col_smallint_001  SMALLINT       COMMENT '扩展短整型字段 #1',
    col_smallint_002  SMALLINT       COMMENT '扩展短整型字段 #2',
    col_smallint_003  SMALLINT       COMMENT '扩展短整型字段 #3',
    col_smallint_004  SMALLINT       COMMENT '扩展短整型字段 #4',
    col_smallint_005  SMALLINT       COMMENT '扩展短整型字段 #5',
    col_smallint_006  SMALLINT       COMMENT '扩展短整型字段 #6',
    col_smallint_007  SMALLINT       COMMENT '扩展短整型字段 #7',
    col_smallint_008  SMALLINT       COMMENT '扩展短整型字段 #8',
    col_smallint_009  SMALLINT       COMMENT '扩展短整型字段 #9',
    col_smallint_010  SMALLINT       COMMENT '扩展短整型字段 #10',
    -- ---- col_date (DATE) x 15 ----
    col_date_001      DATE           COMMENT '扩展日期字段 #1',
    col_date_002      DATE           COMMENT '扩展日期字段 #2',
    col_date_003      DATE           COMMENT '扩展日期字段 #3',
    col_date_004      DATE           COMMENT '扩展日期字段 #4',
    col_date_005      DATE           COMMENT '扩展日期字段 #5',
    col_date_006      DATE           COMMENT '扩展日期字段 #6',
    col_date_007      DATE           COMMENT '扩展日期字段 #7',
    col_date_008      DATE           COMMENT '扩展日期字段 #8',
    col_date_009      DATE           COMMENT '扩展日期字段 #9',
    col_date_010      DATE           COMMENT '扩展日期字段 #10',
    col_date_011      DATE           COMMENT '扩展日期字段 #11',
    col_date_012      DATE           COMMENT '扩展日期字段 #12',
    col_date_013      DATE           COMMENT '扩展日期字段 #13',
    col_date_014      DATE           COMMENT '扩展日期字段 #14',
    col_date_015      DATE           COMMENT '扩展日期字段 #15',
    -- ---- col_ts (TIMESTAMP) x 15 ----
    col_ts_001        TIMESTAMP      COMMENT '扩展时间戳字段 #1',
    col_ts_002        TIMESTAMP      COMMENT '扩展时间戳字段 #2',
    col_ts_003        TIMESTAMP      COMMENT '扩展时间戳字段 #3',
    col_ts_004        TIMESTAMP      COMMENT '扩展时间戳字段 #4',
    col_ts_005        TIMESTAMP      COMMENT '扩展时间戳字段 #5',
    col_ts_006        TIMESTAMP      COMMENT '扩展时间戳字段 #6',
    col_ts_007        TIMESTAMP      COMMENT '扩展时间戳字段 #7',
    col_ts_008        TIMESTAMP      COMMENT '扩展时间戳字段 #8',
    col_ts_009        TIMESTAMP      COMMENT '扩展时间戳字段 #9',
    col_ts_010        TIMESTAMP      COMMENT '扩展时间戳字段 #10',
    col_ts_011        TIMESTAMP      COMMENT '扩展时间戳字段 #11',
    col_ts_012        TIMESTAMP      COMMENT '扩展时间戳字段 #12',
    col_ts_013        TIMESTAMP      COMMENT '扩展时间戳字段 #13',
    col_ts_014        TIMESTAMP      COMMENT '扩展时间戳字段 #14',
    col_ts_015        TIMESTAMP      COMMENT '扩展时间戳字段 #15',
    -- ---- col_idcard (STRING) x 5 ----
    col_idcard_001    STRING         COMMENT '扩展身份证号字段（格式校验） #1',
    col_idcard_002    STRING         COMMENT '扩展身份证号字段（格式校验） #2',
    col_idcard_003    STRING         COMMENT '扩展身份证号字段（格式校验） #3',
    col_idcard_004    STRING         COMMENT '扩展身份证号字段（格式校验） #4',
    col_idcard_005    STRING         COMMENT '扩展身份证号字段（格式校验） #5',
    -- ---- col_mobile (STRING) x 5 ----
    col_mobile_001    STRING         COMMENT '扩展手机号字段（格式校验） #1',
    col_mobile_002    STRING         COMMENT '扩展手机号字段（格式校验） #2',
    col_mobile_003    STRING         COMMENT '扩展手机号字段（格式校验） #3',
    col_mobile_004    STRING         COMMENT '扩展手机号字段（格式校验） #4',
    col_mobile_005    STRING         COMMENT '扩展手机号字段（格式校验） #5',
    -- ---- col_email (STRING) x 5 ----
    col_email_001     STRING         COMMENT '扩展邮箱字段（格式校验） #1',
    col_email_002     STRING         COMMENT '扩展邮箱字段（格式校验） #2',
    col_email_003     STRING         COMMENT '扩展邮箱字段（格式校验） #3',
    col_email_004     STRING         COMMENT '扩展邮箱字段（格式校验） #4',
    col_email_005     STRING         COMMENT '扩展邮箱字段（格式校验） #5',
    -- ---- col_enum (STRING) x 12 ----
    col_enum_001      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #1',
    col_enum_002      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #2',
    col_enum_003      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #3',
    col_enum_004      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #4',
    col_enum_005      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #5',
    col_enum_006      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #6',
    col_enum_007      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #7',
    col_enum_008      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #8',
    col_enum_009      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #9',
    col_enum_010      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #10',
    col_enum_011      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #11',
    col_enum_012      STRING         COMMENT '扩展枚举值字段（枚举值/枚举个数校验） #12'
)
COMMENT '数据质量规则测试表（320字段宽表）'
PARTITIONED BY (stat_date STRING COMMENT '统计日期 yyyy-MM-dd')
STORED AS PARQUET
TBLPROPERTIES ('parquet.compression'='SNAPPY');


-- ============================================================
-- Spark SQL 320 字段宽表 INSERT 脚本
-- 数据规模：100 万行，按 stat_date 分布到最近 35 天
--
-- 数据特征：
--   - 核心 23 字段：保留原有埋雷分布（NULL/空串/格式错/越界/正负零）
--   - 扩展 297 字段：基于 HASH(id+列名) 衍生确定性伪随机值
--                   每个字段约 5% NULL，部分字段含格式错误/越界
--   - 不同字段的随机值独立，不会同涨同跌
--
-- 注意：执行前先关闭 ANSI 严格类型检查
-- ============================================================

-- SET spark.sql.storeAssignmentPolicy=LEGACY;
-- SET hive.exec.dynamic.partition=true;
-- SET hive.exec.dynamic.partition.mode=nonstrict;
-- SET hive.exec.max.dynamic.partitions=1000;
-- SET hive.exec.max.dynamic.partitions.pernode=1000;

INSERT OVERWRITE TABLE dq_test_user_info_300 PARTITION (stat_date)
SELECT
    id,

    -- 用户编码：5% NULL
    CASE WHEN rand_uc < 0.05 THEN NULL
         ELSE CONCAT('U', LPAD(CAST(id AS STRING), 10, '0'))
    END AS user_code,

    -- 姓名：3% 空串、2% NULL
    CASE WHEN rand_un < 0.03 THEN ''
         WHEN rand_un < 0.05 THEN NULL
         ELSE ELEMENT_AT(ARRAY('张三','李四','王五','赵六','钱七','孙八','周九','吴十','郑明','刘强'),
                         CAST(rand_un * 10 AS INT) + 1)
    END AS user_name,

    -- 昵称：高重复率
    ELEMENT_AT(ARRAY('cool_user','happy_cat','sky_walker','data_fan','code_monkey'),
               CAST(rand_nick * 5 AS INT) + 1) AS nick_name,

    -- 身份证：2% 错误、3% NULL
    CASE WHEN rand_idc < 0.02 THEN 'XYZ123'
         WHEN rand_idc < 0.05 THEN NULL
         ELSE CONCAT('1101011990', LPAD(CAST(rand_idc * 100000000 AS BIGINT), 8, '0'))
    END AS id_card_no,

    -- 手机号：2% 错误、2% NULL
    CASE WHEN rand_mob < 0.02 THEN '12345'
         WHEN rand_mob < 0.04 THEN NULL
         ELSE CONCAT('138', LPAD(CAST(rand_mob * 100000000 AS BIGINT), 8, '0'))
    END AS mobile_no,

    -- 邮箱：2% 错误、3% 空串、2% NULL
    CASE WHEN rand_em < 0.02 THEN 'invalid_email'
         WHEN rand_em < 0.05 THEN ''
         WHEN rand_em < 0.07 THEN NULL
         ELSE CONCAT('user', CAST(id AS STRING), '@example.com')
    END AS email,

    -- 性别：1% 越界值 9
    CASE WHEN rand_g < 0.01 THEN CAST(9 AS TINYINT)
         ELSE CAST(rand_g * 3 AS TINYINT)
    END AS gender,

    -- 用户类型：1% 越界
    CASE WHEN rand_ut < 0.01 THEN 'UNKNOWN'
         ELSE ELEMENT_AT(ARRAY('VIP','NORMAL','GUEST'), CAST(rand_ut * 3 AS INT) + 1)
    END AS user_type,

    -- 状态
    ELEMENT_AT(ARRAY('A','I','D'), CAST(rand_st * 3 AS INT) + 1) AS status,

    -- 年龄：0.5% 越界、5% NULL
    CASE WHEN rand_age < 0.003 THEN -5
         WHEN rand_age < 0.005 THEN 200
         WHEN rand_age < 0.05  THEN NULL
         ELSE CAST(18 + rand_age * 60 AS INT)
    END AS age,

    -- 积分：正/负/零分布
    CASE WHEN rand_sc < 0.2 THEN 0
         WHEN rand_sc < 0.4 THEN CAST(-1 * rand_sc * 1000 AS INT)
         ELSE CAST(rand_sc * 10000 AS INT)
    END AS score,

    -- 余额（分）
    CASE WHEN rand_bal < 0.1 THEN 0L
         WHEN rand_bal < 0.2 THEN CAST(-1 * rand_bal * 100000 AS BIGINT)
         ELSE CAST(rand_bal * 100000000 AS BIGINT)
    END AS balance_cent,

    -- 薪资
    CAST(ROUND(3000 + rand_sal * 50000, 2) AS DECIMAL(12,2)) AS salary,

    -- 折扣率（精度4位）
    CAST(ROUND(rand_disc, 4) AS DECIMAL(5,4)) AS discount_rate,

    -- 体重
    CAST(ROUND(40 + rand_w * 80, 2) AS DOUBLE) AS weight_kg,

    -- 出生日期
    CAST(DATE_SUB(DATE('2000-01-01'), CAST(rand_bd * 10000 AS INT)) AS DATE) AS birth_date,

    -- 注册时间
    CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2020-01-01 00:00:00') + CAST(rand_reg * 126144000 AS BIGINT)) AS TIMESTAMP) AS register_time,

    -- 最后登录时间
    CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(rand_log * 60000000 AS BIGINT)) AS TIMESTAMP) AS last_login_time,

    -- 是否激活
    CAST(IF(rand_act < 0.7, 1, 0) AS TINYINT) AS is_active,

    -- 备注：30% 空串 + 5% NULL
    CASE WHEN rand_rm < 0.05 THEN NULL
         WHEN rand_rm < 0.35 THEN ''
         ELSE CONCAT('remark_', CAST(id AS STRING))
    END AS remark,

    -- 系统时间
    CURRENT_TIMESTAMP() AS create_time,
    CURRENT_TIMESTAMP() AS update_time,

    -- ========== 扩展字段（297个）==========
    CASE WHEN s_col_str_001 < 50 THEN NULL WHEN s_col_str_001 >= 900 AND s_col_str_001 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_001, 50) AS STRING)) END AS col_str_001,
    CASE WHEN s_col_str_002 < 50 THEN NULL WHEN s_col_str_002 >= 900 AND s_col_str_002 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_002, 50) AS STRING)) END AS col_str_002,
    CASE WHEN s_col_str_003 < 50 THEN NULL WHEN s_col_str_003 >= 900 AND s_col_str_003 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_003, 50) AS STRING)) END AS col_str_003,
    CASE WHEN s_col_str_004 < 50 THEN NULL WHEN s_col_str_004 >= 900 AND s_col_str_004 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_004, 50) AS STRING)) END AS col_str_004,
    CASE WHEN s_col_str_005 < 50 THEN NULL WHEN s_col_str_005 >= 900 AND s_col_str_005 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_005, 50) AS STRING)) END AS col_str_005,
    CASE WHEN s_col_str_006 < 50 THEN NULL WHEN s_col_str_006 >= 900 AND s_col_str_006 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_006, 50) AS STRING)) END AS col_str_006,
    CASE WHEN s_col_str_007 < 50 THEN NULL WHEN s_col_str_007 >= 900 AND s_col_str_007 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_007, 50) AS STRING)) END AS col_str_007,
    CASE WHEN s_col_str_008 < 50 THEN NULL WHEN s_col_str_008 >= 900 AND s_col_str_008 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_008, 50) AS STRING)) END AS col_str_008,
    CASE WHEN s_col_str_009 < 50 THEN NULL WHEN s_col_str_009 >= 900 AND s_col_str_009 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_009, 50) AS STRING)) END AS col_str_009,
    CASE WHEN s_col_str_010 < 50 THEN NULL WHEN s_col_str_010 >= 900 AND s_col_str_010 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_010, 50) AS STRING)) END AS col_str_010,
    CASE WHEN s_col_str_011 < 50 THEN NULL WHEN s_col_str_011 >= 900 AND s_col_str_011 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_011, 50) AS STRING)) END AS col_str_011,
    CASE WHEN s_col_str_012 < 50 THEN NULL WHEN s_col_str_012 >= 900 AND s_col_str_012 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_012, 50) AS STRING)) END AS col_str_012,
    CASE WHEN s_col_str_013 < 50 THEN NULL WHEN s_col_str_013 >= 900 AND s_col_str_013 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_013, 50) AS STRING)) END AS col_str_013,
    CASE WHEN s_col_str_014 < 50 THEN NULL WHEN s_col_str_014 >= 900 AND s_col_str_014 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_014, 50) AS STRING)) END AS col_str_014,
    CASE WHEN s_col_str_015 < 50 THEN NULL WHEN s_col_str_015 >= 900 AND s_col_str_015 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_015, 50) AS STRING)) END AS col_str_015,
    CASE WHEN s_col_str_016 < 50 THEN NULL WHEN s_col_str_016 >= 900 AND s_col_str_016 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_016, 50) AS STRING)) END AS col_str_016,
    CASE WHEN s_col_str_017 < 50 THEN NULL WHEN s_col_str_017 >= 900 AND s_col_str_017 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_017, 50) AS STRING)) END AS col_str_017,
    CASE WHEN s_col_str_018 < 50 THEN NULL WHEN s_col_str_018 >= 900 AND s_col_str_018 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_018, 50) AS STRING)) END AS col_str_018,
    CASE WHEN s_col_str_019 < 50 THEN NULL WHEN s_col_str_019 >= 900 AND s_col_str_019 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_019, 50) AS STRING)) END AS col_str_019,
    CASE WHEN s_col_str_020 < 50 THEN NULL WHEN s_col_str_020 >= 900 AND s_col_str_020 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_020, 50) AS STRING)) END AS col_str_020,
    CASE WHEN s_col_str_021 < 50 THEN NULL WHEN s_col_str_021 >= 900 AND s_col_str_021 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_021, 50) AS STRING)) END AS col_str_021,
    CASE WHEN s_col_str_022 < 50 THEN NULL WHEN s_col_str_022 >= 900 AND s_col_str_022 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_022, 50) AS STRING)) END AS col_str_022,
    CASE WHEN s_col_str_023 < 50 THEN NULL WHEN s_col_str_023 >= 900 AND s_col_str_023 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_023, 50) AS STRING)) END AS col_str_023,
    CASE WHEN s_col_str_024 < 50 THEN NULL WHEN s_col_str_024 >= 900 AND s_col_str_024 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_024, 50) AS STRING)) END AS col_str_024,
    CASE WHEN s_col_str_025 < 50 THEN NULL WHEN s_col_str_025 >= 900 AND s_col_str_025 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_025, 50) AS STRING)) END AS col_str_025,
    CASE WHEN s_col_str_026 < 50 THEN NULL WHEN s_col_str_026 >= 900 AND s_col_str_026 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_026, 50) AS STRING)) END AS col_str_026,
    CASE WHEN s_col_str_027 < 50 THEN NULL WHEN s_col_str_027 >= 900 AND s_col_str_027 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_027, 50) AS STRING)) END AS col_str_027,
    CASE WHEN s_col_str_028 < 50 THEN NULL WHEN s_col_str_028 >= 900 AND s_col_str_028 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_028, 50) AS STRING)) END AS col_str_028,
    CASE WHEN s_col_str_029 < 50 THEN NULL WHEN s_col_str_029 >= 900 AND s_col_str_029 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_029, 50) AS STRING)) END AS col_str_029,
    CASE WHEN s_col_str_030 < 50 THEN NULL WHEN s_col_str_030 >= 900 AND s_col_str_030 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_030, 50) AS STRING)) END AS col_str_030,
    CASE WHEN s_col_str_031 < 50 THEN NULL WHEN s_col_str_031 >= 900 AND s_col_str_031 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_031, 50) AS STRING)) END AS col_str_031,
    CASE WHEN s_col_str_032 < 50 THEN NULL WHEN s_col_str_032 >= 900 AND s_col_str_032 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_032, 50) AS STRING)) END AS col_str_032,
    CASE WHEN s_col_str_033 < 50 THEN NULL WHEN s_col_str_033 >= 900 AND s_col_str_033 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_033, 50) AS STRING)) END AS col_str_033,
    CASE WHEN s_col_str_034 < 50 THEN NULL WHEN s_col_str_034 >= 900 AND s_col_str_034 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_034, 50) AS STRING)) END AS col_str_034,
    CASE WHEN s_col_str_035 < 50 THEN NULL WHEN s_col_str_035 >= 900 AND s_col_str_035 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_035, 50) AS STRING)) END AS col_str_035,
    CASE WHEN s_col_str_036 < 50 THEN NULL WHEN s_col_str_036 >= 900 AND s_col_str_036 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_036, 50) AS STRING)) END AS col_str_036,
    CASE WHEN s_col_str_037 < 50 THEN NULL WHEN s_col_str_037 >= 900 AND s_col_str_037 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_037, 50) AS STRING)) END AS col_str_037,
    CASE WHEN s_col_str_038 < 50 THEN NULL WHEN s_col_str_038 >= 900 AND s_col_str_038 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_038, 50) AS STRING)) END AS col_str_038,
    CASE WHEN s_col_str_039 < 50 THEN NULL WHEN s_col_str_039 >= 900 AND s_col_str_039 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_039, 50) AS STRING)) END AS col_str_039,
    CASE WHEN s_col_str_040 < 50 THEN NULL WHEN s_col_str_040 >= 900 AND s_col_str_040 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_040, 50) AS STRING)) END AS col_str_040,
    CASE WHEN s_col_str_041 < 50 THEN NULL WHEN s_col_str_041 >= 900 AND s_col_str_041 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_041, 50) AS STRING)) END AS col_str_041,
    CASE WHEN s_col_str_042 < 50 THEN NULL WHEN s_col_str_042 >= 900 AND s_col_str_042 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_042, 50) AS STRING)) END AS col_str_042,
    CASE WHEN s_col_str_043 < 50 THEN NULL WHEN s_col_str_043 >= 900 AND s_col_str_043 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_043, 50) AS STRING)) END AS col_str_043,
    CASE WHEN s_col_str_044 < 50 THEN NULL WHEN s_col_str_044 >= 900 AND s_col_str_044 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_044, 50) AS STRING)) END AS col_str_044,
    CASE WHEN s_col_str_045 < 50 THEN NULL WHEN s_col_str_045 >= 900 AND s_col_str_045 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_045, 50) AS STRING)) END AS col_str_045,
    CASE WHEN s_col_str_046 < 50 THEN NULL WHEN s_col_str_046 >= 900 AND s_col_str_046 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_046, 50) AS STRING)) END AS col_str_046,
    CASE WHEN s_col_str_047 < 50 THEN NULL WHEN s_col_str_047 >= 900 AND s_col_str_047 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_047, 50) AS STRING)) END AS col_str_047,
    CASE WHEN s_col_str_048 < 50 THEN NULL WHEN s_col_str_048 >= 900 AND s_col_str_048 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_048, 50) AS STRING)) END AS col_str_048,
    CASE WHEN s_col_str_049 < 50 THEN NULL WHEN s_col_str_049 >= 900 AND s_col_str_049 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_049, 50) AS STRING)) END AS col_str_049,
    CASE WHEN s_col_str_050 < 50 THEN NULL WHEN s_col_str_050 >= 900 AND s_col_str_050 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_050, 50) AS STRING)) END AS col_str_050,
    CASE WHEN s_col_str_051 < 50 THEN NULL WHEN s_col_str_051 >= 900 AND s_col_str_051 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_051, 50) AS STRING)) END AS col_str_051,
    CASE WHEN s_col_str_052 < 50 THEN NULL WHEN s_col_str_052 >= 900 AND s_col_str_052 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_052, 50) AS STRING)) END AS col_str_052,
    CASE WHEN s_col_str_053 < 50 THEN NULL WHEN s_col_str_053 >= 900 AND s_col_str_053 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_053, 50) AS STRING)) END AS col_str_053,
    CASE WHEN s_col_str_054 < 50 THEN NULL WHEN s_col_str_054 >= 900 AND s_col_str_054 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_054, 50) AS STRING)) END AS col_str_054,
    CASE WHEN s_col_str_055 < 50 THEN NULL WHEN s_col_str_055 >= 900 AND s_col_str_055 < 930 THEN '' ELSE CONCAT('val_', CAST(PMOD(s_col_str_055, 50) AS STRING)) END AS col_str_055,
    CASE WHEN s_col_int_001 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_001, 10) = 0 THEN 0 WHEN PMOD(s_col_int_001, 10) < 3 THEN CAST(-1 * s_col_int_001 AS INT) ELSE CAST(s_col_int_001 * 100 AS INT) END END AS col_int_001,
    CASE WHEN s_col_int_002 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_002, 10) = 0 THEN 0 WHEN PMOD(s_col_int_002, 10) < 3 THEN CAST(-1 * s_col_int_002 AS INT) ELSE CAST(s_col_int_002 * 100 AS INT) END END AS col_int_002,
    CASE WHEN s_col_int_003 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_003, 10) = 0 THEN 0 WHEN PMOD(s_col_int_003, 10) < 3 THEN CAST(-1 * s_col_int_003 AS INT) ELSE CAST(s_col_int_003 * 100 AS INT) END END AS col_int_003,
    CASE WHEN s_col_int_004 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_004, 10) = 0 THEN 0 WHEN PMOD(s_col_int_004, 10) < 3 THEN CAST(-1 * s_col_int_004 AS INT) ELSE CAST(s_col_int_004 * 100 AS INT) END END AS col_int_004,
    CASE WHEN s_col_int_005 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_005, 10) = 0 THEN 0 WHEN PMOD(s_col_int_005, 10) < 3 THEN CAST(-1 * s_col_int_005 AS INT) ELSE CAST(s_col_int_005 * 100 AS INT) END END AS col_int_005,
    CASE WHEN s_col_int_006 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_006, 10) = 0 THEN 0 WHEN PMOD(s_col_int_006, 10) < 3 THEN CAST(-1 * s_col_int_006 AS INT) ELSE CAST(s_col_int_006 * 100 AS INT) END END AS col_int_006,
    CASE WHEN s_col_int_007 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_007, 10) = 0 THEN 0 WHEN PMOD(s_col_int_007, 10) < 3 THEN CAST(-1 * s_col_int_007 AS INT) ELSE CAST(s_col_int_007 * 100 AS INT) END END AS col_int_007,
    CASE WHEN s_col_int_008 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_008, 10) = 0 THEN 0 WHEN PMOD(s_col_int_008, 10) < 3 THEN CAST(-1 * s_col_int_008 AS INT) ELSE CAST(s_col_int_008 * 100 AS INT) END END AS col_int_008,
    CASE WHEN s_col_int_009 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_009, 10) = 0 THEN 0 WHEN PMOD(s_col_int_009, 10) < 3 THEN CAST(-1 * s_col_int_009 AS INT) ELSE CAST(s_col_int_009 * 100 AS INT) END END AS col_int_009,
    CASE WHEN s_col_int_010 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_010, 10) = 0 THEN 0 WHEN PMOD(s_col_int_010, 10) < 3 THEN CAST(-1 * s_col_int_010 AS INT) ELSE CAST(s_col_int_010 * 100 AS INT) END END AS col_int_010,
    CASE WHEN s_col_int_011 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_011, 10) = 0 THEN 0 WHEN PMOD(s_col_int_011, 10) < 3 THEN CAST(-1 * s_col_int_011 AS INT) ELSE CAST(s_col_int_011 * 100 AS INT) END END AS col_int_011,
    CASE WHEN s_col_int_012 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_012, 10) = 0 THEN 0 WHEN PMOD(s_col_int_012, 10) < 3 THEN CAST(-1 * s_col_int_012 AS INT) ELSE CAST(s_col_int_012 * 100 AS INT) END END AS col_int_012,
    CASE WHEN s_col_int_013 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_013, 10) = 0 THEN 0 WHEN PMOD(s_col_int_013, 10) < 3 THEN CAST(-1 * s_col_int_013 AS INT) ELSE CAST(s_col_int_013 * 100 AS INT) END END AS col_int_013,
    CASE WHEN s_col_int_014 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_014, 10) = 0 THEN 0 WHEN PMOD(s_col_int_014, 10) < 3 THEN CAST(-1 * s_col_int_014 AS INT) ELSE CAST(s_col_int_014 * 100 AS INT) END END AS col_int_014,
    CASE WHEN s_col_int_015 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_015, 10) = 0 THEN 0 WHEN PMOD(s_col_int_015, 10) < 3 THEN CAST(-1 * s_col_int_015 AS INT) ELSE CAST(s_col_int_015 * 100 AS INT) END END AS col_int_015,
    CASE WHEN s_col_int_016 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_016, 10) = 0 THEN 0 WHEN PMOD(s_col_int_016, 10) < 3 THEN CAST(-1 * s_col_int_016 AS INT) ELSE CAST(s_col_int_016 * 100 AS INT) END END AS col_int_016,
    CASE WHEN s_col_int_017 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_017, 10) = 0 THEN 0 WHEN PMOD(s_col_int_017, 10) < 3 THEN CAST(-1 * s_col_int_017 AS INT) ELSE CAST(s_col_int_017 * 100 AS INT) END END AS col_int_017,
    CASE WHEN s_col_int_018 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_018, 10) = 0 THEN 0 WHEN PMOD(s_col_int_018, 10) < 3 THEN CAST(-1 * s_col_int_018 AS INT) ELSE CAST(s_col_int_018 * 100 AS INT) END END AS col_int_018,
    CASE WHEN s_col_int_019 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_019, 10) = 0 THEN 0 WHEN PMOD(s_col_int_019, 10) < 3 THEN CAST(-1 * s_col_int_019 AS INT) ELSE CAST(s_col_int_019 * 100 AS INT) END END AS col_int_019,
    CASE WHEN s_col_int_020 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_020, 10) = 0 THEN 0 WHEN PMOD(s_col_int_020, 10) < 3 THEN CAST(-1 * s_col_int_020 AS INT) ELSE CAST(s_col_int_020 * 100 AS INT) END END AS col_int_020,
    CASE WHEN s_col_int_021 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_021, 10) = 0 THEN 0 WHEN PMOD(s_col_int_021, 10) < 3 THEN CAST(-1 * s_col_int_021 AS INT) ELSE CAST(s_col_int_021 * 100 AS INT) END END AS col_int_021,
    CASE WHEN s_col_int_022 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_022, 10) = 0 THEN 0 WHEN PMOD(s_col_int_022, 10) < 3 THEN CAST(-1 * s_col_int_022 AS INT) ELSE CAST(s_col_int_022 * 100 AS INT) END END AS col_int_022,
    CASE WHEN s_col_int_023 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_023, 10) = 0 THEN 0 WHEN PMOD(s_col_int_023, 10) < 3 THEN CAST(-1 * s_col_int_023 AS INT) ELSE CAST(s_col_int_023 * 100 AS INT) END END AS col_int_023,
    CASE WHEN s_col_int_024 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_024, 10) = 0 THEN 0 WHEN PMOD(s_col_int_024, 10) < 3 THEN CAST(-1 * s_col_int_024 AS INT) ELSE CAST(s_col_int_024 * 100 AS INT) END END AS col_int_024,
    CASE WHEN s_col_int_025 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_025, 10) = 0 THEN 0 WHEN PMOD(s_col_int_025, 10) < 3 THEN CAST(-1 * s_col_int_025 AS INT) ELSE CAST(s_col_int_025 * 100 AS INT) END END AS col_int_025,
    CASE WHEN s_col_int_026 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_026, 10) = 0 THEN 0 WHEN PMOD(s_col_int_026, 10) < 3 THEN CAST(-1 * s_col_int_026 AS INT) ELSE CAST(s_col_int_026 * 100 AS INT) END END AS col_int_026,
    CASE WHEN s_col_int_027 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_027, 10) = 0 THEN 0 WHEN PMOD(s_col_int_027, 10) < 3 THEN CAST(-1 * s_col_int_027 AS INT) ELSE CAST(s_col_int_027 * 100 AS INT) END END AS col_int_027,
    CASE WHEN s_col_int_028 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_028, 10) = 0 THEN 0 WHEN PMOD(s_col_int_028, 10) < 3 THEN CAST(-1 * s_col_int_028 AS INT) ELSE CAST(s_col_int_028 * 100 AS INT) END END AS col_int_028,
    CASE WHEN s_col_int_029 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_029, 10) = 0 THEN 0 WHEN PMOD(s_col_int_029, 10) < 3 THEN CAST(-1 * s_col_int_029 AS INT) ELSE CAST(s_col_int_029 * 100 AS INT) END END AS col_int_029,
    CASE WHEN s_col_int_030 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_030, 10) = 0 THEN 0 WHEN PMOD(s_col_int_030, 10) < 3 THEN CAST(-1 * s_col_int_030 AS INT) ELSE CAST(s_col_int_030 * 100 AS INT) END END AS col_int_030,
    CASE WHEN s_col_int_031 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_031, 10) = 0 THEN 0 WHEN PMOD(s_col_int_031, 10) < 3 THEN CAST(-1 * s_col_int_031 AS INT) ELSE CAST(s_col_int_031 * 100 AS INT) END END AS col_int_031,
    CASE WHEN s_col_int_032 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_032, 10) = 0 THEN 0 WHEN PMOD(s_col_int_032, 10) < 3 THEN CAST(-1 * s_col_int_032 AS INT) ELSE CAST(s_col_int_032 * 100 AS INT) END END AS col_int_032,
    CASE WHEN s_col_int_033 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_033, 10) = 0 THEN 0 WHEN PMOD(s_col_int_033, 10) < 3 THEN CAST(-1 * s_col_int_033 AS INT) ELSE CAST(s_col_int_033 * 100 AS INT) END END AS col_int_033,
    CASE WHEN s_col_int_034 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_034, 10) = 0 THEN 0 WHEN PMOD(s_col_int_034, 10) < 3 THEN CAST(-1 * s_col_int_034 AS INT) ELSE CAST(s_col_int_034 * 100 AS INT) END END AS col_int_034,
    CASE WHEN s_col_int_035 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_035, 10) = 0 THEN 0 WHEN PMOD(s_col_int_035, 10) < 3 THEN CAST(-1 * s_col_int_035 AS INT) ELSE CAST(s_col_int_035 * 100 AS INT) END END AS col_int_035,
    CASE WHEN s_col_int_036 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_036, 10) = 0 THEN 0 WHEN PMOD(s_col_int_036, 10) < 3 THEN CAST(-1 * s_col_int_036 AS INT) ELSE CAST(s_col_int_036 * 100 AS INT) END END AS col_int_036,
    CASE WHEN s_col_int_037 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_037, 10) = 0 THEN 0 WHEN PMOD(s_col_int_037, 10) < 3 THEN CAST(-1 * s_col_int_037 AS INT) ELSE CAST(s_col_int_037 * 100 AS INT) END END AS col_int_037,
    CASE WHEN s_col_int_038 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_038, 10) = 0 THEN 0 WHEN PMOD(s_col_int_038, 10) < 3 THEN CAST(-1 * s_col_int_038 AS INT) ELSE CAST(s_col_int_038 * 100 AS INT) END END AS col_int_038,
    CASE WHEN s_col_int_039 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_039, 10) = 0 THEN 0 WHEN PMOD(s_col_int_039, 10) < 3 THEN CAST(-1 * s_col_int_039 AS INT) ELSE CAST(s_col_int_039 * 100 AS INT) END END AS col_int_039,
    CASE WHEN s_col_int_040 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_040, 10) = 0 THEN 0 WHEN PMOD(s_col_int_040, 10) < 3 THEN CAST(-1 * s_col_int_040 AS INT) ELSE CAST(s_col_int_040 * 100 AS INT) END END AS col_int_040,
    CASE WHEN s_col_int_041 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_041, 10) = 0 THEN 0 WHEN PMOD(s_col_int_041, 10) < 3 THEN CAST(-1 * s_col_int_041 AS INT) ELSE CAST(s_col_int_041 * 100 AS INT) END END AS col_int_041,
    CASE WHEN s_col_int_042 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_042, 10) = 0 THEN 0 WHEN PMOD(s_col_int_042, 10) < 3 THEN CAST(-1 * s_col_int_042 AS INT) ELSE CAST(s_col_int_042 * 100 AS INT) END END AS col_int_042,
    CASE WHEN s_col_int_043 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_043, 10) = 0 THEN 0 WHEN PMOD(s_col_int_043, 10) < 3 THEN CAST(-1 * s_col_int_043 AS INT) ELSE CAST(s_col_int_043 * 100 AS INT) END END AS col_int_043,
    CASE WHEN s_col_int_044 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_044, 10) = 0 THEN 0 WHEN PMOD(s_col_int_044, 10) < 3 THEN CAST(-1 * s_col_int_044 AS INT) ELSE CAST(s_col_int_044 * 100 AS INT) END END AS col_int_044,
    CASE WHEN s_col_int_045 < 50 THEN CAST(NULL AS INT) ELSE CASE WHEN PMOD(s_col_int_045, 10) = 0 THEN 0 WHEN PMOD(s_col_int_045, 10) < 3 THEN CAST(-1 * s_col_int_045 AS INT) ELSE CAST(s_col_int_045 * 100 AS INT) END END AS col_int_045,
    CASE WHEN s_col_bigint_001 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_001 * 1000000 AS BIGINT) END AS col_bigint_001,
    CASE WHEN s_col_bigint_002 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_002 * 1000000 AS BIGINT) END AS col_bigint_002,
    CASE WHEN s_col_bigint_003 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_003 * 1000000 AS BIGINT) END AS col_bigint_003,
    CASE WHEN s_col_bigint_004 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_004 * 1000000 AS BIGINT) END AS col_bigint_004,
    CASE WHEN s_col_bigint_005 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_005 * 1000000 AS BIGINT) END AS col_bigint_005,
    CASE WHEN s_col_bigint_006 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_006 * 1000000 AS BIGINT) END AS col_bigint_006,
    CASE WHEN s_col_bigint_007 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_007 * 1000000 AS BIGINT) END AS col_bigint_007,
    CASE WHEN s_col_bigint_008 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_008 * 1000000 AS BIGINT) END AS col_bigint_008,
    CASE WHEN s_col_bigint_009 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_009 * 1000000 AS BIGINT) END AS col_bigint_009,
    CASE WHEN s_col_bigint_010 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_010 * 1000000 AS BIGINT) END AS col_bigint_010,
    CASE WHEN s_col_bigint_011 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_011 * 1000000 AS BIGINT) END AS col_bigint_011,
    CASE WHEN s_col_bigint_012 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_012 * 1000000 AS BIGINT) END AS col_bigint_012,
    CASE WHEN s_col_bigint_013 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_013 * 1000000 AS BIGINT) END AS col_bigint_013,
    CASE WHEN s_col_bigint_014 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_014 * 1000000 AS BIGINT) END AS col_bigint_014,
    CASE WHEN s_col_bigint_015 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_015 * 1000000 AS BIGINT) END AS col_bigint_015,
    CASE WHEN s_col_bigint_016 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_016 * 1000000 AS BIGINT) END AS col_bigint_016,
    CASE WHEN s_col_bigint_017 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_017 * 1000000 AS BIGINT) END AS col_bigint_017,
    CASE WHEN s_col_bigint_018 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_018 * 1000000 AS BIGINT) END AS col_bigint_018,
    CASE WHEN s_col_bigint_019 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_019 * 1000000 AS BIGINT) END AS col_bigint_019,
    CASE WHEN s_col_bigint_020 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_020 * 1000000 AS BIGINT) END AS col_bigint_020,
    CASE WHEN s_col_bigint_021 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_021 * 1000000 AS BIGINT) END AS col_bigint_021,
    CASE WHEN s_col_bigint_022 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_022 * 1000000 AS BIGINT) END AS col_bigint_022,
    CASE WHEN s_col_bigint_023 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_023 * 1000000 AS BIGINT) END AS col_bigint_023,
    CASE WHEN s_col_bigint_024 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_024 * 1000000 AS BIGINT) END AS col_bigint_024,
    CASE WHEN s_col_bigint_025 < 50 THEN CAST(NULL AS BIGINT) ELSE CAST(s_col_bigint_025 * 1000000 AS BIGINT) END AS col_bigint_025,
    CASE WHEN s_col_dec2_001 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_001 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_001,
    CASE WHEN s_col_dec2_002 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_002 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_002,
    CASE WHEN s_col_dec2_003 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_003 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_003,
    CASE WHEN s_col_dec2_004 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_004 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_004,
    CASE WHEN s_col_dec2_005 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_005 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_005,
    CASE WHEN s_col_dec2_006 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_006 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_006,
    CASE WHEN s_col_dec2_007 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_007 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_007,
    CASE WHEN s_col_dec2_008 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_008 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_008,
    CASE WHEN s_col_dec2_009 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_009 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_009,
    CASE WHEN s_col_dec2_010 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_010 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_010,
    CASE WHEN s_col_dec2_011 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_011 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_011,
    CASE WHEN s_col_dec2_012 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_012 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_012,
    CASE WHEN s_col_dec2_013 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_013 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_013,
    CASE WHEN s_col_dec2_014 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_014 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_014,
    CASE WHEN s_col_dec2_015 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_015 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_015,
    CASE WHEN s_col_dec2_016 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_016 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_016,
    CASE WHEN s_col_dec2_017 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_017 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_017,
    CASE WHEN s_col_dec2_018 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_018 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_018,
    CASE WHEN s_col_dec2_019 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_019 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_019,
    CASE WHEN s_col_dec2_020 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_020 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_020,
    CASE WHEN s_col_dec2_021 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_021 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_021,
    CASE WHEN s_col_dec2_022 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_022 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_022,
    CASE WHEN s_col_dec2_023 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_023 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_023,
    CASE WHEN s_col_dec2_024 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_024 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_024,
    CASE WHEN s_col_dec2_025 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_025 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_025,
    CASE WHEN s_col_dec2_026 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_026 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_026,
    CASE WHEN s_col_dec2_027 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_027 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_027,
    CASE WHEN s_col_dec2_028 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_028 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_028,
    CASE WHEN s_col_dec2_029 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_029 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_029,
    CASE WHEN s_col_dec2_030 < 50 THEN CAST(NULL AS DECIMAL(18,2)) ELSE CAST(ROUND(s_col_dec2_030 * 1234.56, 2) AS DECIMAL(18,2)) END AS col_dec2_030,
    CASE WHEN s_col_dec4_001 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_001 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_001,
    CASE WHEN s_col_dec4_002 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_002 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_002,
    CASE WHEN s_col_dec4_003 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_003 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_003,
    CASE WHEN s_col_dec4_004 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_004 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_004,
    CASE WHEN s_col_dec4_005 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_005 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_005,
    CASE WHEN s_col_dec4_006 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_006 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_006,
    CASE WHEN s_col_dec4_007 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_007 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_007,
    CASE WHEN s_col_dec4_008 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_008 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_008,
    CASE WHEN s_col_dec4_009 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_009 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_009,
    CASE WHEN s_col_dec4_010 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_010 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_010,
    CASE WHEN s_col_dec4_011 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_011 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_011,
    CASE WHEN s_col_dec4_012 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_012 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_012,
    CASE WHEN s_col_dec4_013 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_013 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_013,
    CASE WHEN s_col_dec4_014 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_014 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_014,
    CASE WHEN s_col_dec4_015 < 50 THEN CAST(NULL AS DECIMAL(10,4)) ELSE CAST(ROUND(s_col_dec4_015 / 1000.0, 4) AS DECIMAL(10,4)) END AS col_dec4_015,
    CASE WHEN s_col_dec6_001 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_001 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_001,
    CASE WHEN s_col_dec6_002 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_002 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_002,
    CASE WHEN s_col_dec6_003 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_003 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_003,
    CASE WHEN s_col_dec6_004 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_004 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_004,
    CASE WHEN s_col_dec6_005 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_005 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_005,
    CASE WHEN s_col_dec6_006 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_006 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_006,
    CASE WHEN s_col_dec6_007 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_007 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_007,
    CASE WHEN s_col_dec6_008 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_008 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_008,
    CASE WHEN s_col_dec6_009 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_009 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_009,
    CASE WHEN s_col_dec6_010 < 50 THEN CAST(NULL AS DECIMAL(20,6)) ELSE CAST(ROUND(s_col_dec6_010 * 0.123456, 6) AS DECIMAL(20,6)) END AS col_dec6_010,
    CASE WHEN s_col_double_001 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_001 * 3.14 AS DOUBLE) END AS col_double_001,
    CASE WHEN s_col_double_002 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_002 * 3.14 AS DOUBLE) END AS col_double_002,
    CASE WHEN s_col_double_003 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_003 * 3.14 AS DOUBLE) END AS col_double_003,
    CASE WHEN s_col_double_004 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_004 * 3.14 AS DOUBLE) END AS col_double_004,
    CASE WHEN s_col_double_005 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_005 * 3.14 AS DOUBLE) END AS col_double_005,
    CASE WHEN s_col_double_006 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_006 * 3.14 AS DOUBLE) END AS col_double_006,
    CASE WHEN s_col_double_007 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_007 * 3.14 AS DOUBLE) END AS col_double_007,
    CASE WHEN s_col_double_008 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_008 * 3.14 AS DOUBLE) END AS col_double_008,
    CASE WHEN s_col_double_009 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_009 * 3.14 AS DOUBLE) END AS col_double_009,
    CASE WHEN s_col_double_010 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_010 * 3.14 AS DOUBLE) END AS col_double_010,
    CASE WHEN s_col_double_011 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_011 * 3.14 AS DOUBLE) END AS col_double_011,
    CASE WHEN s_col_double_012 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_012 * 3.14 AS DOUBLE) END AS col_double_012,
    CASE WHEN s_col_double_013 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_013 * 3.14 AS DOUBLE) END AS col_double_013,
    CASE WHEN s_col_double_014 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_014 * 3.14 AS DOUBLE) END AS col_double_014,
    CASE WHEN s_col_double_015 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_015 * 3.14 AS DOUBLE) END AS col_double_015,
    CASE WHEN s_col_double_016 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_016 * 3.14 AS DOUBLE) END AS col_double_016,
    CASE WHEN s_col_double_017 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_017 * 3.14 AS DOUBLE) END AS col_double_017,
    CASE WHEN s_col_double_018 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_018 * 3.14 AS DOUBLE) END AS col_double_018,
    CASE WHEN s_col_double_019 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_019 * 3.14 AS DOUBLE) END AS col_double_019,
    CASE WHEN s_col_double_020 < 50 THEN CAST(NULL AS DOUBLE) ELSE CAST(s_col_double_020 * 3.14 AS DOUBLE) END AS col_double_020,
    CASE WHEN s_col_float_001 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_001 * 2.71 AS FLOAT) END AS col_float_001,
    CASE WHEN s_col_float_002 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_002 * 2.71 AS FLOAT) END AS col_float_002,
    CASE WHEN s_col_float_003 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_003 * 2.71 AS FLOAT) END AS col_float_003,
    CASE WHEN s_col_float_004 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_004 * 2.71 AS FLOAT) END AS col_float_004,
    CASE WHEN s_col_float_005 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_005 * 2.71 AS FLOAT) END AS col_float_005,
    CASE WHEN s_col_float_006 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_006 * 2.71 AS FLOAT) END AS col_float_006,
    CASE WHEN s_col_float_007 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_007 * 2.71 AS FLOAT) END AS col_float_007,
    CASE WHEN s_col_float_008 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_008 * 2.71 AS FLOAT) END AS col_float_008,
    CASE WHEN s_col_float_009 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_009 * 2.71 AS FLOAT) END AS col_float_009,
    CASE WHEN s_col_float_010 < 50 THEN CAST(NULL AS FLOAT) ELSE CAST(s_col_float_010 * 2.71 AS FLOAT) END AS col_float_010,
    CASE WHEN s_col_tinyint_001 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_001 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_001, 10) AS TINYINT) END AS col_tinyint_001,
    CASE WHEN s_col_tinyint_002 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_002 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_002, 10) AS TINYINT) END AS col_tinyint_002,
    CASE WHEN s_col_tinyint_003 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_003 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_003, 10) AS TINYINT) END AS col_tinyint_003,
    CASE WHEN s_col_tinyint_004 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_004 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_004, 10) AS TINYINT) END AS col_tinyint_004,
    CASE WHEN s_col_tinyint_005 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_005 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_005, 10) AS TINYINT) END AS col_tinyint_005,
    CASE WHEN s_col_tinyint_006 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_006 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_006, 10) AS TINYINT) END AS col_tinyint_006,
    CASE WHEN s_col_tinyint_007 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_007 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_007, 10) AS TINYINT) END AS col_tinyint_007,
    CASE WHEN s_col_tinyint_008 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_008 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_008, 10) AS TINYINT) END AS col_tinyint_008,
    CASE WHEN s_col_tinyint_009 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_009 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_009, 10) AS TINYINT) END AS col_tinyint_009,
    CASE WHEN s_col_tinyint_010 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_010 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_010, 10) AS TINYINT) END AS col_tinyint_010,
    CASE WHEN s_col_tinyint_011 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_011 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_011, 10) AS TINYINT) END AS col_tinyint_011,
    CASE WHEN s_col_tinyint_012 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_012 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_012, 10) AS TINYINT) END AS col_tinyint_012,
    CASE WHEN s_col_tinyint_013 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_013 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_013, 10) AS TINYINT) END AS col_tinyint_013,
    CASE WHEN s_col_tinyint_014 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_014 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_014, 10) AS TINYINT) END AS col_tinyint_014,
    CASE WHEN s_col_tinyint_015 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_015 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_015, 10) AS TINYINT) END AS col_tinyint_015,
    CASE WHEN s_col_tinyint_016 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_016 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_016, 10) AS TINYINT) END AS col_tinyint_016,
    CASE WHEN s_col_tinyint_017 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_017 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_017, 10) AS TINYINT) END AS col_tinyint_017,
    CASE WHEN s_col_tinyint_018 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_018 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_018, 10) AS TINYINT) END AS col_tinyint_018,
    CASE WHEN s_col_tinyint_019 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_019 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_019, 10) AS TINYINT) END AS col_tinyint_019,
    CASE WHEN s_col_tinyint_020 < 50 THEN CAST(NULL AS TINYINT) WHEN s_col_tinyint_020 >= 990 THEN CAST(99 AS TINYINT) ELSE CAST(PMOD(s_col_tinyint_020, 10) AS TINYINT) END AS col_tinyint_020,
    CASE WHEN s_col_smallint_001 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_001, 32000) AS SMALLINT) END AS col_smallint_001,
    CASE WHEN s_col_smallint_002 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_002, 32000) AS SMALLINT) END AS col_smallint_002,
    CASE WHEN s_col_smallint_003 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_003, 32000) AS SMALLINT) END AS col_smallint_003,
    CASE WHEN s_col_smallint_004 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_004, 32000) AS SMALLINT) END AS col_smallint_004,
    CASE WHEN s_col_smallint_005 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_005, 32000) AS SMALLINT) END AS col_smallint_005,
    CASE WHEN s_col_smallint_006 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_006, 32000) AS SMALLINT) END AS col_smallint_006,
    CASE WHEN s_col_smallint_007 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_007, 32000) AS SMALLINT) END AS col_smallint_007,
    CASE WHEN s_col_smallint_008 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_008, 32000) AS SMALLINT) END AS col_smallint_008,
    CASE WHEN s_col_smallint_009 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_009, 32000) AS SMALLINT) END AS col_smallint_009,
    CASE WHEN s_col_smallint_010 < 50 THEN CAST(NULL AS SMALLINT) ELSE CAST(PMOD(s_col_smallint_010, 32000) AS SMALLINT) END AS col_smallint_010,
    CASE WHEN s_col_date_001 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_001, 365) AS INT)) AS DATE) END AS col_date_001,
    CASE WHEN s_col_date_002 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_002, 365) AS INT)) AS DATE) END AS col_date_002,
    CASE WHEN s_col_date_003 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_003, 365) AS INT)) AS DATE) END AS col_date_003,
    CASE WHEN s_col_date_004 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_004, 365) AS INT)) AS DATE) END AS col_date_004,
    CASE WHEN s_col_date_005 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_005, 365) AS INT)) AS DATE) END AS col_date_005,
    CASE WHEN s_col_date_006 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_006, 365) AS INT)) AS DATE) END AS col_date_006,
    CASE WHEN s_col_date_007 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_007, 365) AS INT)) AS DATE) END AS col_date_007,
    CASE WHEN s_col_date_008 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_008, 365) AS INT)) AS DATE) END AS col_date_008,
    CASE WHEN s_col_date_009 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_009, 365) AS INT)) AS DATE) END AS col_date_009,
    CASE WHEN s_col_date_010 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_010, 365) AS INT)) AS DATE) END AS col_date_010,
    CASE WHEN s_col_date_011 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_011, 365) AS INT)) AS DATE) END AS col_date_011,
    CASE WHEN s_col_date_012 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_012, 365) AS INT)) AS DATE) END AS col_date_012,
    CASE WHEN s_col_date_013 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_013, 365) AS INT)) AS DATE) END AS col_date_013,
    CASE WHEN s_col_date_014 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_014, 365) AS INT)) AS DATE) END AS col_date_014,
    CASE WHEN s_col_date_015 < 50 THEN CAST(NULL AS DATE) ELSE CAST(DATE_SUB(DATE('2024-01-01'), CAST(PMOD(s_col_date_015, 365) AS INT)) AS DATE) END AS col_date_015,
    CASE WHEN s_col_ts_001 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_001 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_001,
    CASE WHEN s_col_ts_002 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_002 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_002,
    CASE WHEN s_col_ts_003 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_003 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_003,
    CASE WHEN s_col_ts_004 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_004 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_004,
    CASE WHEN s_col_ts_005 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_005 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_005,
    CASE WHEN s_col_ts_006 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_006 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_006,
    CASE WHEN s_col_ts_007 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_007 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_007,
    CASE WHEN s_col_ts_008 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_008 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_008,
    CASE WHEN s_col_ts_009 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_009 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_009,
    CASE WHEN s_col_ts_010 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_010 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_010,
    CASE WHEN s_col_ts_011 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_011 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_011,
    CASE WHEN s_col_ts_012 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_012 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_012,
    CASE WHEN s_col_ts_013 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_013 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_013,
    CASE WHEN s_col_ts_014 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_014 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_014,
    CASE WHEN s_col_ts_015 < 50 THEN CAST(NULL AS TIMESTAMP) ELSE CAST(FROM_UNIXTIME(UNIX_TIMESTAMP('2024-01-01 00:00:00') + CAST(s_col_ts_015 * 1000 AS BIGINT)) AS TIMESTAMP) END AS col_ts_015,
    CASE WHEN s_col_idcard_001 < 50 THEN NULL WHEN s_col_idcard_001 >= 950 AND s_col_idcard_001 < 970 THEN 'BAD_IDCARD' ELSE CONCAT('1101011990', LPAD(CAST(s_col_idcard_001 * 100000 AS BIGINT), 8, '0')) END AS col_idcard_001,
    CASE WHEN s_col_idcard_002 < 50 THEN NULL WHEN s_col_idcard_002 >= 950 AND s_col_idcard_002 < 970 THEN 'BAD_IDCARD' ELSE CONCAT('1101011990', LPAD(CAST(s_col_idcard_002 * 100000 AS BIGINT), 8, '0')) END AS col_idcard_002,
    CASE WHEN s_col_idcard_003 < 50 THEN NULL WHEN s_col_idcard_003 >= 950 AND s_col_idcard_003 < 970 THEN 'BAD_IDCARD' ELSE CONCAT('1101011990', LPAD(CAST(s_col_idcard_003 * 100000 AS BIGINT), 8, '0')) END AS col_idcard_003,
    CASE WHEN s_col_idcard_004 < 50 THEN NULL WHEN s_col_idcard_004 >= 950 AND s_col_idcard_004 < 970 THEN 'BAD_IDCARD' ELSE CONCAT('1101011990', LPAD(CAST(s_col_idcard_004 * 100000 AS BIGINT), 8, '0')) END AS col_idcard_004,
    CASE WHEN s_col_idcard_005 < 50 THEN NULL WHEN s_col_idcard_005 >= 950 AND s_col_idcard_005 < 970 THEN 'BAD_IDCARD' ELSE CONCAT('1101011990', LPAD(CAST(s_col_idcard_005 * 100000 AS BIGINT), 8, '0')) END AS col_idcard_005,
    CASE WHEN s_col_mobile_001 < 50 THEN NULL WHEN s_col_mobile_001 >= 950 AND s_col_mobile_001 < 970 THEN '12345' ELSE CONCAT('138', LPAD(CAST(s_col_mobile_001 * 100000 AS BIGINT), 8, '0')) END AS col_mobile_001,
    CASE WHEN s_col_mobile_002 < 50 THEN NULL WHEN s_col_mobile_002 >= 950 AND s_col_mobile_002 < 970 THEN '12345' ELSE CONCAT('138', LPAD(CAST(s_col_mobile_002 * 100000 AS BIGINT), 8, '0')) END AS col_mobile_002,
    CASE WHEN s_col_mobile_003 < 50 THEN NULL WHEN s_col_mobile_003 >= 950 AND s_col_mobile_003 < 970 THEN '12345' ELSE CONCAT('138', LPAD(CAST(s_col_mobile_003 * 100000 AS BIGINT), 8, '0')) END AS col_mobile_003,
    CASE WHEN s_col_mobile_004 < 50 THEN NULL WHEN s_col_mobile_004 >= 950 AND s_col_mobile_004 < 970 THEN '12345' ELSE CONCAT('138', LPAD(CAST(s_col_mobile_004 * 100000 AS BIGINT), 8, '0')) END AS col_mobile_004,
    CASE WHEN s_col_mobile_005 < 50 THEN NULL WHEN s_col_mobile_005 >= 950 AND s_col_mobile_005 < 970 THEN '12345' ELSE CONCAT('138', LPAD(CAST(s_col_mobile_005 * 100000 AS BIGINT), 8, '0')) END AS col_mobile_005,
    CASE WHEN s_col_email_001 < 50 THEN NULL WHEN s_col_email_001 >= 920 AND s_col_email_001 < 950 THEN '' WHEN s_col_email_001 >= 950 AND s_col_email_001 < 970 THEN 'invalid_email' ELSE CONCAT('u', CAST(id AS STRING), '_col_email_001@example.com') END AS col_email_001,
    CASE WHEN s_col_email_002 < 50 THEN NULL WHEN s_col_email_002 >= 920 AND s_col_email_002 < 950 THEN '' WHEN s_col_email_002 >= 950 AND s_col_email_002 < 970 THEN 'invalid_email' ELSE CONCAT('u', CAST(id AS STRING), '_col_email_002@example.com') END AS col_email_002,
    CASE WHEN s_col_email_003 < 50 THEN NULL WHEN s_col_email_003 >= 920 AND s_col_email_003 < 950 THEN '' WHEN s_col_email_003 >= 950 AND s_col_email_003 < 970 THEN 'invalid_email' ELSE CONCAT('u', CAST(id AS STRING), '_col_email_003@example.com') END AS col_email_003,
    CASE WHEN s_col_email_004 < 50 THEN NULL WHEN s_col_email_004 >= 920 AND s_col_email_004 < 950 THEN '' WHEN s_col_email_004 >= 950 AND s_col_email_004 < 970 THEN 'invalid_email' ELSE CONCAT('u', CAST(id AS STRING), '_col_email_004@example.com') END AS col_email_004,
    CASE WHEN s_col_email_005 < 50 THEN NULL WHEN s_col_email_005 >= 920 AND s_col_email_005 < 950 THEN '' WHEN s_col_email_005 >= 950 AND s_col_email_005 < 970 THEN 'invalid_email' ELSE CONCAT('u', CAST(id AS STRING), '_col_email_005@example.com') END AS col_email_005,
    CASE WHEN s_col_enum_001 < 50 THEN NULL WHEN s_col_enum_001 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_001, 5) AS INT) + 1) END AS col_enum_001,
    CASE WHEN s_col_enum_002 < 50 THEN NULL WHEN s_col_enum_002 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_002, 5) AS INT) + 1) END AS col_enum_002,
    CASE WHEN s_col_enum_003 < 50 THEN NULL WHEN s_col_enum_003 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_003, 5) AS INT) + 1) END AS col_enum_003,
    CASE WHEN s_col_enum_004 < 50 THEN NULL WHEN s_col_enum_004 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_004, 5) AS INT) + 1) END AS col_enum_004,
    CASE WHEN s_col_enum_005 < 50 THEN NULL WHEN s_col_enum_005 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_005, 5) AS INT) + 1) END AS col_enum_005,
    CASE WHEN s_col_enum_006 < 50 THEN NULL WHEN s_col_enum_006 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_006, 5) AS INT) + 1) END AS col_enum_006,
    CASE WHEN s_col_enum_007 < 50 THEN NULL WHEN s_col_enum_007 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_007, 5) AS INT) + 1) END AS col_enum_007,
    CASE WHEN s_col_enum_008 < 50 THEN NULL WHEN s_col_enum_008 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_008, 5) AS INT) + 1) END AS col_enum_008,
    CASE WHEN s_col_enum_009 < 50 THEN NULL WHEN s_col_enum_009 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_009, 5) AS INT) + 1) END AS col_enum_009,
    CASE WHEN s_col_enum_010 < 50 THEN NULL WHEN s_col_enum_010 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_010, 5) AS INT) + 1) END AS col_enum_010,
    CASE WHEN s_col_enum_011 < 50 THEN NULL WHEN s_col_enum_011 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_011, 5) AS INT) + 1) END AS col_enum_011,
    CASE WHEN s_col_enum_012 < 50 THEN NULL WHEN s_col_enum_012 >= 990 THEN 'OUT_OF_ENUM' ELSE ELEMENT_AT(ARRAY('E1','E2','E3','E4','E5'), CAST(PMOD(s_col_enum_012, 5) AS INT) + 1) END AS col_enum_012,

    -- 分区字段：均匀分布在最近 35 天
    DATE_FORMAT(DATE_SUB(CURRENT_DATE(), CAST(rand_sd * 35 AS INT)), 'yyyy-MM-dd') AS stat_date

FROM (
    SELECT
        id,
        rand(1)  AS rand_uc,
        rand(2)  AS rand_un,
        rand(3)  AS rand_nick,
        rand(4)  AS rand_idc,
        rand(5)  AS rand_mob,
        rand(6)  AS rand_em,
        rand(7)  AS rand_g,
        rand(8)  AS rand_ut,
        rand(9)  AS rand_st,
        rand(10)  AS rand_age,
        rand(11)  AS rand_sc,
        rand(12)  AS rand_bal,
        rand(13)  AS rand_sal,
        rand(14)  AS rand_disc,
        rand(15)  AS rand_w,
        rand(16)  AS rand_bd,
        rand(17)  AS rand_reg,
        rand(18)  AS rand_log,
        rand(19)  AS rand_act,
        rand(20)  AS rand_rm,
        rand(21)  AS rand_sd,
        -- 扩展字段的随机种子（每行计算一次，避免在主 SELECT 中重复哈希）
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_001')), 1000) AS s_col_str_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_002')), 1000) AS s_col_str_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_003')), 1000) AS s_col_str_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_004')), 1000) AS s_col_str_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_005')), 1000) AS s_col_str_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_006')), 1000) AS s_col_str_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_007')), 1000) AS s_col_str_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_008')), 1000) AS s_col_str_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_009')), 1000) AS s_col_str_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_010')), 1000) AS s_col_str_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_011')), 1000) AS s_col_str_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_012')), 1000) AS s_col_str_012,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_013')), 1000) AS s_col_str_013,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_014')), 1000) AS s_col_str_014,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_015')), 1000) AS s_col_str_015,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_016')), 1000) AS s_col_str_016,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_017')), 1000) AS s_col_str_017,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_018')), 1000) AS s_col_str_018,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_019')), 1000) AS s_col_str_019,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_020')), 1000) AS s_col_str_020,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_021')), 1000) AS s_col_str_021,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_022')), 1000) AS s_col_str_022,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_023')), 1000) AS s_col_str_023,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_024')), 1000) AS s_col_str_024,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_025')), 1000) AS s_col_str_025,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_026')), 1000) AS s_col_str_026,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_027')), 1000) AS s_col_str_027,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_028')), 1000) AS s_col_str_028,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_029')), 1000) AS s_col_str_029,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_030')), 1000) AS s_col_str_030,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_031')), 1000) AS s_col_str_031,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_032')), 1000) AS s_col_str_032,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_033')), 1000) AS s_col_str_033,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_034')), 1000) AS s_col_str_034,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_035')), 1000) AS s_col_str_035,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_036')), 1000) AS s_col_str_036,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_037')), 1000) AS s_col_str_037,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_038')), 1000) AS s_col_str_038,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_039')), 1000) AS s_col_str_039,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_040')), 1000) AS s_col_str_040,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_041')), 1000) AS s_col_str_041,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_042')), 1000) AS s_col_str_042,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_043')), 1000) AS s_col_str_043,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_044')), 1000) AS s_col_str_044,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_045')), 1000) AS s_col_str_045,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_046')), 1000) AS s_col_str_046,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_047')), 1000) AS s_col_str_047,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_048')), 1000) AS s_col_str_048,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_049')), 1000) AS s_col_str_049,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_050')), 1000) AS s_col_str_050,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_051')), 1000) AS s_col_str_051,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_052')), 1000) AS s_col_str_052,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_053')), 1000) AS s_col_str_053,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_054')), 1000) AS s_col_str_054,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_str_055')), 1000) AS s_col_str_055,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_001')), 1000) AS s_col_int_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_002')), 1000) AS s_col_int_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_003')), 1000) AS s_col_int_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_004')), 1000) AS s_col_int_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_005')), 1000) AS s_col_int_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_006')), 1000) AS s_col_int_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_007')), 1000) AS s_col_int_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_008')), 1000) AS s_col_int_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_009')), 1000) AS s_col_int_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_010')), 1000) AS s_col_int_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_011')), 1000) AS s_col_int_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_012')), 1000) AS s_col_int_012,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_013')), 1000) AS s_col_int_013,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_014')), 1000) AS s_col_int_014,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_015')), 1000) AS s_col_int_015,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_016')), 1000) AS s_col_int_016,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_017')), 1000) AS s_col_int_017,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_018')), 1000) AS s_col_int_018,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_019')), 1000) AS s_col_int_019,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_020')), 1000) AS s_col_int_020,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_021')), 1000) AS s_col_int_021,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_022')), 1000) AS s_col_int_022,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_023')), 1000) AS s_col_int_023,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_024')), 1000) AS s_col_int_024,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_025')), 1000) AS s_col_int_025,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_026')), 1000) AS s_col_int_026,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_027')), 1000) AS s_col_int_027,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_028')), 1000) AS s_col_int_028,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_029')), 1000) AS s_col_int_029,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_030')), 1000) AS s_col_int_030,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_031')), 1000) AS s_col_int_031,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_032')), 1000) AS s_col_int_032,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_033')), 1000) AS s_col_int_033,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_034')), 1000) AS s_col_int_034,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_035')), 1000) AS s_col_int_035,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_036')), 1000) AS s_col_int_036,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_037')), 1000) AS s_col_int_037,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_038')), 1000) AS s_col_int_038,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_039')), 1000) AS s_col_int_039,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_040')), 1000) AS s_col_int_040,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_041')), 1000) AS s_col_int_041,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_042')), 1000) AS s_col_int_042,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_043')), 1000) AS s_col_int_043,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_044')), 1000) AS s_col_int_044,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_int_045')), 1000) AS s_col_int_045,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_001')), 1000) AS s_col_bigint_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_002')), 1000) AS s_col_bigint_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_003')), 1000) AS s_col_bigint_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_004')), 1000) AS s_col_bigint_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_005')), 1000) AS s_col_bigint_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_006')), 1000) AS s_col_bigint_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_007')), 1000) AS s_col_bigint_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_008')), 1000) AS s_col_bigint_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_009')), 1000) AS s_col_bigint_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_010')), 1000) AS s_col_bigint_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_011')), 1000) AS s_col_bigint_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_012')), 1000) AS s_col_bigint_012,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_013')), 1000) AS s_col_bigint_013,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_014')), 1000) AS s_col_bigint_014,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_015')), 1000) AS s_col_bigint_015,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_016')), 1000) AS s_col_bigint_016,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_017')), 1000) AS s_col_bigint_017,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_018')), 1000) AS s_col_bigint_018,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_019')), 1000) AS s_col_bigint_019,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_020')), 1000) AS s_col_bigint_020,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_021')), 1000) AS s_col_bigint_021,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_022')), 1000) AS s_col_bigint_022,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_023')), 1000) AS s_col_bigint_023,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_024')), 1000) AS s_col_bigint_024,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_bigint_025')), 1000) AS s_col_bigint_025,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_001')), 1000) AS s_col_dec2_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_002')), 1000) AS s_col_dec2_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_003')), 1000) AS s_col_dec2_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_004')), 1000) AS s_col_dec2_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_005')), 1000) AS s_col_dec2_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_006')), 1000) AS s_col_dec2_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_007')), 1000) AS s_col_dec2_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_008')), 1000) AS s_col_dec2_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_009')), 1000) AS s_col_dec2_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_010')), 1000) AS s_col_dec2_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_011')), 1000) AS s_col_dec2_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_012')), 1000) AS s_col_dec2_012,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_013')), 1000) AS s_col_dec2_013,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_014')), 1000) AS s_col_dec2_014,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_015')), 1000) AS s_col_dec2_015,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_016')), 1000) AS s_col_dec2_016,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_017')), 1000) AS s_col_dec2_017,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_018')), 1000) AS s_col_dec2_018,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_019')), 1000) AS s_col_dec2_019,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_020')), 1000) AS s_col_dec2_020,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_021')), 1000) AS s_col_dec2_021,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_022')), 1000) AS s_col_dec2_022,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_023')), 1000) AS s_col_dec2_023,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_024')), 1000) AS s_col_dec2_024,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_025')), 1000) AS s_col_dec2_025,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_026')), 1000) AS s_col_dec2_026,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_027')), 1000) AS s_col_dec2_027,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_028')), 1000) AS s_col_dec2_028,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_029')), 1000) AS s_col_dec2_029,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec2_030')), 1000) AS s_col_dec2_030,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_001')), 1000) AS s_col_dec4_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_002')), 1000) AS s_col_dec4_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_003')), 1000) AS s_col_dec4_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_004')), 1000) AS s_col_dec4_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_005')), 1000) AS s_col_dec4_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_006')), 1000) AS s_col_dec4_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_007')), 1000) AS s_col_dec4_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_008')), 1000) AS s_col_dec4_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_009')), 1000) AS s_col_dec4_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_010')), 1000) AS s_col_dec4_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_011')), 1000) AS s_col_dec4_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_012')), 1000) AS s_col_dec4_012,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_013')), 1000) AS s_col_dec4_013,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_014')), 1000) AS s_col_dec4_014,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec4_015')), 1000) AS s_col_dec4_015,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_001')), 1000) AS s_col_dec6_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_002')), 1000) AS s_col_dec6_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_003')), 1000) AS s_col_dec6_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_004')), 1000) AS s_col_dec6_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_005')), 1000) AS s_col_dec6_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_006')), 1000) AS s_col_dec6_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_007')), 1000) AS s_col_dec6_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_008')), 1000) AS s_col_dec6_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_009')), 1000) AS s_col_dec6_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_dec6_010')), 1000) AS s_col_dec6_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_001')), 1000) AS s_col_double_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_002')), 1000) AS s_col_double_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_003')), 1000) AS s_col_double_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_004')), 1000) AS s_col_double_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_005')), 1000) AS s_col_double_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_006')), 1000) AS s_col_double_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_007')), 1000) AS s_col_double_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_008')), 1000) AS s_col_double_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_009')), 1000) AS s_col_double_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_010')), 1000) AS s_col_double_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_011')), 1000) AS s_col_double_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_012')), 1000) AS s_col_double_012,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_013')), 1000) AS s_col_double_013,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_014')), 1000) AS s_col_double_014,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_015')), 1000) AS s_col_double_015,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_016')), 1000) AS s_col_double_016,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_017')), 1000) AS s_col_double_017,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_018')), 1000) AS s_col_double_018,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_019')), 1000) AS s_col_double_019,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_double_020')), 1000) AS s_col_double_020,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_001')), 1000) AS s_col_float_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_002')), 1000) AS s_col_float_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_003')), 1000) AS s_col_float_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_004')), 1000) AS s_col_float_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_005')), 1000) AS s_col_float_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_006')), 1000) AS s_col_float_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_007')), 1000) AS s_col_float_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_008')), 1000) AS s_col_float_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_009')), 1000) AS s_col_float_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_float_010')), 1000) AS s_col_float_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_001')), 1000) AS s_col_tinyint_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_002')), 1000) AS s_col_tinyint_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_003')), 1000) AS s_col_tinyint_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_004')), 1000) AS s_col_tinyint_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_005')), 1000) AS s_col_tinyint_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_006')), 1000) AS s_col_tinyint_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_007')), 1000) AS s_col_tinyint_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_008')), 1000) AS s_col_tinyint_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_009')), 1000) AS s_col_tinyint_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_010')), 1000) AS s_col_tinyint_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_011')), 1000) AS s_col_tinyint_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_012')), 1000) AS s_col_tinyint_012,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_013')), 1000) AS s_col_tinyint_013,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_014')), 1000) AS s_col_tinyint_014,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_015')), 1000) AS s_col_tinyint_015,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_016')), 1000) AS s_col_tinyint_016,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_017')), 1000) AS s_col_tinyint_017,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_018')), 1000) AS s_col_tinyint_018,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_019')), 1000) AS s_col_tinyint_019,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_tinyint_020')), 1000) AS s_col_tinyint_020,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_001')), 1000) AS s_col_smallint_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_002')), 1000) AS s_col_smallint_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_003')), 1000) AS s_col_smallint_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_004')), 1000) AS s_col_smallint_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_005')), 1000) AS s_col_smallint_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_006')), 1000) AS s_col_smallint_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_007')), 1000) AS s_col_smallint_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_008')), 1000) AS s_col_smallint_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_009')), 1000) AS s_col_smallint_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_smallint_010')), 1000) AS s_col_smallint_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_001')), 1000) AS s_col_date_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_002')), 1000) AS s_col_date_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_003')), 1000) AS s_col_date_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_004')), 1000) AS s_col_date_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_005')), 1000) AS s_col_date_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_006')), 1000) AS s_col_date_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_007')), 1000) AS s_col_date_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_008')), 1000) AS s_col_date_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_009')), 1000) AS s_col_date_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_010')), 1000) AS s_col_date_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_011')), 1000) AS s_col_date_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_012')), 1000) AS s_col_date_012,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_013')), 1000) AS s_col_date_013,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_014')), 1000) AS s_col_date_014,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_date_015')), 1000) AS s_col_date_015,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_001')), 1000) AS s_col_ts_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_002')), 1000) AS s_col_ts_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_003')), 1000) AS s_col_ts_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_004')), 1000) AS s_col_ts_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_005')), 1000) AS s_col_ts_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_006')), 1000) AS s_col_ts_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_007')), 1000) AS s_col_ts_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_008')), 1000) AS s_col_ts_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_009')), 1000) AS s_col_ts_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_010')), 1000) AS s_col_ts_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_011')), 1000) AS s_col_ts_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_012')), 1000) AS s_col_ts_012,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_013')), 1000) AS s_col_ts_013,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_014')), 1000) AS s_col_ts_014,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_ts_015')), 1000) AS s_col_ts_015,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_idcard_001')), 1000) AS s_col_idcard_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_idcard_002')), 1000) AS s_col_idcard_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_idcard_003')), 1000) AS s_col_idcard_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_idcard_004')), 1000) AS s_col_idcard_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_idcard_005')), 1000) AS s_col_idcard_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_mobile_001')), 1000) AS s_col_mobile_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_mobile_002')), 1000) AS s_col_mobile_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_mobile_003')), 1000) AS s_col_mobile_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_mobile_004')), 1000) AS s_col_mobile_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_mobile_005')), 1000) AS s_col_mobile_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_email_001')), 1000) AS s_col_email_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_email_002')), 1000) AS s_col_email_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_email_003')), 1000) AS s_col_email_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_email_004')), 1000) AS s_col_email_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_email_005')), 1000) AS s_col_email_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_001')), 1000) AS s_col_enum_001,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_002')), 1000) AS s_col_enum_002,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_003')), 1000) AS s_col_enum_003,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_004')), 1000) AS s_col_enum_004,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_005')), 1000) AS s_col_enum_005,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_006')), 1000) AS s_col_enum_006,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_007')), 1000) AS s_col_enum_007,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_008')), 1000) AS s_col_enum_008,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_009')), 1000) AS s_col_enum_009,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_010')), 1000) AS s_col_enum_010,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_011')), 1000) AS s_col_enum_011,
        PMOD(HASH(CONCAT(CAST(id AS STRING),'col_enum_012')), 1000) AS s_col_enum_012
    FROM (
        -- 100 万行；调试可改成 SELECT id FROM range(1, 1001)
        SELECT id FROM range(1, 1000001)
    ) t
) src;

-- 校验
SELECT stat_date, COUNT(*) AS cnt
FROM dq_test_user_info_300
GROUP BY stat_date
ORDER BY stat_date;
```

> string 强转 int 专项表 - Spark SQL

```sql
-- ============================================================
-- string 类型数字字段强转 int 专项表
-- 覆盖 NULL、负数、零、正数、越界值、枚举越界值、重复值、非重复值
-- ============================================================
DROP TABLE IF EXISTS dq_test_string_cast_int;
CREATE TABLE IF NOT EXISTS dq_test_string_cast_int (
    id               BIGINT COMMENT '主键ID',
    age_str          STRING COMMENT '年龄数字字符串（含NULL和越界值）',
    score_str        STRING COMMENT '积分数字字符串（含负数、零、正数）',
    enum_num_str     STRING COMMENT '数字枚举字符串（含枚举越界值）',
    unique_num_str   STRING COMMENT '唯一性数字字符串（含重复值和非重复值）'
)
PARTITIONED BY (stat_date STRING COMMENT '统计日期 yyyy-MM-dd')
STORED AS PARQUET
TBLPROPERTIES ('parquet.compression'='SNAPPY');

INSERT OVERWRITE TABLE dq_test_string_cast_int PARTITION (stat_date)
SELECT
    id,
    CASE WHEN PMOD(id, 20) = 0 THEN NULL
         WHEN PMOD(id, 33) = 0 THEN '-5'
         WHEN PMOD(id, 37) = 0 THEN '200'
         ELSE CAST(18 + PMOD(id, 60) AS STRING)
    END AS age_str,
    CASE WHEN PMOD(id, 10) = 0 THEN '0'
         WHEN PMOD(id, 4) = 0 THEN CAST(-1 * PMOD(id, 100) AS STRING)
         ELSE CAST(PMOD(id, 10000) AS STRING)
    END AS score_str,
    CASE WHEN PMOD(id, 25) = 0 THEN '9'
         ELSE CAST(PMOD(id, 3) AS STRING)
    END AS enum_num_str,
    CASE WHEN PMOD(id, 10) = 0 THEN CAST(id AS STRING)
         ELSE CAST(PMOD(id, 50) AS STRING)
    END AS unique_num_str,
    DATE_FORMAT(DATE_SUB(CURRENT_DATE(), CAST(PMOD(id, 7) AS INT)), 'yyyy-MM-dd') AS stat_date
FROM range(1, 1001);

-- 校验
SELECT stat_date, COUNT(*) AS cnt
FROM dq_test_string_cast_int
GROUP BY stat_date
ORDER BY stat_date;
```

> 主表关键断言口径
- 下列用例中的 `{xxx}` 均表示执行前通过 SparkThrift 在 dq_test_user_info_300 上查询得到的预期值；规则结果以“实际值等于该预期值”为通过断言。
- 基础统计 SQL：

```sql
SELECT
  COUNT(1) AS row_cnt,
  SUM(CASE WHEN user_code IS NULL THEN 1 ELSE 0 END) AS user_code_null_cnt,
  ROUND(SUM(CASE WHEN user_code IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 4) AS user_code_null_rate,
  SUM(CASE WHEN user_name = '' THEN 1 ELSE 0 END) AS user_name_empty_cnt,
  ROUND(SUM(CASE WHEN user_name = '' THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 4) AS user_name_empty_rate,
  SUM(CASE WHEN remark IS NULL THEN 1 ELSE 0 END) AS remark_null_cnt,
  ROUND(SUM(CASE WHEN remark IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 4) AS remark_null_rate,
  SUM(CASE WHEN remark = '' THEN 1 ELSE 0 END) AS remark_empty_cnt,
  ROUND(SUM(CASE WHEN remark = '' THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 4) AS remark_empty_rate,
  SUM(CASE WHEN user_code IS NULL AND remark IS NULL THEN 1 ELSE 0 END) AS user_code_remark_null_and_cnt,
  ROUND(SUM(CASE WHEN user_code IS NULL AND remark IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 4) AS user_code_remark_null_and_rate,
  SUM(CASE WHEN user_code IS NULL OR remark IS NULL THEN 1 ELSE 0 END) AS user_code_remark_null_or_cnt,
  ROUND(SUM(CASE WHEN user_code IS NULL OR remark IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 4) AS user_code_remark_null_or_rate,
  SUM(CASE WHEN user_name = '' AND remark = '' THEN 1 ELSE 0 END) AS user_name_remark_empty_and_cnt,
  ROUND(SUM(CASE WHEN user_name = '' AND remark = '' THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 4) AS user_name_remark_empty_and_rate,
  SUM(CASE WHEN user_name = '' OR remark = '' THEN 1 ELSE 0 END) AS user_name_remark_empty_or_cnt,
  ROUND(SUM(CASE WHEN user_name = '' OR remark = '' THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 4) AS user_name_remark_empty_or_rate,
  SUM(score) AS score_sum,
  AVG(score) AS score_avg,
  ROUND(SUM(CASE WHEN score < 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(score), 4) AS score_negative_rate,
  ROUND(SUM(CASE WHEN score = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(score), 4) AS score_zero_rate,
  ROUND(SUM(CASE WHEN score > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(score), 4) AS score_positive_rate,
  SUM(CASE WHEN age < 0 OR age > 120 THEN 1 ELSE 0 END) AS age_range_invalid_cnt,
  SUM(CASE WHEN gender NOT IN (0, 1, 2) THEN 1 ELSE 0 END) AS gender_enum_invalid_cnt,
  SUM(CASE WHEN user_type NOT IN ('VIP', 'NORMAL', 'GUEST') THEN 1 ELSE 0 END) AS user_type_enum_invalid_cnt,
  COUNT(DISTINCT user_type) AS user_type_enum_cnt,
  SUM(CASE WHEN id_card_no RLIKE '^[0-9]{17}[0-9Xx]$' THEN 1 ELSE 0 END) AS id_card_valid_cnt,
  SUM(CASE WHEN id_card_no IS NOT NULL AND id_card_no NOT RLIKE '^[0-9]{17}[0-9Xx]$' THEN 1 ELSE 0 END) AS id_card_invalid_cnt,
  SUM(CASE WHEN mobile_no RLIKE '^1[0-9]{10}$' THEN 1 ELSE 0 END) AS mobile_valid_cnt,
  SUM(CASE WHEN mobile_no IS NOT NULL AND mobile_no NOT RLIKE '^1[0-9]{10}$' THEN 1 ELSE 0 END) AS mobile_invalid_cnt,
  SUM(CASE WHEN email RLIKE '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN 1 ELSE 0 END) AS email_valid_cnt,
  SUM(CASE WHEN email IS NOT NULL AND email <> '' AND email NOT RLIKE '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN 1 ELSE 0 END) AS email_invalid_cnt,
  MAX(LENGTH(user_name)) AS user_name_max_len,
  MIN(LENGTH(NULLIF(user_name, ''))) AS user_name_min_len,
  SUM(CASE WHEN user_code IS NULL OR LENGTH(user_code) <> 11 THEN 1 ELSE 0 END) AS user_code_fixed_len_invalid_cnt,
  SUM(CASE WHEN status NOT IN ('A', 'I', 'D') THEN 1 ELSE 0 END) AS status_enum_invalid_cnt,
  COUNT(CASE WHEN status = 'A' THEN 1 END) AS status_a_cnt
FROM dq_test_user_info_300;
```

> string 强转 int 专项断言口径
- 下列 `{xxx}` 均表示执行前通过 SparkThrift 在 dq_test_string_cast_int 上查询得到的预期值；规则字段选择 string 类型字段，规则执行结果以系统强转后的实际值等于该预期值为通过断言。
- 强转统计 SQL：

```sql
SELECT
  COUNT(1) AS string_cast_row_cnt,
  SUM(CASE WHEN age_str IS NULL THEN 1 ELSE 0 END) AS age_str_null_cnt,
  ROUND(SUM(CASE WHEN age_str IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(1), 4) AS age_str_null_rate,
  SUM(CAST(score_str AS INT)) AS score_str_sum,
  AVG(CAST(score_str AS INT)) AS score_str_avg,
  ROUND(SUM(CASE WHEN CAST(score_str AS INT) < 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(score_str), 4) AS score_str_negative_rate,
  ROUND(SUM(CASE WHEN CAST(score_str AS INT) = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(score_str), 4) AS score_str_zero_rate,
  ROUND(SUM(CASE WHEN CAST(score_str AS INT) > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(score_str), 4) AS score_str_positive_rate,
  SUM(CASE WHEN age_str IS NOT NULL AND (CAST(age_str AS INT) < 0 OR CAST(age_str AS INT) > 120) THEN 1 ELSE 0 END) AS age_str_range_invalid_cnt,
  SUM(CASE WHEN CAST(enum_num_str AS INT) NOT IN (0, 1, 2) THEN 1 ELSE 0 END) AS enum_num_str_enum_invalid_cnt,
  COUNT(DISTINCT enum_num_str) AS enum_num_str_enum_cnt,
  COUNT(CASE WHEN CAST(score_str AS INT) > 0 THEN 1 END) AS score_str_positive_cnt
FROM dq_test_string_cast_int;
```

```sql
SELECT
  SUM(CASE WHEN unique_num_str_cnt > 1 THEN unique_num_str_cnt ELSE 0 END) AS unique_num_str_dup_cnt,
  ROUND(SUM(CASE WHEN unique_num_str_cnt > 1 THEN unique_num_str_cnt ELSE 0 END) * 100.0 / SUM(unique_num_str_cnt), 4) AS unique_num_str_dup_rate,
  SUM(CASE WHEN unique_num_str_cnt = 1 THEN unique_num_str_cnt ELSE 0 END) AS unique_num_str_non_dup_cnt,
  ROUND(SUM(CASE WHEN unique_num_str_cnt = 1 THEN unique_num_str_cnt ELSE 0 END) * 100.0 / SUM(unique_num_str_cnt), 4) AS unique_num_str_non_dup_rate
FROM (
  SELECT unique_num_str, COUNT(1) AS unique_num_str_cnt
  FROM dq_test_string_cast_int
  GROUP BY unique_num_str
) t;
```

- 重复统计 SQL：

```sql
SELECT
  SUM(CASE WHEN nick_name_cnt > 1 THEN nick_name_cnt ELSE 0 END) AS nick_name_dup_cnt,
  ROUND(SUM(CASE WHEN nick_name_cnt > 1 THEN nick_name_cnt ELSE 0 END) * 100.0 / SUM(nick_name_cnt), 4) AS nick_name_dup_rate
FROM (
  SELECT nick_name, COUNT(1) AS nick_name_cnt
  FROM dq_test_user_info_300
  GROUP BY nick_name
) t;
```

```sql
SELECT
  SUM(CASE WHEN pair_cnt > 1 THEN pair_cnt ELSE 0 END) AS user_type_status_dup_cnt,
  ROUND(SUM(CASE WHEN pair_cnt > 1 THEN pair_cnt ELSE 0 END) * 100.0 / SUM(pair_cnt), 4) AS user_type_status_dup_rate
FROM (
  SELECT user_type, status, COUNT(1) AS pair_cnt
  FROM dq_test_user_info_300
  GROUP BY user_type, status
) t;
```

> 规则集导入文件
- 标品规则集的“规则内容”步骤通过【导入规则】上传 xls/xlsx 文件维护规则内容。
- 已生成规则集导入文件“v63规则集导入模板.xlsx”和更新文件“v63规则集导入模板-更新.xlsx”，文件路径均在本用例目录下。
- 模板表头必须按后端固定顺序填写为：`* 规则名称`、`规则描述`、`* 表名`、`表中文名`、`字段名`、`字段中文名`、`* 校验SQL(请输入不符合规则要求的明细数据查询SQL)`。
- “v63规则集导入模板.xlsx”内容如下：

| * 规则名称 | 规则描述 | * 表名 | 表中文名 | 字段名 | 字段中文名 | * 校验SQL(请输入不符合规则要求的明细数据查询SQL) |
| --- | --- | --- | --- | --- | --- | --- |
| v63_user_code_null | user_code 不允许为空，返回 user_code 为 NULL 的明细 | dq_test_user_info_300 | 用户信息宽表 | user_code | 用户编码 | `SELECT id, user_code, stat_date FROM dq_test_user_info_300 WHERE user_code IS NULL` |
| v63_user_name_empty | user_name 不允许为空串，返回 user_name 为空串的明细 | dq_test_user_info_300 | 用户信息宽表 | user_name | 用户姓名 | `SELECT id, user_name, stat_date FROM dq_test_user_info_300 WHERE user_name = ''` |
| v63_nick_name_duplicate | nick_name 不允许重复，返回重复昵称对应的明细 | dq_test_user_info_300 | 用户信息宽表 | nick_name | 昵称 | `SELECT t.id, t.nick_name, t.stat_date FROM dq_test_user_info_300 t JOIN (SELECT nick_name FROM dq_test_user_info_300 WHERE nick_name IS NOT NULL GROUP BY nick_name HAVING COUNT(1) > 1) d ON t.nick_name = d.nick_name` |
| v63_score_negative | score 不允许为负数，返回 score 小于 0 的明细 | dq_test_user_info_300 | 用户信息宽表 | score | 积分 | `SELECT id, score, stat_date FROM dq_test_user_info_300 WHERE score < 0` |

- “v63规则集导入模板-更新.xlsx”在上述 4 条基础上新增 1 条：

| * 规则名称 | 规则描述 | * 表名 | 表中文名 | 字段名 | 字段中文名 | * 校验SQL(请输入不符合规则要求的明细数据查询SQL) |
| --- | --- | --- | --- | --- | --- | --- |
| v63_email_invalid | email 需符合邮箱格式，返回非空且格式不合法的明细 | dq_test_user_info_300 | 用户信息宽表 | email | 邮箱 | `SELECT id, email, stat_date FROM dq_test_user_info_300 WHERE email IS NOT NULL AND email <> '' AND email NOT RLIKE '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'` |

## Part1 规则集与单表完整性/唯一性/自定义规则

### 规则集管理

#### 规则集创建与运行

##### 【P1】验证规则集创建后可独立运行并生成任务查询记录

> 前置条件

```
已准备规则集导入文件“v63规则集导入模板.xlsx”。
文件表头与后端模板完全一致，包含 user_code 为空、user_name 为空串、nick_name 重复、score 负值 4 条明细 SQL 规则。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，等待任务列表和规则集区域加载完成 | 页面 URL 为 `#/dq/rule`，页面展示【新建监控规则】入口，规则集区域展示【新建规则集】入口 |
| 2 | 在规则集区域点击【新建规则集】，等待规则集配置页加载完成 | 进入【新建规则集】页面，步骤条展示【基础信息】【规则内容】【调度配置】 |
| 3 | 在【基础信息】中输入规则集名称“v63标品规则集”，等待名称唯一性校验完成 | 规则集名称输入框无重复名称报错 |
| 4 | 选择校验数据源为 SparkThrift 数据源 | 选择数据库下拉框开始加载 |
| 5 | 选择数据库 pw_test，输入规则集描述“v63标品规则集回归” | 基础信息展示校验数据源、数据库、规则集描述 |
| 6 | 点击【下一步】，等待【规则内容】页面加载完成 | 页面展示【导入规则】按钮和规则内容表格，表格列包含规则名称、规则描述、表名、字段名、校验 SQL、操作 |
| 7 | 点击【导入规则】，上传“v63规则集导入模板.xlsx”，点击导入弹窗【确定】，等待上传处理完成 | 提示文件上传成功，规则内容表格展示 4 条导入规则 |
| 8 | 查看规则内容表格中的规则名称 | 规则名称展示 v63_user_code_null、v63_user_name_empty、v63_nick_name_duplicate、v63_score_negative |
| 9 | 查看规则内容表格中的表名和字段名 | 表名均为 dq_test_user_info_300，字段名包含 user_code、user_name、nick_name、score |
| 10 | 查看规则内容表格中的校验 SQL | 4 条规则的校验 SQL 均非空，且与“v63规则集导入模板.xlsx”中的明细查询 SQL 一致 |
| 11 | 点击【下一步】，等待【调度配置】页面加载完成 | 页面展示调度配置、规则拼接包、资源组、高级配置、告警配置、实例生成方式 |
| 12 | 设置实例生成方式为【立即生成】，规则拼接包保持默认 1，点击【完成】，等待返回规则任务配置页面 | 提示规则集创建完成，规则集列表或卡片展示“v63标品规则集” |
| 13 | 在“v63标品规则集”卡片点击【立即执行】，等待提交完成 | 页面提示稍后可在任务查询中查看详情，规则集卡片仍展示为可执行状态 |
| 14 | 进入【数据质量 → 任务实例查询】页面，按规则集名称“v63标品规则集”搜索并等待列表刷新完成 | 列表生成该规则集的执行记录，状态展示为校验通过或校验异常，状态与导入规则阈值一致 |

#### 规则集变更与删除

##### 【P2】验证规则集编辑规则内容和删除提示符合标品逻辑

> 前置条件

```
已创建规则集“v63标品规则集”。
已准备包含 5 条规则的更新文件“v63规则集导入模板-更新.xlsx”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，等待规则集区域加载完成 | 规则集区域展示“v63标品规则集” |
| 2 | 点击“v63标品规则集”卡片【编辑】，等待编辑规则集页面加载完成 | 进入【编辑规则集】页面，步骤条展示基础信息、规则内容、调度配置 |
| 3 | 在【基础信息】修改规则集描述为“v63标品规则集回归-已编辑”，点击【下一步】，等待【规则内容】页面加载完成 | 规则内容表格展示该规则集已有导入规则 |
| 4 | 在【规则内容】点击【导入规则】，上传“v63规则集导入模板-更新.xlsx”，点击【确定】，等待上传完成 | 规则内容表格刷新为 5 条规则 |
| 5 | 删除规则内容表格中 1 条测试规则，点击删除确认弹窗【确定】，等待表格刷新完成 | 表格剩余 4 条规则，被删除规则不再展示 |
| 6 | 进入【调度配置】点击【完成】，等待返回规则任务配置页面 | 提示规则集编辑完成 |
| 7 | 展开或查看“v63标品规则集”详情 | 基础信息中的规则集描述展示为“v63标品规则集回归-已编辑”，规则内容数量为 4 |
| 8 | 点击测试规则集卡片【删除】 | 弹出确认提示，提示删除规则集会同步清除历史任务 |
| 9 | 点击【取消】关闭确认弹窗，等待确认弹窗关闭 | 规则集未删除，仍展示在规则集区域 |

### 规则任务配置

#### 完整性校验

##### 【P1】验证单表完整性字段级规则直接添加后结果正确

> 前置条件

```
已确认 dq_test_user_info_300 存在且已同步至数据质量，已执行通用前置条件中的基础统计 SQL 获取单字段空值/空串预期值，以及多字段 `and`、`or` 逻辑预期值。
规则库配置中的完整性校验处于开启状态。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，等待任务列表加载完成 | 页面展示【新建监控规则】按钮，列表列包含表、规则名称、类型、数据源、执行周期、规则状态 |
| 2 | 点击【新建监控规则】，等待【新建单表校验规则】页面加载完成 | 步骤条展示【监控对象】【监控规则】【调度属性】 |
| 3 | 在【监控对象】输入规则名称“v63完整性字段级任务” | 规则名称输入框展示“v63完整性字段级任务” |
| 4 | 选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 5 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 6 | 选择数据表 dq_test_user_info_300 | 表单展示所选数据库和数据表，数据预览区域可查看表字段 |
| 7 | 点击【下一步】，等待【监控规则】页面加载完成 | 页面展示【添加规则】按钮和监控规则区域 |
| 8 | 点击【添加规则】，等待规则编辑表单加载完成 | 表单展示规则类型、字段、统计函数、校验方法、期望值、强弱规则配置项 |
| 9 | 选择规则类型【完整性校验】，规则类型选择【字段级】，字段选择 user_code | 规则编辑表单展示字段 user_code 和统计规则配置区域 |
| 10 | 在统计规则中选择【空值数】，校验方法选择固定值，操作符选择等于，期望值输入 `{user_code_null_cnt}`，强弱规则选择强规则，点击规则行【保存】，等待规则卡片保存完成 | 规则卡片展示完整性校验、字段 user_code、空值数、期望值等于 `{user_code_null_cnt}` |
| 11 | 再次点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 12 | 选择完整性校验字段级，字段选择 user_code，统计规则选择【空值率】，校验方法选择占比，操作符选择等于，期望值输入 `{user_code_null_rate}`，点击规则行【保存】，等待规则列表刷新完成 | 规则列表新增 user_code 空值率规则，期望值等于 `{user_code_null_rate}` |
| 13 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 14 | 选择完整性校验字段级，字段选择 user_name，统计规则选择【空串数】，期望值等于 `{user_name_empty_cnt}`，点击规则行【保存】，等待规则列表刷新完成 | 规则列表新增 user_name 空串数规则，期望值等于 `{user_name_empty_cnt}` |
| 15 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 16 | 选择完整性校验字段级，字段选择 user_name，统计规则选择【空串率】，校验方法选择占比，期望值输入 `{user_name_empty_rate}`，点击规则行【保存】，等待规则列表刷新完成 | 规则列表新增 user_name 空串率规则，期望值等于 `{user_name_empty_rate}` |
| 17 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 18 | 选择完整性校验字段级，字段同时选择 user_code 和 remark，字段间规则逻辑选择 and | 字段选择框展示 user_code、remark 两个字段，字段间规则逻辑展示 and |
| 19 | 统计函数选择【空值数】，校验方法选择固定值，操作符选择等于，期望值输入 `{user_code_remark_null_and_cnt}`，点击【保存】，等待规则列表刷新完成 | 多字段 and 空值数规则保存成功，规则卡片展示 user_code + remark、and、空值数、期望值等于 `{user_code_remark_null_and_cnt}` |
| 20 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 21 | 选择完整性校验字段级，字段同时选择 user_code 和 remark，字段间规则逻辑选择 and | 字段选择框展示 user_code、remark 两个字段，字段间规则逻辑展示 and |
| 22 | 统计函数选择【空值率】，校验方法选择占比，操作符选择等于，期望值输入 `{user_code_remark_null_and_rate}`，点击【保存】，等待规则列表刷新完成 | 多字段 and 空值率规则保存成功，规则卡片展示 user_code + remark、and、空值率、期望值等于 `{user_code_remark_null_and_rate}` |
| 23 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 24 | 选择完整性校验字段级，字段同时选择 user_code 和 remark，字段间规则逻辑选择 or | 字段选择框展示 user_code、remark 两个字段，字段间规则逻辑展示 or |
| 25 | 统计函数选择【空值数】，校验方法选择固定值，操作符选择等于，期望值输入 `{user_code_remark_null_or_cnt}`，点击【保存】，等待规则列表刷新完成 | 多字段 or 空值数规则保存成功，规则卡片展示 user_code + remark、or、空值数、期望值等于 `{user_code_remark_null_or_cnt}` |
| 26 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 27 | 选择完整性校验字段级，字段同时选择 user_code 和 remark，字段间规则逻辑选择 or | 字段选择框展示 user_code、remark 两个字段，字段间规则逻辑展示 or |
| 28 | 统计函数选择【空值率】，校验方法选择占比，操作符选择等于，期望值输入 `{user_code_remark_null_or_rate}`，点击【保存】，等待规则列表刷新完成 | 多字段 or 空值率规则保存成功，规则卡片展示 user_code + remark、or、空值率、期望值等于 `{user_code_remark_null_or_rate}` |
| 29 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 30 | 选择完整性校验字段级，字段同时选择 user_name 和 remark，字段间规则逻辑选择 and | 字段选择框展示 user_name、remark 两个字段，字段间规则逻辑展示 and |
| 31 | 统计函数选择【空串数】，校验方法选择固定值，操作符选择等于，期望值输入 `{user_name_remark_empty_and_cnt}`，点击【保存】，等待规则列表刷新完成 | 多字段 and 空串数规则保存成功，规则卡片展示 user_name + remark、and、空串数、期望值等于 `{user_name_remark_empty_and_cnt}` |
| 32 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 33 | 选择完整性校验字段级，字段同时选择 user_name 和 remark，字段间规则逻辑选择 and | 字段选择框展示 user_name、remark 两个字段，字段间规则逻辑展示 and |
| 34 | 统计函数选择【空串率】，校验方法选择占比，操作符选择等于，期望值输入 `{user_name_remark_empty_and_rate}`，点击【保存】，等待规则列表刷新完成 | 多字段 and 空串率规则保存成功，规则卡片展示 user_name + remark、and、空串率、期望值等于 `{user_name_remark_empty_and_rate}` |
| 35 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 36 | 选择完整性校验字段级，字段同时选择 user_name 和 remark，字段间规则逻辑选择 or | 字段选择框展示 user_name、remark 两个字段，字段间规则逻辑展示 or |
| 37 | 统计函数选择【空串数】，校验方法选择固定值，操作符选择等于，期望值输入 `{user_name_remark_empty_or_cnt}`，点击【保存】，等待规则列表刷新完成 | 多字段 or 空串数规则保存成功，规则卡片展示 user_name + remark、or、空串数、期望值等于 `{user_name_remark_empty_or_cnt}` |
| 38 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 39 | 选择完整性校验字段级，字段同时选择 user_name 和 remark，字段间规则逻辑选择 or | 字段选择框展示 user_name、remark 两个字段，字段间规则逻辑展示 or |
| 40 | 统计函数选择【空串率】，校验方法选择占比，操作符选择等于，期望值输入 `{user_name_remark_empty_or_rate}`，点击【保存】，等待规则列表刷新完成 | 多字段 or 空串率规则保存成功，规则卡片展示 user_name + remark、or、空串率、期望值等于 `{user_name_remark_empty_or_rate}` |
| 41 | 点击【下一步】，等待【调度属性】页面加载完成 | 页面展示调度配置、规则拼接包、资源组、告警配置、任务关联、实例生成方式 |
| 42 | 实例生成方式选择【立即生成】，点击【保存】，等待任务列表刷新完成 | 任务列表展示“v63完整性字段级任务” |
| 43 | 打开任务详情，点击【立即执行】，等待提交完成 | 页面提示稍后可在任务查询中查看详情，任务详情仍展示“v63完整性字段级任务” |
| 44 | 进入【数据质量 → 任务实例查询】页面，搜索“v63完整性字段级任务”并等待列表刷新完成 | 最新实例状态为校验通过，详情中单字段、多字段 and、多字段 or 完整性规则实际值均等于执行前 SparkThrift 统计 SQL 的对应预期值 |

##### 【P1】验证完整性表级表行数规则直接添加后结果正确

> 前置条件

```
已确认 dq_test_user_info_300 存在且已同步至数据质量，已执行通用前置条件中的基础统计 SQL 获取 `{row_cnt}`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，等待任务列表加载完成 | 页面展示【新建监控规则】按钮 |
| 2 | 点击【新建监控规则】，等待【监控对象】页面加载完成 | 步骤条停留在监控对象 |
| 3 | 输入规则名称“v63表行数任务”，选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 4 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 5 | 选择数据表 dq_test_user_info_300 | 表单展示所选表 dq_test_user_info_300 |
| 6 | 点击【下一步】，等待【监控规则】页面加载完成 | 页面展示【添加规则】按钮 |
| 7 | 点击【添加规则】，等待规则编辑表单加载完成 | 表单展示规则类型、统计函数、校验方法、期望值、强弱规则配置项 |
| 8 | 选择规则类型【完整性校验】，规则类型选择【表级】 | 统计函数下拉框加载完成 |
| 9 | 统计函数选择【表行数】，校验方法选择固定值，操作符选择等于，期望值输入 `{row_cnt}`，强弱规则选择强规则，点击【保存】，等待规则卡片保存完成 | 规则卡片展示表级、表行数、期望值等于 `{row_cnt}` |
| 10 | 进入【调度属性】，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成 | 任务“v63表行数任务”创建成功 |
| 11 | 在任务详情点击【立即执行】，等待任务实例查询生成最新实例 | 最新实例状态为校验通过，表行数实际值为 `{row_cnt}` |
| 12 | 编辑该规则，将期望值改为大于 `{row_cnt}`，保存后重新立即执行 | 最新实例状态为校验异常，表行数实际值为 `{row_cnt}`，规则结果标记为不通过 |

#### 唯一性与自定义规则

##### 【P1】验证唯一性单字段和多字段重复统计结果正确

> 前置条件

```
已执行通用前置条件中的重复统计 SQL，获取 `{nick_name_dup_cnt}`、`{nick_name_dup_rate}`、`{user_type_status_dup_cnt}`、`{user_type_status_dup_rate}`。
规则库配置中的唯一性校验处于开启状态。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成 | 进入新建单表校验规则流程 |
| 2 | 输入规则名称“v63唯一性任务” | 规则名称输入框展示“v63唯一性任务” |
| 3 | 选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 4 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 5 | 选择数据表 dq_test_user_info_300 | 监控对象配置完成，数据预览区域可查看表字段 |
| 6 | 点击【下一步】，等待监控规则页面加载完成 | 页面展示【添加规则】按钮 |
| 7 | 点击【添加规则】，等待规则编辑表单加载完成 | 表单展示规则类型、字段、统计函数、校验方法、期望值配置项 |
| 8 | 选择规则类型【唯一性校验】，字段选择 nick_name | 统计函数根据单字段唯一性规则加载 |
| 9 | 统计函数选择【重复数】，校验方法选择固定值，操作符选择等于，期望值输入 `{nick_name_dup_cnt}`，点击【保存】，等待规则卡片保存完成 | 规则卡片展示 nick_name 重复数、期望值等于 `{nick_name_dup_cnt}` |
| 10 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 11 | 选择唯一性校验，字段选择 nick_name，统计函数选择【重复率】，校验方法选择占比，期望值输入 `{nick_name_dup_rate}`，点击【保存】，等待规则列表刷新完成 | 规则列表新增 nick_name 重复率规则，期望值等于 `{nick_name_dup_rate}` |
| 12 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 13 | 选择唯一性校验，字段同时选择 user_type 和 status | 多字段唯一性规则编辑区展示 user_type、status |
| 14 | 统计函数选择【重复数】，校验方法选择固定值，操作符选择等于，期望值输入 `{user_type_status_dup_cnt}`，点击【保存】，等待规则列表刷新完成 | 规则列表新增 user_type + status 多字段重复数规则 |
| 15 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增规则编辑表单展示为空白可编辑状态 |
| 16 | 选择唯一性校验，字段同时选择 user_type 和 status，统计函数选择【重复率】，校验方法选择占比，期望值输入 `{user_type_status_dup_rate}`，点击【保存】，等待规则列表刷新完成 | 规则列表展示单字段重复数、单字段重复率、多字段重复数、多字段重复率 4 条规则 |
| 17 | 进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成 | 任务“v63唯一性任务”创建成功 |
| 18 | 点击【立即执行】，等待任务实例查询生成最新实例 | 最新实例状态为校验通过，nick_name 与 user_type + status 的重复数、重复率实际值均等于执行前 SparkThrift 统计 SQL 的对应预期值 |

##### 【P1】验证自定义 SQL 单表规则通过和不通过结果正确

> 前置条件

```
已执行通用前置条件中的基础统计 SQL，获取 `{status_a_cnt}`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成 | 进入新建单表校验规则流程 |
| 2 | 输入规则名称“v63自定义SQL任务” | 规则名称输入框展示“v63自定义SQL任务” |
| 3 | 选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 4 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 5 | 选择数据表 dq_test_user_info_300 | 监控对象配置完成，数据预览区域可查看表字段 |
| 6 | 点击【下一步】，等待监控规则页面加载完成 | 页面展示【添加规则】按钮 |
| 7 | 点击【添加规则】，等待规则编辑表单加载完成 | 表单展示规则类型和自定义 SQL 配置项 |
| 8 | 选择规则类型【自定义SQL】 | 自定义 SQL 输入框和期望值配置项展示 |
| 9 | 输入 SQL：`SELECT id FROM dq_test_user_info_300 WHERE status='A'` | SQL 输入框展示完整 SQL |
| 10 | 校验方法选择固定值，操作符选择等于，期望值输入 `{status_a_cnt}`，强弱规则选择强规则，点击【保存】，等待规则卡片保存完成 | 规则卡片展示自定义 SQL、期望值等于 `{status_a_cnt}` |
| 11 | 进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成 | 任务“v63自定义SQL任务”创建成功 |
| 12 | 点击【立即执行】，等待任务实例查询生成最新实例 | 最新实例状态为校验通过，自定义 SQL 明细查询结果行数为 `{status_a_cnt}` |
| 13 | 编辑规则，将期望值改为 `{status_a_cnt}+1` 后保存并重新立即执行 | 最新实例状态为校验异常，自定义 SQL 实际行数仍为 `{status_a_cnt}` |

## Part2 单表准确性/规范性

### 规则任务配置

#### 准确性校验

##### 【P1】验证准确性求和求平均和正负零值比结果正确

> 前置条件

```
已执行通用前置条件中的基础统计 SQL，获取 `{score_sum}`、`{score_avg}`、`{score_negative_rate}`、`{score_zero_rate}`、`{score_positive_rate}`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成 | 进入新建单表校验规则流程 |
| 2 | 输入规则名称“v63准确性任务” | 规则名称输入框展示“v63准确性任务” |
| 3 | 选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 4 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 5 | 选择数据表 dq_test_user_info_300 | 监控对象配置完成，数据预览区域可查看 score 字段 |
| 6 | 点击【下一步】，等待监控规则页面加载完成 | 页面展示【添加规则】按钮 |
| 7 | 点击【添加规则】，等待规则编辑表单加载完成 | 表单展示规则类型、字段、统计函数、校验方法、期望值配置项 |
| 8 | 选择规则类型【准确性校验】，字段选择 score | 准确性统计函数下拉框加载完成 |
| 9 | 在同一规则中依次添加统计函数【求和】等于 `{score_sum}`、【求平均】等于 `{score_avg}`、【负值比】等于 `{score_negative_rate}`、【零值比】等于 `{score_zero_rate}`、【正值比】等于 `{score_positive_rate}` | 统计规则区域展示 5 条配置，字段均为 score |
| 10 | 强弱规则选择强规则，点击规则行【保存】，等待规则卡片保存完成 | 规则卡片展示 score 字段的 5 条准确性统计配置 |
| 11 | 进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成 | 任务“v63准确性任务”创建成功 |
| 12 | 点击【立即执行】，等待任务实例查询生成最新实例 | 最新实例状态为校验通过，score 求和、平均值、负值比、零值比、正值比均等于执行前 SparkThrift 统计 SQL 的对应预期值 |
| 13 | 编辑规则，将 score 求和期望值改为 `{score_sum}+1` 后重新执行 | 最新实例状态为校验异常，score 求和实际值仍为 `{score_sum}` |

#### 数据类型强转

##### 【P1】验证 string 数字字段强转 int 后各类规则结果正确

> 前置条件

```
已确认 dq_test_string_cast_int 存在且已同步至数据质量，已执行通用前置条件中的强转统计 SQL 获取 `{age_str_null_cnt}`、`{age_str_null_rate}`、`{score_str_sum}`、`{score_str_avg}`、`{score_str_negative_rate}`、`{score_str_zero_rate}`、`{score_str_positive_rate}`、`{age_str_range_invalid_cnt}`、`{enum_num_str_enum_invalid_cnt}`、`{enum_num_str_enum_cnt}`、`{unique_num_str_dup_cnt}`、`{unique_num_str_dup_rate}`、`{unique_num_str_non_dup_cnt}`、`{unique_num_str_non_dup_rate}`、`{score_str_positive_cnt}`。
规则库配置中的完整性、准确性、规范性、唯一性和自定义 SQL 规则均处于开启状态。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成 | 进入新建单表校验规则流程 |
| 2 | 输入规则名称“v63 string强转int专项任务” | 规则名称输入框展示“v63 string强转int专项任务” |
| 3 | 选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 4 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 5 | 选择数据表 dq_test_string_cast_int | 监控对象配置完成，数据预览区域可查看 age_str、score_str、enum_num_str、unique_num_str 字段，字段类型均为 string |
| 6 | 点击【下一步】，等待监控规则页面加载完成 | 页面展示【添加规则】按钮 |
| 7 | 点击【添加规则】，选择规则类型【完整性校验】，规则类型选择【字段级】，字段选择 age_str | 规则编辑表单展示字段 age_str 和完整性统计规则配置区域 |
| 8 | 统计函数选择【空值数】，校验方法选择固定值，操作符选择等于，期望值输入 `{age_str_null_cnt}`，强弱规则选择强规则，点击【保存】，等待规则卡片保存完成 | 规则卡片展示 age_str 空值数，期望值等于 `{age_str_null_cnt}` |
| 9 | 点击【添加规则】，选择完整性校验字段级，字段选择 age_str，统计函数选择【空值率】，校验方法选择占比，操作符选择等于，期望值输入 `{age_str_null_rate}`，点击【保存】，等待规则列表刷新完成 | 规则列表新增 age_str 空值率规则，期望值等于 `{age_str_null_rate}` |
| 10 | 点击【添加规则】，选择规则类型【准确性校验】，字段选择 score_str | 准确性统计函数下拉框加载完成，score_str 作为 string 类型数字字段可配置数值类统计函数 |
| 11 | 在同一规则中依次添加统计函数【求和】等于 `{score_str_sum}`、【求平均】等于 `{score_str_avg}`、【负值比】等于 `{score_str_negative_rate}`、【零值比】等于 `{score_str_zero_rate}`、【正值比】等于 `{score_str_positive_rate}`，点击【保存】 | 规则卡片展示 score_str 的 5 条准确性统计配置，字段类型为 string，统计口径按 int 强转后的数值计算 |
| 12 | 点击【添加规则】，选择规则类型【规范性校验】，字段选择 age_str，在【统计规则】第 1 行选择【数值-取值范围】 | 统计规则行切换为取值范围输入形态 |
| 13 | 左边界操作符选择【>=】并输入 `0`，字段间关系选择【AND】，右边界操作符选择【<=】并输入 `120`，过滤条件保持为空，规则描述填写“age_str 强转 int 后范围需在 0 到 120”，点击【保存】 | 规则卡片展示字段 age_str，统计规则为数值-取值范围，范围条件为 `age_str >= 0 AND age_str <= 120` |
| 14 | 点击【添加规则】，选择规范性校验，字段选择 enum_num_str，在【统计规则】第 1 行选择【数值-枚举范围】 | 统计规则行展示数值枚举范围配置区 |
| 15 | 期望值类型选择【固定值】，操作符选择【=】，数值输入 `0,1,2`，过滤条件保持为空，规则描述填写“enum_num_str 强转 int 后只能为 0、1、2”，点击【保存】 | 规则卡片展示字段 enum_num_str，统计规则为数值-枚举范围，枚举范围值为 `0,1,2` |
| 16 | 点击【添加规则】，选择规范性校验，字段选择 enum_num_str，在【统计规则】第 1 行选择【数值-枚举个数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{enum_num_str_enum_cnt}`，点击【保存】 | 规则卡片展示字段 enum_num_str，统计规则为数值-枚举个数，期望值等于 `{enum_num_str_enum_cnt}` |
| 17 | 点击【添加规则】，选择规范性校验，字段选择 age_str，在【统计规则】第 1 行选择【空值数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{age_str_null_cnt}`，点击【保存】 | 规则卡片展示 age_str 规范性空值数，期望值等于 `{age_str_null_cnt}` |
| 18 | 点击【添加规则】，选择规范性校验，字段选择 unique_num_str，在【统计规则】第 1 行选择【重复数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{unique_num_str_dup_cnt}`，点击【保存】 | 规则卡片展示 unique_num_str 规范性重复数，期望值等于 `{unique_num_str_dup_cnt}` |
| 19 | 点击【添加规则】，选择规范性校验，字段选择 enum_num_str，在【统计规则】第 1 行选择【枚举值】 | 统计规则行展示枚举值信息输入框 |
| 20 | 在枚举值信息输入框中录入枚举值字符串 `0,1,2`，过滤条件保持为空，规则描述填写“enum_num_str 强转 int 后枚举值限定为 0/1/2”，点击【保存】 | 规则列表展示 enum_num_str 枚举值信息规则 |
| 21 | 点击【添加规则】，选择规则类型【唯一性校验】，字段选择 unique_num_str，统计函数选择【重复数】，校验方法选择固定值，操作符选择等于，期望值输入 `{unique_num_str_dup_cnt}`，点击【保存】 | 规则卡片展示 unique_num_str 唯一性重复数，期望值等于 `{unique_num_str_dup_cnt}` |
| 22 | 点击【添加规则】，选择唯一性校验，字段选择 unique_num_str，统计函数选择【重复率】，校验方法选择占比，操作符选择等于，期望值输入 `{unique_num_str_dup_rate}`，点击【保存】 | 规则列表新增 unique_num_str 唯一性重复率规则，期望值等于 `{unique_num_str_dup_rate}` |
| 23 | 点击【添加规则】，选择唯一性校验，字段选择 unique_num_str，统计函数选择【非重复个数】，校验方法选择固定值，操作符选择等于，期望值输入 `{unique_num_str_non_dup_cnt}`，点击【保存】 | 规则列表新增 unique_num_str 非重复个数规则，期望值等于 `{unique_num_str_non_dup_cnt}` |
| 24 | 点击【添加规则】，选择唯一性校验，字段选择 unique_num_str，统计函数选择【非重复占比】，校验方法选择占比，操作符选择等于，期望值输入 `{unique_num_str_non_dup_rate}`，点击【保存】 | 规则列表新增 unique_num_str 非重复占比规则，期望值等于 `{unique_num_str_non_dup_rate}` |
| 25 | 点击【添加规则】，选择规则类型【自定义SQL】，输入 SQL：`SELECT id FROM dq_test_string_cast_int WHERE CAST(score_str AS INT) > 0` | SQL 输入框展示完整 SQL，语句使用 string 类型 score_str 强转 int 后进行数值过滤 |
| 26 | 校验方法选择固定值，操作符选择等于，期望值输入 `{score_str_positive_cnt}`，强弱规则选择强规则，点击【保存】，等待规则卡片保存完成 | 规则卡片展示自定义 SQL、期望值等于 `{score_str_positive_cnt}` |
| 27 | 进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成 | 任务“v63 string强转int专项任务”创建成功 |
| 28 | 点击【立即执行】，等待任务实例查询生成最新实例 | 最新实例状态为校验通过，完整性、准确性、规范性、唯一性和自定义 SQL 中的 string 数字字段强转 int 规则实际值均等于执行前 SparkThrift 统计 SQL 的对应预期值 |
| 29 | 打开实例详情，查看规范性和自定义 SQL 规则明细 | age_str 数值范围不通过明细数等于 `{age_str_range_invalid_cnt}`；enum_num_str 非 `0/1/2` 明细数等于 `{enum_num_str_enum_invalid_cnt}`；自定义 SQL 明细查询结果行数等于 `{score_str_positive_cnt}` |

#### 规范性校验

##### 【P1】验证规范性数值范围和枚举类规则结果正确

> 前置条件

```
已执行通用前置条件中的基础统计 SQL，获取 `{age_range_invalid_cnt}`、`{gender_enum_invalid_cnt}`、`{user_type_enum_cnt}`、`{user_type_enum_invalid_cnt}`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成 | 进入新建单表校验规则流程 |
| 2 | 输入规则名称“v63规范性数值枚举任务” | 规则名称输入框展示“v63规范性数值枚举任务” |
| 3 | 选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 4 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 5 | 选择数据表 dq_test_user_info_300 | 监控对象配置完成，数据预览区域可查看 age、gender、user_type 字段 |
| 6 | 点击【下一步】，等待监控规则页面加载完成 | 页面展示【添加规则】按钮 |
| 7 | 点击【添加规则】，等待规则编辑表单加载完成 | 表单展示【规范性校验】卡片，包含【字段】【统计规则】【强弱规则】【规则描述】【保存】【取消】 |
| 8 | 规则类型选择【规范性校验】，字段选择 age，在【统计规则】第 1 行选择【数值-取值范围】 | 统计规则行切换为取值范围输入形态，展示左边界操作符、左边界值、字段间关系、右边界操作符、右边界值和过滤条件 |
| 9 | 左边界操作符选择【>=】并输入 `0`，字段间关系选择【AND】，右边界操作符选择【<=】并输入 `120`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“age 范围需在 0 到 120”，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 age，统计规则为数值-取值范围，范围条件为 `age >= 0 AND age <= 120` |
| 10 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 11 | 字段选择 gender，在【统计规则】第 1 行选择【数值-枚举范围】 | 统计规则行展示【期望值】配置区，期望值类型下拉包含【固定值】【占比】，操作符下拉展示 `=`、`!=` |
| 12 | 期望值类型选择【固定值】，操作符选择【=】，数值输入 `0,1,2`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“gender 只能为 0、1、2”，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 gender，统计规则为数值-枚举范围，枚举范围值为 `0,1,2` |
| 13 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 14 | 字段选择 user_type，在【统计规则】第 1 行选择【数值-枚举个数】，【期望值】类型选择【固定值】，操作符选择【=】，数值输入 `{user_type_enum_cnt}`，过滤条件保持为空，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 user_type，统计规则为数值-枚举个数，期望值为固定值等于 `{user_type_enum_cnt}` |
| 15 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 16 | 字段选择 user_type，在【统计规则】第 1 行选择【枚举值信息】 | 统计规则行展示枚举值信息输入框，支持以标签形式录入多个枚举值 |
| 17 | 在枚举值信息输入框中录入枚举值字符串 `VIP,NORMAL,GUEST` | 枚举值信息输入框展示已录入的枚举值字符串 `VIP,NORMAL,GUEST` |
| 18 | 过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“user_type 只能为 VIP/NORMAL/GUEST”，点击【保存】，等待规则列表刷新完成 | 规则列表展示 age 数值-取值范围、gender 数值-枚举范围、user_type 数值-枚举个数、user_type 枚举值信息四条规范性规则 |
| 19 | 进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成 | 任务“v63规范性数值枚举任务”创建成功 |
| 20 | 点击【立即执行】，等待任务实例查询生成最新实例 | 最新实例生成后，age 越界明细数等于 `{age_range_invalid_cnt}`，gender 非 `0/1/2` 明细数等于 `{gender_enum_invalid_cnt}`，user_type 枚举个数等于 `{user_type_enum_cnt}`，user_type 非枚举值明细数等于 `{user_type_enum_invalid_cnt}` |

##### 【P1】验证规范性身份证手机号邮箱格式规则结果正确

> 前置条件

```
已执行通用前置条件中的基础统计 SQL，获取 `{id_card_valid_cnt}`、`{mobile_valid_cnt}`、`{email_valid_cnt}`、`{id_card_invalid_cnt}`、`{mobile_invalid_cnt}`、`{email_invalid_cnt}`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成 | 进入新建单表校验规则流程 |
| 2 | 输入规则名称“v63规范性格式任务” | 规则名称输入框展示“v63规范性格式任务” |
| 3 | 选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 4 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 5 | 选择数据表 dq_test_user_info_300 | 监控对象配置完成，数据预览区域可查看 id_card_no、mobile_no、email 字段 |
| 6 | 点击【下一步】，等待监控规则页面加载完成 | 页面展示【添加规则】按钮 |
| 7 | 点击【添加规则】，等待规则编辑表单加载完成 | 表单展示【规范性校验】卡片，包含【字段】【统计规则】【强弱规则】【规则描述】【保存】【取消】 |
| 8 | 规则类型选择【规范性校验】，字段选择 id_card_no，在【统计规则】第 1 行选择【格式-身份证号】 | 统计规则行展示【期望值】配置区，期望值类型下拉包含【固定值】【占比】，操作符下拉展示 `>`、`>=`、`=`、`<`、`<=`、`!=` |
| 9 | 期望值类型选择【固定值】，操作符选择【=】，数值输入 `{id_card_valid_cnt}`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“身份证号格式需符合 18 位身份证规则”，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 id_card_no，统计规则为格式-身份证号，期望值为固定值等于 `{id_card_valid_cnt}` |
| 10 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 11 | 字段选择 mobile_no，在【统计规则】第 1 行选择【格式-手机号】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{mobile_valid_cnt}`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“手机号需符合 11 位手机号格式”，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 mobile_no，统计规则为格式-手机号，期望值为固定值等于 `{mobile_valid_cnt}` |
| 12 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 13 | 字段选择 email，在【统计规则】第 1 行选择【格式-邮箱】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{email_valid_cnt}`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“邮箱需符合标准邮箱格式”，点击【保存】，等待规则列表刷新完成 | 规则列表展示身份证号、手机号、邮箱三条格式规则，三条规则均为固定值校验 |
| 14 | 进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成 | 任务“v63规范性格式任务”创建成功 |
| 15 | 点击【立即执行】，等待任务实例查询生成最新实例 | 最新实例生成后，身份证号、手机号、邮箱格式规则的符合格式数量分别等于 `{id_card_valid_cnt}`、`{mobile_valid_cnt}`、`{email_valid_cnt}`；不符合格式明细数分别等于 `{id_card_invalid_cnt}`、`{mobile_invalid_cnt}`、`{email_invalid_cnt}` |

##### 【P1】验证规范性字符串长度数据精度空值重复和枚举值规则结果正确

> 前置条件

```
已执行通用前置条件中的基础统计 SQL 和重复统计 SQL，获取 `{user_name_max_len}`、`{user_name_min_len}`、`{user_code_fixed_len_invalid_cnt}`、`{remark_null_cnt}`、`{nick_name_dup_cnt}`、`{status_enum_invalid_cnt}`。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待监控对象页面加载完成 | 进入新建单表校验规则流程 |
| 2 | 输入规则名称“v63规范性综合任务” | 规则名称输入框展示“v63规范性综合任务” |
| 3 | 选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 4 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 5 | 选择数据表 dq_test_user_info_300 | 监控对象配置完成，数据预览区域可查看 user_name、user_code、salary、remark、nick_name、status 字段 |
| 6 | 点击【下一步】，等待监控规则页面加载完成 | 页面展示【添加规则】按钮 |
| 7 | 点击【添加规则】，等待规则编辑表单加载完成 | 表单展示【规范性校验】卡片，包含【字段】【统计规则】【强弱规则】【规则描述】【保存】【取消】 |
| 8 | 规则类型选择【规范性校验】，字段选择 user_name，在【统计规则】第 1 行选择【字符串最大长度】 | 统计规则行展示【期望值】配置区，期望值类型下拉包含【固定值】【占比】 |
| 9 | 期望值类型选择【固定值】，操作符选择【=】，数值输入 `{user_name_max_len}`，过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“user_name 最大长度等于统计值”，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 user_name，统计规则为字符串最大长度，期望值为固定值等于 `{user_name_max_len}` |
| 10 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 11 | 字段选择 user_name，在【统计规则】第 1 行选择【字符串最小长度】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{user_name_min_len}`，过滤条件保持为空，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 user_name，统计规则为字符串最小长度，期望值为固定值等于 `{user_name_min_len}` |
| 12 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 13 | 字段选择 user_code，在【统计规则】第 1 行选择【字符串长度】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `11`，过滤条件保持为空，规则描述填写“user_code 长度固定为 11”，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 user_code，统计规则为字符串长度，期望长度为固定值等于 `11` |
| 14 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 15 | 字段选择 salary，在【统计规则】第 1 行选择【数据精度】 | 统计规则行切换为数据精度输入形态，展示【小数点前】操作符和值、AND/OR 关系、【小数点后】操作符和值 |
| 16 | 【小数点前】操作符选择【=】并输入 `10`，关系选择【且】，【小数点后】操作符选择【=】并输入 `2`，过滤条件保持为空，规则描述填写“salary 数据精度为小数点前 10 位、小数点后 2 位”，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 salary，统计规则为数据精度，精度条件为小数点前 `=10` 且小数点后 `=2` |
| 17 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 18 | 字段选择 remark，在【统计规则】第 1 行选择【空值数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{remark_null_cnt}`，过滤条件保持为空，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 remark，统计规则为空值数，期望值为固定值等于 `{remark_null_cnt}` |
| 19 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 20 | 字段选择 nick_name，在【统计规则】第 1 行选择【重复数】，期望值类型选择【固定值】，操作符选择【=】，数值输入 `{nick_name_dup_cnt}`，过滤条件保持为空，点击【保存】，等待规则卡片保存完成 | 规则卡片展示字段 nick_name，统计规则为重复数，期望值为固定值等于 `{nick_name_dup_cnt}` |
| 21 | 点击【添加规则】，等待规则编辑表单加载完成 | 新增【规范性校验】规则卡片展示为空白可编辑状态 |
| 22 | 字段选择 status，在【统计规则】第 1 行选择【枚举值】 | 统计规则行展示枚举值信息输入框，支持以标签形式录入多个枚举值 |
| 23 | 在枚举值信息输入框中录入枚举值字符串 `A,I,D` | 枚举值信息输入框展示已录入的枚举值字符串 `A,I,D` |
| 24 | 过滤条件保持为空，强弱规则选择【弱规则】，规则描述填写“status 只能为 A/I/D”，点击【保存】，等待规则列表刷新完成 | 规则列表展示最大字符串长度、最小字符串长度、固定字符串长度、数据精度、空值数、重复数、枚举值信息规则 |
| 25 | 进入调度属性，实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成 | 任务“v63规范性综合任务”创建成功 |
| 26 | 点击【立即执行】，等待任务实例查询生成最新实例 | 最新实例生成后，user_name 最大/最小长度、remark 空值数、nick_name 重复数与执行前 SparkThrift 统计 SQL 一致；user_code 长度不符合明细数等于 `{user_code_fixed_len_invalid_cnt}`；status 非 `A/I/D` 明细数等于 `{status_enum_invalid_cnt}` |

## Part3 多表规则、任务实例查询、质量报告

### 多表比对规则

#### 同源数据对比

##### 【P1】验证同源数据对比规则创建和执行成功

> 前置条件

```
已确认 dq_test_user_info_300 已同步至数据质量。
同源比对使用 dq_test_user_info_300 同时作为主表和对照表。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待规则类型选择入口展示 | 页面可选择单表校验规则或多表比对规则 |
| 2 | 选择【多表比对规则】，等待新建多表比对规则页面加载完成 | 步骤条展示【选择对比表】【选择字段】【执行配置】 |
| 3 | 在【选择对比表】输入规则名称“v63同源数据对比任务” | 规则名称输入框展示该名称 |
| 4 | 选择对比类型【同源数据对比】 | 主表和对照表区域展示同一数据源选择逻辑 |
| 5 | 主表选择 SparkThrift 数据源 | 主表数据库下拉框加载完成 |
| 6 | 主表选择数据库 pw_test | 主表数据表下拉框加载完成 |
| 7 | 主表选择数据表 dq_test_user_info_300 | 主表信息展示完整 |
| 8 | 对照表选择同一 SparkThrift 数据源 | 对照表数据库下拉框加载完成 |
| 9 | 对照表选择数据库 pw_test | 对照表数据表下拉框加载完成 |
| 10 | 对照表选择数据表 dq_test_user_info_300 | 对照表信息展示完整 |
| 11 | 点击【下一步】，等待【选择字段】页面加载完成 | 页面提示通过连线配置字段映射，并展示【同名映射】能力 |
| 12 | 点击【同名映射】，等待字段映射关系生成完成 | id、user_code、user_name、score 等同名字段完成映射 |
| 13 | 选择 id 为逻辑主键 | id 字段标记为逻辑主键 |
| 14 | 勾选记录数差异比对，差异阈值配置为 0，点击【下一步】，等待执行配置页面加载完成 | 进入执行配置页面 |
| 15 | 实例生成方式选择【立即生成】，点击【保存】，等待任务列表刷新完成 | 多表比对任务“v63同源数据对比任务”创建成功 |
| 16 | 点击任务【立即执行】，等待任务实例查询生成最新实例 | 最新实例状态为校验通过，整体校验差异总数为 0 |

#### 跨源数据对比

##### 【P2】验证跨源数据对比仅配置行数差异比对(SparkThrift2.x不支持)

> 前置条件

```
已确认 dq_test_user_info_300 已同步至数据质量。
若标品环境只有一个 SparkThrift 数据源，可选择同类型的另一已授权 SparkThrift 数据源作为对照源；若无第二数据源，本用例记录为环境阻塞。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 规则任务配置】页面，点击【新建监控规则】，等待规则类型选择入口展示 | 页面可选择多表比对规则 |
| 2 | 选择【多表比对规则】，等待【选择对比表】页面加载完成 | 步骤条展示选择对比表、选择字段、执行配置 |
| 3 | 输入规则名称“v63跨源数据对比任务” | 规则名称输入框展示“v63跨源数据对比任务” |
| 4 | 选择对比类型【跨源数据对比】 | 页面展示跨源数据对比说明，提示跨源比对内容仅支持行数差异比对 |
| 5 | 主表选择 SparkThrift 数据源 | 主表数据库下拉框加载完成 |
| 6 | 主表选择数据库 pw_test | 主表数据表下拉框加载完成 |
| 7 | 主表选择数据表 dq_test_user_info_300 | 主表信息展示完整 |
| 8 | 对照表选择另一已授权数据源 | 对照表数据库下拉框加载完成；若无第二数据源，本用例记录为环境阻塞 |
| 9 | 对照表选择 dq_test_user_info_300 或同结构对照表 | 对照表信息展示完整 |
| 10 | 点击【下一步】，等待字段选择页面加载完成 | 字段映射区域展示逻辑主键和差异设置 |
| 11 | 配置 id 为逻辑主键，勾选行数差异比对，阈值配置为 0 | 行数差异比对配置完成 |
| 12 | 点击【下一步】，等待执行配置页面加载完成 | 页面展示实例生成方式和保存入口 |
| 13 | 实例生成方式选择【立即生成】，点击【保存】并等待任务列表刷新完成 | 跨源数据对比任务创建成功 |
| 14 | 点击【立即执行】，等待任务实例查询生成最新实例 | 若两表记录一致，实例状态为校验通过；若记录数不一致，实例状态为校验异常并展示行数差异 |

### 任务实例查询

#### 搜索和明细

##### 【P1】验证任务实例查询支持搜索实例和查看规则明细

> 前置条件

```
已执行“v63完整性字段级任务”，任务实例查询中存在最新实例。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 任务实例查询】页面，等待实例列表加载完成 | 页面 URL 为 `#/dq/taskQuery`，列表展示表名、任务名称、执行时间、校验状态 |
| 2 | 在搜索条件输入任务名称“v63完整性字段级任务”，点击【查询】，等待列表刷新完成 | 列表仅展示匹配该任务名称的实例记录 |
| 3 | 点击实例表名或详情入口，等待详情抽屉加载完成 | 抽屉展示任务基础信息、规则结果和校验未通过统计 |
| 4 | 在 user_code 空值数规则卡片点击【查看明细】，等待明细表格加载完成 | 明细表格展示 user_code 为空的记录；明细数量和样例 id 与 `SELECT id FROM dq_test_user_info_300 WHERE user_code IS NULL LIMIT 20` 查询结果一致 |
| 5 | 点击【查看趋势】，等待趋势图加载完成 | 趋势图展示该规则最近执行记录，当前执行点实际值为 `{user_code_null_cnt}` |

#### 状态和日志

##### 【P2】验证任务实例查询展示通过异常和失败日志

> 前置条件

```
已准备校验通过实例、校验异常实例和 SQL 配置错误导致的运行失败实例。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 任务实例查询】页面，等待实例列表加载完成 | 实例列表正常展示 |
| 2 | 搜索“v63表行数任务”并打开最新实例详情 | 实例状态为校验通过，表行数实际值为 `{row_cnt}` |
| 3 | 搜索期望值被改错后的“v63唯一性任务”并打开最新实例详情 | 实例状态为校验异常，nick_name 重复数实际值为 `{nick_name_dup_cnt}` |
| 4 | 搜索 SQL 配置错误的测试实例并打开详情 | 实例状态为运行失败或校验异常，详情中展示日志入口 |
| 5 | 点击日志入口并等待日志内容加载完成 | 日志展示 SQL 执行失败原因，错误信息与配置错误一致 |

### 质量报告

#### 报告生成与详情

##### 【P1】验证质量报告生成后展示规则结果和数据准确性

> 前置条件

```
已执行“v63准确性任务”和“v63规范性格式任务”，任务实例查询中存在最新实例。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 质量报告】页面，等待报告列表加载完成 | 页面 URL 为 `#/dq/qualityReport`，展示报告列表和生成报告入口 |
| 2 | 点击生成报告入口，等待报告生成表单加载完成 | 表单展示数据源、数据库、数据表、报告周期字段 |
| 3 | 选择 SparkThrift 数据源 | 数据库下拉框加载完成 |
| 4 | 选择数据库 pw_test | 数据表下拉框加载完成 |
| 5 | 选择数据表 dq_test_user_info_300，报告周期选择一次性 | 表单中所选库表与已执行过的质量任务一致 |
| 6 | 点击【确定】，等待报告生成任务提交完成 | 提示报告生成任务提交成功 |
| 7 | 轮询报告列表直到新报告记录出现 | 报告列表展示 dq_test_user_info_300 的最新报告记录 |
| 8 | 打开最新报告详情，等待详情页面加载完成 | 报告详情展示数据源、数据库、数据表、报告生成时间和规则结果区域 |
| 9 | 查看准确性规则结果 | score 求和、平均值、负值比、零值比、正值比均等于执行前 SparkThrift 统计 SQL 的对应预期值 |
| 10 | 查看格式规则结果 | 身份证号、手机号、邮箱格式规则的不通过数均等于执行前 SparkThrift 统计 SQL 的对应预期值，数据准确性统计与任务实例查询一致 |

## Part4 项目信息、脏数据管理

### 项目管理

#### 项目信息

##### 【P1】验证项目信息新增表单校验和保存成功

> 前置条件

```
当前登录用户为租户管理员，具备数据质量项目管理权限。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 项目管理】页面，等待项目列表加载完成 | 页面 URL 为 `#/dq/project/projectList`，展示【创建项目】按钮和项目列表 |
| 2 | 点击【创建项目】，等待创建项目弹窗加载完成 | 弹窗展示项目名称、项目标识、管理员、项目描述字段 |
| 3 | 项目名称输入 65 个字符，项目标识输入包含特殊字符的 65 个字符，不选择管理员，点击【确定】，等待表单校验完成 | 项目名称提示不超过 64 个字符；项目标识提示不超过 64 个字符且只支持字母、数字、下划线；管理员提示请选择管理员用户 |
| 4 | 将项目名称改为“v63回归项目”，项目标识改为“v63_regression_project”，管理员选择当前登录用户，项目描述输入“v63回归项目描述” | 表单字段展示输入值 |
| 5 | 点击【确定】，等待项目列表刷新完成 | 提示创建成功，项目列表展示“v63回归项目”和项目标识“v63_regression_project” |
| 6 | 使用项目名称“v63回归项目”搜索并等待列表刷新完成 | 列表仅展示匹配的项目记录 |

##### 【P2】验证项目信息编辑置顶和删除流程正确

> 前置条件

```
已创建项目“v63回归项目”，该项目未被生产任务使用。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 项目管理】页面，等待项目列表加载完成 | 列表展示项目“v63回归项目” |
| 2 | 点击项目操作列【编辑】，等待编辑项目弹窗加载完成 | 弹窗回显项目名称、项目标识、管理员、项目描述 |
| 3 | 将项目描述修改为“v63回归项目描述-已编辑”，点击【确定】，等待列表刷新完成 | 项目描述更新为“v63回归项目描述-已编辑” |
| 4 | 点击项目操作列【置顶】，等待列表刷新完成 | 项目“v63回归项目”展示在列表顶部 |
| 5 | 点击项目操作列【删除】 | 弹出删除确认，提示项目被删除后对应任务、规则将被删除且无法恢复 |
| 6 | 点击【取消】关闭删除确认，等待确认弹窗关闭 | 项目未删除，列表仍展示“v63回归项目” |

### 脏数据管理

#### 脏数据配置和明细

##### 【P1】验证脏数据独立存储开启后可查看和下载异常明细

> 前置条件

```
已存在质量项目 test_007。
已执行会产生校验异常的“v63完整性字段级任务”。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 项目管理】页面，等待项目列表加载完成 | 项目列表展示 test_007 |
| 2 | 进入 test_007 项目详情，切换到【脏数据管理】 | 页面展示脏数据存储说明、数据源、数据源类型、脏数据存储库、数据存储时效、操作 |
| 3 | 点击【开启】或【编辑】配置脏数据独立存储，等待配置弹窗加载完成 | 弹窗展示校验数据源、是否存储到源库、脏数据存储库、数据存储时效字段 |
| 4 | 选择校验数据源为 SparkThrift 数据源 | 脏数据存储库下拉框加载完成 |
| 5 | 是否存储到源库选择【是】 | 脏数据存储库自动匹配源库或展示可选源库 |
| 6 | 数据存储时效输入 90 天，点击【确定】，等待配置保存完成 | 脏数据存储状态为开启，数据存储时效展示 90 天 |
| 7 | 重新执行“v63完整性字段级任务”，等待任务实例查询生成校验异常实例 | 最新实例状态为校验异常 |
| 8 | 打开实例详情，点击【查看明细】，等待明细表格加载完成 | 明细数据展示 user_code 为空的记录；明细数量和样例 id 与 `SELECT id FROM dq_test_user_info_300 WHERE user_code IS NULL LIMIT 20` 查询结果一致 |
| 9 | 点击明细下载入口，等待下载任务完成 | 下载文件生成成功，文件内容包含 user_code 字段和 SparkThrift 明细查询中的样例 id |

##### 【P2】验证脏数据独立存储关闭后不再新增异常明细存储

> 前置条件

```
test_007 项目已开启脏数据独立存储，并已存在一条可查看明细的校验异常实例。
```

> 用例步骤

| 编号 | 步骤 | 预期 |
| --- | --- | --- |
| 1 | 进入【数据质量 → 项目管理】页面，等待项目列表加载完成 | 项目列表展示 test_007 |
| 2 | 进入 test_007 项目详情，切换到【脏数据管理】 | 脏数据存储状态为开启 |
| 3 | 点击【关闭】，等待关闭操作完成 | 提示关闭独立存储成功，脏数据存储状态为关闭 |
| 4 | 重新执行“v63完整性字段级任务”，等待任务实例查询生成校验异常实例 | 最新实例状态为校验异常 |
| 5 | 打开最新实例详情查看明细入口 | 最新实例不新增独立存储明细，历史实例已存储的明细仍可查看 |
| 6 | 再次点击【开启】，等待配置弹窗加载完成 | 弹窗回显上一次保存的 SparkThrift 数据源和存储时效 |
| 7 | 点击【确定】，等待配置保存完成 | 脏数据存储状态为开启，后续校验异常实例恢复明细存 |
