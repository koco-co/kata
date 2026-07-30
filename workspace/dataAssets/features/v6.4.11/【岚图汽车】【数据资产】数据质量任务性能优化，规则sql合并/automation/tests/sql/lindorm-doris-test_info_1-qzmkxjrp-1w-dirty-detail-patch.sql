-- v6.4.11 脏数据明细 1 万行补丁（Doris3.x）
-- 数据库: dtstack_smoke; 批次: qzmkxjrp; 分区: 2026-07-19
-- 仅覆盖 §16（有效性）和 §24（完整性）两张已存在表，不删除表、不做元数据同步。
-- DELETE 清理当前分区后重新写入；每条 INSERT 都生成精确 10000 行。

-- §16：有效性校验查看明细；string_num 使用超出枚举/范围的值。
DELETE FROM dtstack_smoke.test_info_1_qzmkxjrp_16 WHERE dt = '2026-07-19';
INSERT INTO dtstack_smoke.test_info_1_qzmkxjrp_16
SELECT CAST(1 + MOD(number, 99) AS INT) AS id,
       25 AS age,
       CAST(10000 + number AS STRING) AS string_num,
       CONCAT('脏数据', LPAD(CAST(number + 1 AS STRING), 6, '0')) AS name,
       CONCAT('明细校验地址', LPAD(CAST(number + 1 AS STRING), 6, '0')) AS address,
       '9' AS money,
       DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AS buy_date,
       CONCAT('有效性不通过明细', LPAD(CAST(number + 1 AS STRING), 6, '0')) AS date_detail,
       '2026-07-19' AS dt
FROM numbers("number" = "10000");

-- §24：完整性校验查看明细；空值/空串字段用于制造完整性脏数据。
DELETE FROM dtstack_smoke.test_info_1_qzmkxjrp_24 WHERE dt = '2026-07-19';
INSERT INTO dtstack_smoke.test_info_1_qzmkxjrp_24
SELECT CAST(1 + MOD(number, 99) AS INT) AS id,
       NULL AS age,
       '' AS string_num,
       '' AS name,
       '' AS address,
       NULL AS money,
       NULL AS buy_date,
       '' AS date_detail,
       '2026-07-19' AS dt
FROM numbers("number" = "10000");
