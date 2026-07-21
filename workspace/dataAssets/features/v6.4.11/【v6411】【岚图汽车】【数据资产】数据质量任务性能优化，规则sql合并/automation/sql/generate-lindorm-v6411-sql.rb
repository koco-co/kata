#!/usr/bin/env ruby
# frozen_string_literal: true

require "csv"
require "date"

FEATURE_DIR = File.expand_path("../..", __dir__)
INPUT_PATH = File.join(FEATURE_DIR, "inputs", "数据资产_STD-用例_6.4.11.csv")
OUTPUT_PATH = File.join(__dir__, "lindorm-test_info_1.sql")
TARGET_MODULE = "【岚图】【数据资产】数据质量任务性能优化"
SPARK_CASE_START = 37
SPARK_CASE_END = 72
COMPARE_CASE_END = 46
DONOR_CASE_BY_MISSING_DDL = { 52 => 56, 60 => 67 }.freeze
BIZ_DATE = (Time.now.getlocal("+08:00").to_date - 1).strftime("%Y-%m-%d").freeze

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

def spark_rows
  CSV.read(INPUT_PATH, headers: true).select do |row|
    row["所属模块"].to_s.include?(TARGET_MODULE) && !row["所属模块"].to_s.include?("落标检查")
  end
end

def source_sql(row)
  body = decode_html(row["前置条件"])
  create = body.match(/CREATE TABLE.*?;/m)&.to_s
  insert = body.match(/INSERT INTO.*?;/m)&.to_s
  return [create, insert].compact.join("\n") unless create.nil? || insert.nil?

    raise "source precondition has no explicit CREATE TABLE and INSERT INTO (case=#{row['用例编号']})"
end

def table_name(case_no, suffix: "{{SUFFIX}}")
  format("test_info_1_%s_%02d", suffix, case_no)
end

def qualify(sql, case_no)
  qualified = "{{DATABASE}}.#{table_name(case_no)}"
  sql.gsub(/(?:[A-Za-z_][\w]*\.)?test_info_1\b/, qualified)
     .gsub("${bizDate}", BIZ_DATE)
     .strip
end

def validity_detail_insert(case_no)
  qualified = "{{DATABASE}}.#{table_name(case_no)}"
  selects = (0...120).map do |index|
    sequence = format("%03d", index + 1)
    string_num = 10_000 + index
    offset = 30 + (index % 30)
    "SELECT 10 AS id, 25 AS age, '#{string_num}' AS string_num, '脏数据#{sequence}' AS name, " \
      "'明细校验地址#{sequence}' AS address, '9' AS money, " \
      "DATE_ADD(CURRENT_DATE(), -#{offset}) AS buy_date, " \
      "'有效性不通过明细#{sequence}' AS date_detail, '#{BIZ_DATE}' AS dt"
  end
  "INSERT INTO TABLE #{qualified}\nPARTITION (dt)\n#{selects.join("\nUNION ALL\n")};"
end

rows = spark_rows
raise "expected 72 quality cases, got #{rows.length}" unless rows.length == 72

rendered = []
rendered << <<~HEADER
  -- v6.4.11 岚图汽车数据质量任务性能优化，规则 SQL 合并
  -- 目标: SparkThrift2.x §37–§72（36 条）；Doris §01–§36 不在本次回归范围
  --
  -- 执行前将 {{DATABASE}} 替换为环境文件 datasources.sparkthrift.sql.database，
  -- 将 {{SUFFIX}} 替换为 Playwright 使用的同一 8 位小写字母后缀。
  -- 分区字段 dt 统一使用上海时区执行日的 T-1（${bizDate}）。
  -- 本文件只提供人工建表 SQL；Playwright 通过 V6411_UI_SKIP_BASE_TABLE_CREATE=1
  -- 同时跳过底表创建和元数据同步。

HEADER

(SPARK_CASE_START..SPARK_CASE_END).each do |case_no|
  row = rows[case_no - 1]
  if !row["前置条件"].to_s.match?(/CREATE TABLE.*?;/m) || !row["前置条件"].to_s.match?(/INSERT INTO.*?;/m)
    donor = DONOR_CASE_BY_MISSING_DDL.fetch(case_no) { raise "no donor mapping for §#{case_no}" }
    row = rows[donor - 1]
  end

  sql = qualify(source_sql(row), case_no)
  create_sql, insert_sql = sql.split(/(?=INSERT INTO)/m, 2)
  raise "§#{case_no} must contain one CREATE TABLE and one INSERT INTO" if insert_sql.nil?
  insert_sql = validity_detail_insert(case_no) if case_no == 52

  rendered << "-- §#{format('%02d', case_no)} 主表（源用例 #{case_no}；无独立 DDL 时按 donor 映射复用结构）\n"
  rendered << "#{create_sql.rstrip}\n\n#{insert_sql.rstrip}\n\n"

  next unless case_no <= COMPARE_CASE_END

  compare_case_sql = qualify(source_sql(row), case_no).gsub(
    table_name(case_no),
    "#{table_name(case_no)}_cmp",
  )
  compare_create, compare_insert = compare_case_sql.split(/(?=INSERT INTO)/m, 2)
  rendered << "-- §#{format('%02d', case_no)} 对比表（同结构、同数据；显式完整 DDL）\n"
  rendered << "#{compare_create.rstrip}\n\n#{compare_insert.rstrip}\n\n"
end

sql = rendered.join
create_count = sql.scan(/\bCREATE\s+TABLE\b/i).length
insert_count = sql.scan(/\bINSERT\s+INTO\b/i).length
expected_table_count = 36 + 10
raise "expected #{expected_table_count} CREATE TABLE statements, got #{create_count}" unless create_count == expected_table_count
raise "expected #{expected_table_count} INSERT INTO statements, got #{insert_count}" unless insert_count == expected_table_count
raise "CREATE TABLE ... LIKE is forbidden" if sql.match?(/CREATE\s+TABLE[^;]*\bLIKE\b/i)
raise "legacy pw_test database is forbidden" if sql.include?("pw_test")

File.write(OUTPUT_PATH, sql)
puts "generated #{OUTPUT_PATH} (#{create_count} CREATE TABLE, #{insert_count} INSERT INTO)"
