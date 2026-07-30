-- v6.4.11 脏数据明细 1 万行补丁（SparkThrift2.x）
-- 数据库: dtstack_smoke; 批次: qzmkxjrp; 分区: 2026-07-19
-- 仅覆盖 §52（有效性）和 §60（完整性）两张已存在表，不删除表、不做元数据同步。
-- 每条 INSERT OVERWRITE 都生成精确 10000 行。

-- §52：有效性校验查看明细；string_num 使用超出枚举/范围的值。
INSERT OVERWRITE TABLE dtstack_smoke.test_info_1_qzmkxjrp_52
PARTITION (dt)
SELECT CAST(1 + (sequence % 99) AS INT) AS id,
       25 AS age,
       CAST(10000 + sequence AS STRING) AS string_num,
       CONCAT('脏数据', LPAD(CAST(sequence + 1 AS STRING), 6, '0')) AS name,
       CONCAT('明细校验地址', LPAD(CAST(sequence + 1 AS STRING), 6, '0')) AS address,
       '9' AS money,
       DATE_ADD(CURRENT_DATE(), -30 - CAST(sequence % 30 AS INT)) AS buy_date,
       CONCAT('有效性不通过明细', LPAD(CAST(sequence + 1 AS STRING), 6, '0')) AS date_detail,
       '2026-07-19' AS dt
FROM range(10000) AS dirty(sequence);

-- §60：完整性校验查看明细；空值/空串字段用于制造完整性脏数据。
INSERT OVERWRITE TABLE dtstack_smoke.test_info_1_qzmkxjrp_60
PARTITION (dt)
SELECT CAST(1 + (sequence % 99) AS INT) AS id,
       CAST(NULL AS INT) AS age,
       '' AS string_num,
       '' AS name,
       '' AS address,
       CAST(NULL AS STRING) AS money,
       CAST(NULL AS DATE) AS buy_date,
       '' AS date_detail,
       '2026-07-19' AS dt
FROM range(10000) AS dirty(sequence);
