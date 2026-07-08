"""
批量创建 Spark/Hive 测试表脚本

功能：按指定范围批量创建结构相同的 Hive 表（USING parquet）
适用于 Spark Thrift 2.x / Spark SQL 环境

用法：
    # 默认：test_sale_data_00001 ~ test_sale_data_30000
    spark-submit create_30k_tables.py

    # 自定义参数
    spark-submit create_30k_tables.py \
        --database iov_dq \
        --table-prefix test_sale_data_ \
        --start 1 \
        --end 30000 \
        --pad-width 5 \
        --format parquet \
        --batch-log 1000
"""

import argparse

from pyspark.sql import SparkSession

# 表结构的 DDL 片段（可在此按需修改）
TABLE_SCHEMA_DDL = """(
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
)"""

TABLE_COMMENT = "销售数据表"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="批量创建 Spark/Hive 测试表",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  spark-submit create_30k_tables.py
  spark-submit create_30k_tables.py --start 1 --end 30000 --pad-width 5
  spark-submit create_30k_tables.py --database my_db --table-prefix sale_ --start 0 --end 99 --pad-width 3 --batch-log 10
        """,
    )
    parser.add_argument(
        "--database",
        default="iov_dq",
        help="目标数据库名称（默认：iov_dq）",
    )
    parser.add_argument(
        "--table-prefix",
        default="test_sale_data_",
        dest="table_prefix",
        help="表名前缀（默认：test_sale_data_）",
    )
    parser.add_argument(
        "--start",
        type=int,
        default=1,
        help="起始编号（默认：1）",
    )
    parser.add_argument(
        "--end",
        type=int,
        default=30000,
        help="结束编号（默认：30000）",
    )
    parser.add_argument(
        "--pad-width",
        type=int,
        default=5,
        dest="pad_width",
        help="编号补零宽度，例如 5 -> 00001（默认：5）",
    )
    parser.add_argument(
        "--format",
        default="parquet",
        choices=["parquet", "orc", "avro"],
        help="存储格式（默认：parquet）",
    )
    parser.add_argument(
        "--batch-log",
        type=int,
        default=1000,
        dest="batch_log",
        help="每创建 N 张表打印一次进度（默认：1000，0 则不打印中间进度）",
    )

    return parser.parse_args()


def create_tables(args: argparse.Namespace) -> None:
    """按参数批量建表"""
    app_name = f"create_tables_{args.table_prefix}{args.start}_to_{args.end}"

    spark = SparkSession.builder \
        .appName(app_name) \
        .enableHiveSupport() \
        .getOrCreate()

    spark.sql(f"USE {args.database}")

    total = args.end - args.start + 1
    print(f"🚀 开始创建 {total} 张表: {args.database}.{args.table_prefix}[{args.start:0{args.pad_width}d} ~ {args.end:0{args.pad_width}d}]")

    created = 0
    for i in range(args.start, args.end + 1):
        table_name = f"{args.table_prefix}{i:0{args.pad_width}d}"
        ddl = f"""
            CREATE TABLE IF NOT EXISTS {args.database}.{table_name}
            {TABLE_SCHEMA_DDL}
            USING {args.format}
            COMMENT '{TABLE_COMMENT}'
        """
        spark.sql(ddl)
        created += 1

        if args.batch_log > 0 and created % args.batch_log == 0:
            print(f"  ✅ 已创建 {created} / {total} 张表")

    print(f"🎉 完成！共创建 {created} 张表到 {args.database} 库")
    spark.stop()


if __name__ == "__main__":
    args = parse_args()

    if args.start > args.end:
        raise ValueError(f"start ({args.start}) 不能大于 end ({args.end})")

    create_tables(args)
