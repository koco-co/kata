#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────
# 批量创建 test_sale_data_0 ~ test_sale_data_N 表
# 用法:
#   ./create_sale_tables.sh [选项]
# ──────────────────────────────────────────────────

# ===== 默认配置 =====
DB="iov_dq"
TABLE_PREFIX="test_sale_data"
TABLE_COUNT=30000
TARGET_DIR="/tmp"
OUTPUT_FILE="${TARGET_DIR}/create_sale_tables.sql"
DRY_RUN=false
BEELINE_OPTS=""

print_usage() {
  cat <<EOF
用法: $(basename "$0") [选项]

选项:
  -n, --num <N>        创建表数量 (默认: 30000)
  -d, --db <db>        数据库名 (默认: iov_dq)
  -p, --prefix <name>  表名前缀 (默认: test_sale_data)
  -o, --output <path>  SQL 输出路径 (默认: /tmp/create_sale_tables.sql)
  -u, --url <url>      beeline JDBC URL，指定后直接执行
  -U, --user <user>    beeline 用户名
  -P, --password <pw>  beeline 密码
  -D, --dry-run        只生成 SQL 文件，不执行
  -h, --help           显示此帮助

示例:
  # 只生成 3 万张表的 DDL 文件
  $(basename "$0") -n 30000 -o /tmp/30k.sql --dry-run

  # 生成并直接提交到 Thrift Server
  $(basename "$0") -n 30000 -u "jdbc:hive2://thrift-host:10000/default" -U user -P pwd

  # 只生成 100 张表测试
  $(basename "$0") -n 100 -o /tmp/100.sql --dry-run

  # 指定数据库名和表名前缀
  $(basename "$0") -n 100 -d my_db -p sale_data --dry-run
EOF
  exit 0
}

# ===== 解析参数 =====
while [[ $# -gt 0 ]]; do
  case "$1" in
    -n|--num)         TABLE_COUNT="$2";   shift 2 ;;
    -d|--db)          DB="$2";            shift 2 ;;
    -p|--prefix)      TABLE_PREFIX="$2";  shift 2 ;;
    -o|--output)      OUTPUT_FILE="$2";   shift 2 ;;
    -u|--url)         BEELINE_URL="$2";   shift 2 ;;
    -U|--user)        BEELINE_USER="$2";  shift 2 ;;
    -P|--password)    BEELINE_PASS="$2";  shift 2 ;;
    -D|--dry-run)     DRY_RUN=true;       shift   ;;
    -h|--help)        print_usage                ;;
    *) echo "未知参数: $1"; print_usage ;;
  esac
done

# ===== 生成 SQL =====
echo "🔧 配置:"
echo "   数据库    = ${DB}"
echo "   表名前缀 = ${TABLE_PREFIX}_0 .. ${TABLE_PREFIX}_$((TABLE_COUNT - 1))"
echo "   表数量    = ${TABLE_COUNT}"
echo "   输出文件  = ${OUTPUT_FILE}"
echo ""

SQL=""
for i in $(seq 0 $((TABLE_COUNT - 1))); do
  SQL+="CREATE TABLE IF NOT EXISTS ${DB}.${TABLE_PREFIX}_${i} (
  id              BIGINT           COMMENT '主键ID',
  order_id        BIGINT           COMMENT '订单ID',
  customer_id     INT              COMMENT '客户ID',
  car_price       DECIMAL(15,2)    COMMENT '车辆价格',
  discount_amount DECIMAL(10,2)    COMMENT '折扣金额',
  final_amount    DECIMAL(15,2)    COMMENT '最终金额',
  quantity        TINYINT          COMMENT '购买数量（1-255）',
  salesman_id     INT              COMMENT '销售员ID',
  mileage_at_sale INT              COMMENT '购车时里程数',
  rating_score    FLOAT            COMMENT '客户评分（0.0～5.0）'
)
USING parquet
COMMENT '销售数据表';
"
done

echo "$SQL" > "$OUTPUT_FILE"

# ===== 统计信息 =====
SQL_SIZE=$(wc -c < "$OUTPUT_FILE" | numfmt --to=iec 2>/dev/null || wc -c < "$OUTPUT_FILE")
echo "✅ SQL 文件已生成: ${OUTPUT_FILE} (${SQL_SIZE})"
echo ""

# ===== 执行 =====
if [[ "${DRY_RUN}" == "true" ]]; then
  echo "⏹  --dry-run 模式，未执行。直接用 beeline 提交:"
  echo "   beeline -u \"jdbc:hive2://...\" -f ${OUTPUT_FILE}"
  exit 0
fi

if [[ -n "${BEELINE_URL:-}" ]]; then
  echo "🚀 正在通过 beeline 提交到 ${BEELINE_URL} ..."
  beeline -u "${BEELINE_URL}" \
    ${BEELINE_USER:+-n "${BEELINE_USER}"} \
    ${BEELINE_PASS:+-p "${BEELINE_PASS}"} \
    -f "${OUTPUT_FILE}"
  echo "✅ 执行完成"
else
  echo "⏹  未指定 JDBC URL，跳过执行。"
  echo "   手动提交命令:"
  echo "   beeline -u \"jdbc:hive2://<host>:<port>/default\" -f ${OUTPUT_FILE}"
fi
