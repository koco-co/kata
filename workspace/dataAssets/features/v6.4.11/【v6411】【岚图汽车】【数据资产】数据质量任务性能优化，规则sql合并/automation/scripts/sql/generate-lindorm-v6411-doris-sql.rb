#!/usr/bin/env ruby
# frozen_string_literal: true

require "csv"
require_relative "options"

INPUT_PATH = File.join(INPUT_DIR, "数据资产_STD-用例_6.4.11.csv")
OUTPUT_PATH = File.join(SQL_DIR, "lindorm-doris-test_info_1.sql")
TARGET_MODULE = "【岚图】【数据资产】数据质量任务性能优化"
DORIS_CASE_START = 1
DORIS_CASE_END = 36
COMPARE_CASE_END = 10
DONOR_CASE_BY_MISSING_DDL = { 16 => 20, 24 => 31 }.freeze
SOURCE_PARTITION_DATE = "2026-05-19"
SOURCE_PARTITION_END_DATE = "2026-05-20"
BIZ_DATE = render_business_date.freeze
BIZ_DATE_END = (Date.parse(BIZ_DATE) + 1).strftime("%Y-%m-%d").freeze
DIRTY_DETAIL_ROW_COUNT = 10_000

def decode_html(value)
  value.to_s
       .gsub("&#039;", "'")
       .gsub("&apos;", "'")
       .gsub("&quot;", '"')
       .gsub("&nbsp;", " ")
       .gsub("&amp;", "&")
       .gsub("&lt;", "<")
       .gsub("&gt;", ">")
       .gsub(/<[^>]+>/, "")
       .tr("“”", '""')
end

def doris_rows
  CSV.read(INPUT_PATH, headers: true).select do |row|
    module_name = row["所属模块"].to_s
    module_name.include?(TARGET_MODULE) && !module_name.include?("落标检查")
  end
end

def has_ddl?(row)
  body = decode_html(row["前置条件"])
  body.match?(/CREATE TABLE.*?;/m) && body.match?(/INSERT INTO.*?;/m)
end

def source_sql(row)
  body = decode_html(row["前置条件"])
  create = body.match(/CREATE TABLE.*?;/m)&.to_s
  alter = body.match(/ALTER TABLE.*?;/m)&.to_s
  insert = body.match(/INSERT INTO.*?;/m)&.to_s
  statements = [create, alter, insert].compact
  raise "source precondition has no explicit Doris CREATE/ALTER/INSERT (case=#{row['用例编号']})" unless statements.length == 3

  statements.join("\n")
end

def table_name(case_no, suffix: "{{SUFFIX}}")
  format("test_info_1_%s_%02d", suffix, case_no)
end

def qualify(sql, case_no)
  qualified = "{{DATABASE}}.#{table_name(case_no)}"
  sql.gsub(/(?:[A-Za-z_][\w]*\.)?test_info_1\b/, qualified)
     .gsub(SOURCE_PARTITION_DATE, BIZ_DATE)
     .gsub(SOURCE_PARTITION_END_DATE, BIZ_DATE_END)
     .gsub("p20260519", "p#{BIZ_DATE.delete('-')}")
     .strip
end

def validity_detail_insert(case_no)
  qualified = "{{DATABASE}}.#{table_name(case_no)}"
  <<~SQL.chomp
    INSERT INTO #{qualified}
    SELECT CAST(1 + MOD(number, 99) AS INT) AS id,
           25 AS age,
           CAST(10000 + number AS STRING) AS string_num,
           CONCAT('脏数据', LPAD(CAST(number + 1 AS STRING), 6, '0')) AS name,
           CONCAT('明细校验地址', LPAD(CAST(number + 1 AS STRING), 6, '0')) AS address,
           '9' AS money,
           DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AS buy_date,
           CONCAT('有效性不通过明细', LPAD(CAST(number + 1 AS STRING), 6, '0')) AS date_detail,
           '#{BIZ_DATE}' AS dt
    FROM numbers("number" = "#{DIRTY_DETAIL_ROW_COUNT}");
  SQL
end

def integrity_detail_insert(case_no)
  qualified = "{{DATABASE}}.#{table_name(case_no)}"
  <<~SQL.chomp
    INSERT INTO #{qualified}
    SELECT CAST(1 + MOD(number, 99) AS INT) AS id,
           NULL AS age,
           '' AS string_num,
           '' AS name,
           '' AS address,
           NULL AS money,
           NULL AS buy_date,
           '' AS date_detail,
           '#{BIZ_DATE}' AS dt
    FROM numbers("number" = "#{DIRTY_DETAIL_ROW_COUNT}");
  SQL
end

rows = doris_rows
raise "expected 72 quality cases, got #{rows.length}" unless rows.length == 72

rendered = []
rendered << <<~HEADER
  -- v6.4.11 岚图汽车数据质量任务性能优化，规则 SQL 合并
  -- 目标: Doris3.x §01–§36（36 条）；SparkThrift §37–§72 由 lindorm-test_info_1.sql 提供
  -- Doris 数据源由环境文件 datasources.doris.name 决定
  --
  -- 执行前将 {{DATABASE}} 替换为环境文件 datasources.doris.database，
  -- 将 {{SUFFIX}} 替换为 Playwright 使用的同一 8 位小写字母后缀。
  -- 分区字段 dt 使用与 Spark 批次一致的 T-1 日期 #{BIZ_DATE}。
  -- 本文件只提供人工建表 SQL；Playwright 正式回归使用
  -- playwright.skip_precondition_setup=true 同时跳过 Doris 底表创建和元数据同步。

HEADER

(DORIS_CASE_START..DORIS_CASE_END).each do |case_no|
  row = rows[case_no - 1]
  unless has_ddl?(row)
    donor = DONOR_CASE_BY_MISSING_DDL.fetch(case_no) { raise "no donor mapping for §#{case_no}" }
    row = rows[donor - 1]
  end

  sql = qualify(source_sql(row), case_no)
  sql = sql.sub(/INSERT INTO.*\z/m, validity_detail_insert(case_no)) if case_no == 16
  sql = sql.sub(/INSERT INTO.*\z/m, integrity_detail_insert(case_no)) if case_no == 24
  rendered << "-- §#{format('%02d', case_no)} 主表（源用例 #{case_no}；无独立 DDL 时按 donor 映射复用结构）\n"
  rendered << "#{sql}\n\n"

  next unless case_no <= COMPARE_CASE_END

  compare_sql = sql.gsub(table_name(case_no), "#{table_name(case_no)}_cmp")
  rendered << "-- §#{format('%02d', case_no)} 对比表（同结构、同数据；显式完整 DDL）\n"
  rendered << "#{compare_sql}\n\n"
end

sql = rendered.join
create_count = sql.scan(/\bCREATE\s+TABLE\b/i).length
insert_count = sql.scan(/\bINSERT\s+INTO\b/i).length
alter_count = sql.scan(/\bALTER\s+TABLE\b/i).length
expected_table_count = 36 + 10
raise "expected #{expected_table_count} CREATE TABLE statements, got #{create_count}" unless create_count == expected_table_count
raise "expected #{expected_table_count} INSERT INTO statements, got #{insert_count}" unless insert_count == expected_table_count
raise "expected #{expected_table_count} ALTER TABLE statements, got #{alter_count}" unless alter_count == expected_table_count
raise "CREATE TABLE ... LIKE is forbidden" if sql.match?(/CREATE\s+TABLE[^;]*\bLIKE\b/i)
raise "legacy pw_test database is forbidden" if sql.include?("pw_test")
raise "invalid generated Doris database placeholder" unless sql.scan(/\{\{DATABASE\}\}/).length >= expected_table_count * 3

File.write(OUTPUT_PATH, sql)
puts "generated #{OUTPUT_PATH} (#{create_count} CREATE TABLE, #{alter_count} ALTER TABLE, #{insert_count} INSERT INTO)"
