#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"

sql_path = File.join(__dir__, "lindorm-test_info_1.sql")
database = ENV.fetch("V6411_SQL_DATABASE", "dtstack_smoke")
suffix = ENV.fetch("V6411_SQL_SUFFIX", "qzmkxjrp")
raise "invalid V6411_SQL_DATABASE: #{database}" unless database.match?(/\A[A-Za-z_][\w]*\z/)
raise "V6411_SQL_SUFFIX must be 8 lowercase letters: #{suffix}" unless suffix.match?(/\A[a-z]{8}\z/)

expected_date = (Time.now.getlocal("+08:00").to_date - 1).strftime("%Y-%m-%d")
sql = File.read(sql_path).gsub("{{DATABASE}}", database).gsub("{{SUFFIX}}", suffix)
tables = sql.scan(/\bCREATE\s+TABLE\s+#{Regexp.escape(database)}\.([A-Za-z_][\w]*)/i).flatten.uniq
expected_tables = (37..72).map { |case_no| format("test_info_1_%s_%02d", suffix, case_no) }
expected_tables += (37..46).map { |case_no| format("test_info_1_%s_%02d_cmp", suffix, case_no) }
raise "unexpected table set: #{tables.inspect}" unless tables.sort == expected_tables.sort
raise "SQL is not T-1 #{expected_date}" unless sql.scan(/'(\d{4}-\d{2}-\d{2})'\s+AS\s+dt/i).flatten.uniq == [expected_date]

drop_sql = expected_tables.sort.reverse.map { |table| "DROP TABLE IF EXISTS #{database}.#{table};" }.join("\n")
header = <<~SQL
  -- v6.4.11 Lindorm SparkThrift 表重建 SQL
  -- 目标库: #{database}; 批次后缀: #{suffix}; 分区: #{expected_date}
  -- 本文件会删除并重建本批次 36 张主表 + 10 张 _cmp 对比表。
  -- 请确认目标表名和库名无误后，在 SparkSQL 环境一次性执行。

SQL
output_path = File.join(__dir__, "lindorm-test_info_1-#{suffix}-drop-recreate.sql")
File.write(output_path, header + "-- 1. 删除旧表\n" + drop_sql + "\n\n-- 2. 重建表并写入 T-1 数据\n" + sql + "\n")
puts "generated #{output_path} (#{expected_tables.length} DROP TABLE, #{expected_tables.length} CREATE TABLE, #{expected_tables.length} INSERT INTO)"
