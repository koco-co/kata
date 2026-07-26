#!/usr/bin/env ruby
# frozen_string_literal: true

require "date"

sql_path = File.join(__dir__, "lindorm-test_info_1.sql")
database = ENV.fetch("V6411_SQL_DATABASE", "dtstack_smoke")
suffix = ENV.fetch("V6411_SQL_SUFFIX", "qzmkxjrp")
unless database.match?(/\A[A-Za-z_][\w]*\z/)
  raise "invalid V6411_SQL_DATABASE: #{database}"
end
unless suffix.match?(/\A[a-z]{8}\z/)
  raise "V6411_SQL_SUFFIX must be 8 lowercase letters: #{suffix}"
end

expected_date = (Time.now.getlocal("+08:00").to_date - 1).strftime("%Y-%m-%d")
sql = File.read(sql_path)
  .gsub("{{DATABASE}}", database)
  .gsub("{{SUFFIX}}", suffix)
inserts = sql.scan(/\bINSERT\s+INTO\b.*?;/mi)
expected_count = 46
raise "expected #{expected_count} INSERT statements, got #{inserts.length}" unless inserts.length == expected_count
unless inserts.all? { |statement| statement.scan(/'(\d{4}-\d{2}-\d{2})'\s+AS\s+dt/i).flatten.uniq == [expected_date] }
  raise "insert patch contains a non-T-1 partition; expected #{expected_date}"
end

output_path = File.join(__dir__, "lindorm-test_info_1-#{suffix}-insert-patch.sql")
header = <<~SQL
  -- v6.4.11 Lindorm SparkThrift T-1 分区修复 SQL
  -- 仅补写已存在表的 dt=#{expected_date} 分区，不包含 CREATE TABLE，不执行元数据同步。
  -- 数据库: #{database}; 批次后缀: #{suffix}

SQL
File.write(output_path, header + inserts.join("\n\n") + "\n")
puts "generated #{output_path} (#{inserts.length} INSERT INTO)"
