#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative "options"

sql_path = File.join(SQL_DIR, "lindorm-doris-test_info_1.sql")
sql = File.read(sql_path)
expected = (1..36).map { |case_no| format("test_info_1_{{SUFFIX}}_%02d", case_no) }
expected += (1..10).map { |case_no| format("test_info_1_{{SUFFIX}}_%02d_cmp", case_no) }
names = sql.scan(/\bCREATE\s+TABLE\s+\{\{DATABASE\}\}\.([A-Za-z_][\w{}]*)/i).flatten

raise "database placeholder missing" unless sql.include?("{{DATABASE}}")
raise "suffix placeholder missing" unless sql.include?("{{SUFFIX}}")
raise "legacy pw_test database found" if sql.include?("pw_test")
raise "CREATE TABLE ... LIKE found" if sql.match?(/CREATE\s+TABLE[^;]*\bLIKE\b/i)
raise "unexpected CREATE TABLE names: #{names.inspect}" unless names.sort == expected.sort
raise "duplicate CREATE TABLE names" unless names.uniq.length == names.length
raise "expected one INSERT INTO per table" unless sql.scan(/\bINSERT\s+INTO\b/i).length == expected.length
raise "expected one ALTER TABLE per table" unless sql.scan(/\bALTER\s+TABLE\b/i).length == expected.length
case_16 = sql[/-- §16 主表.*?-- §17 主表/m]
raise "§16 must generate 10000 validity-detail rows" unless case_16&.include?(%q{FROM numbers("number" = "10000")})
case_24 = sql[/-- §24 主表.*?-- §25 主表/m]
raise "§24 must generate 10000 integrity-detail rows" unless case_24&.include?(%q{FROM numbers("number" = "10000")})

puts "PASS: #{expected.length} explicit Doris SQL tables (36 primary + 10 compare), no LIKE/pw_test"
