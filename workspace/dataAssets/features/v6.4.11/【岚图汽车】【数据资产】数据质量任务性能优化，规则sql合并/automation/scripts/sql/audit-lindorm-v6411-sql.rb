#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative "options"

sql_path = File.join(SQL_DIR, "lindorm-test_info_1.sql")
sql = File.read(sql_path)

names = sql.scan(/\bCREATE\s+TABLE\s+\{\{DATABASE\}\}\.([A-Za-z_][\w{}]*)(?:\s|\()/i).flatten
expected = (37..72).map { |case_no| format("test_info_1_{{SUFFIX}}_%02d", case_no) }
expected += (37..46).map { |case_no| format("test_info_1_{{SUFFIX}}_%02d_cmp", case_no) }

raise "database placeholder missing" unless sql.include?("{{DATABASE}}")
raise "suffix placeholder missing" unless sql.include?("{{SUFFIX}}")
raise "legacy pw_test database found" if sql.include?("pw_test")
raise "CREATE TABLE ... LIKE found" if sql.match?(/CREATE\s+TABLE[^;]*\bLIKE\b/i)
raise "unexpected CREATE TABLE names: #{names.inspect}" unless names.sort == expected.sort
raise "duplicate CREATE TABLE names" unless names.uniq.length == names.length
raise "expected one INSERT INTO per table" unless sql.scan(/\bINSERT\s+INTO\b/i).length == expected.length
expected_partition = render_business_date
partition_values = sql.scan(/'(\d{4}-\d{2}-\d{2})'\s+AS\s+dt/i).flatten.uniq
raise "partition date must be Shanghai T-1 #{expected_partition}, got #{partition_values.inspect}" unless partition_values == [expected_partition]
case_52 = sql[/-- §52 主表.*?-- §53 主表/m]
raise "§52 must generate 10000 validity-detail rows" unless case_52&.include?("FROM range(10000)")
case_60 = sql[/-- §60 主表.*?-- §61 主表/m]
raise "§60 must generate 10000 integrity-detail rows" unless case_60&.include?("FROM range(10000)")

puts "PASS: #{expected.length} explicit SparkSQL tables (36 primary + 10 compare), no LIKE/pw_test"
