#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"

sql_path = File.join(__dir__, "lindorm-doris-test_info_1.sql")
database = ENV.fetch("V6411_DORIS_SQL_DATABASE", "test_lindorm_spark")
suffix = ENV.fetch("V6411_DORIS_SQL_SUFFIX", "qzmkxjrp")
expected_date = ENV["V6411_SQL_BIZ_DATE"] || (Time.now.getlocal("+08:00").to_date - 1).strftime("%Y-%m-%d")
raise "invalid V6411_DORIS_SQL_DATABASE: #{database}" unless database.match?(/\A[A-Za-z_][\w]*\z/)
raise "V6411_DORIS_SQL_SUFFIX must be 8 lowercase letters: #{suffix}" unless suffix.match?(/\A[a-z]{8}\z/)
raise "V6411_SQL_BIZ_DATE must be yyyy-MM-dd: #{expected_date}" unless expected_date.match?(/\A\d{4}-\d{2}-\d{2}\z/)

sql = File.read(sql_path).gsub("{{DATABASE}}", database).gsub("{{SUFFIX}}", suffix)
tables = sql.scan(/\bCREATE\s+TABLE\s+#{Regexp.escape(database)}\.([A-Za-z_][\w]*)/i).flatten.uniq
expected_tables = (1..36).map { |case_no| format("test_info_1_%s_%02d", suffix, case_no) }
expected_tables += (1..10).map { |case_no| format("test_info_1_%s_%02d_cmp", suffix, case_no) }
raise "unexpected table set: #{tables.inspect}" unless tables.sort == expected_tables.sort
expected_dates = [expected_date, (Date.parse(expected_date) + 1).strftime("%Y-%m-%d")]
raise "SQL dates are not #{expected_dates.inspect}" unless sql.scan(/'(\d{4}-\d{2}-\d{2})'/).flatten.uniq == expected_dates
raise "SQL contains unresolved placeholder" if sql.include?("{{DATABASE}}") || sql.include?("{{SUFFIX}}")
raise "SQL contains forbidden LIKE" if sql.match?(/CREATE\s+TABLE[^;]*\bLIKE\b/i)
raise "SQL contains legacy pw_test database" if sql.include?("pw_test")

drop_sql = expected_tables.sort.reverse.map { |table| "DROP TABLE IF EXISTS #{database}.#{table};" }.join("\n")
header = <<~SQL
  -- v6.4.11 Lindorm Doris3.x 表重建 SQL
  -- 目标库: #{database}; 数据源: test_lindorm_spark_DORIS_doris; 批次后缀: #{suffix}; 分区: #{expected_date}
  -- 本文件会删除并重建本批次 36 张主表 + 10 张 _cmp 对比表。
  -- 请确认目标表名和库名无误后，在 Doris SQL 环境一次性执行。

SQL
output_path = File.join(__dir__, "lindorm-doris-test_info_1-#{suffix}-drop-recreate.sql")
File.write(output_path, header + "-- 1. 删除旧表\n" + drop_sql + "\n\n-- 2. 重建表并写入 T-1 数据\n" + sql + "\n")
puts "generated #{output_path} (#{expected_tables.length} DROP TABLE, #{expected_tables.length} CREATE TABLE, #{expected_tables.length} INSERT INTO)"
