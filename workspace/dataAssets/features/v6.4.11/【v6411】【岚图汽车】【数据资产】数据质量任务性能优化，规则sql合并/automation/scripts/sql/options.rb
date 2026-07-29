# frozen_string_literal: true

require "date"

def cli_option(name, default: nil, required: false)
  flag = "--#{name}"
  index = ARGV.index(flag)
  value = index.nil? ? default : ARGV[index + 1]
  if value.nil? || value.empty?
    raise "missing required option #{flag}" if required
    return default
  end
  value
end

def render_database(required: true)
  value = cli_option("database", required: required)
  raise "database must match [A-Za-z_][A-Za-z0-9_]*" unless value.match?(/\A[A-Za-z_][\w]*\z/)
  value
end

def render_suffix(required: true)
  value = cli_option("suffix", required: required)
  raise "suffix must be 8 lowercase letters" unless value.match?(/\A[a-z]{8}\z/)
  value
end

def render_business_date
  value = cli_option(
    "biz-date",
    default: (Time.now.getlocal("+08:00").to_date - 1).strftime("%Y-%m-%d"),
  )
  raise "biz-date must be yyyy-MM-dd" unless value.match?(/\A\d{4}-\d{2}-\d{2}\z/)
  value
end

SQL_DIR = File.expand_path("../../tests/sql", __dir__).freeze
INPUT_DIR = File.expand_path("../inputs", __dir__).freeze
