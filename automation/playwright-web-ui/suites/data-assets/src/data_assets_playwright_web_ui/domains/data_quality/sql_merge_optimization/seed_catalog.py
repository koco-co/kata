"""Canonical runtime-owned Spark table content for requirement 15862 candidates."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

from .sql_seed import (
    SparkColumn,
    SparkColumnType,
    SparkPartitionRows,
    SparkSeedPlan,
    SparkTableSeed,
)

_FIRST_PARTITION = "2026-08-04"
_SECOND_PARTITION = "2026-08-05"
_BUY_DATE_OFFSET_DAYS = 30
_ROWS_PER_PARTITION = 6


def canonical_main_seed_plan(
    *,
    case_id: str,
    ownership_token: str,
    current_date: date | None = None,
) -> SparkSeedPlan:
    """Build the explicit six-row/two-partition table intended by canonical YAML."""
    today = current_date or datetime.now(tz=UTC).astimezone().date()
    first_rows = tuple(
        (
            index + 1,
            (25, 30, 28, 35, 22, 29)[index],
            f"{index + 1:03d}",
            ("张三", "李四", "王五", "赵六", "小明", "小红")[index],
            (
                "北京市朝阳区",
                "上海市浦东新区",
                "广州市天河区",
                "深圳市南山区",
                "杭州市西湖区",
                "成都市武侯区",
            )[index],
            ("5000.00", "6800.50", "4200.00", "9500.00", "3100.00", "5600.00")[index],
            today - timedelta(days=_BUY_DATE_OFFSET_DAYS - index),
            ("订单已完成", "待发货", "已取消", "配送中", "已完成", "退款中")[index],
        )
        for index in range(_ROWS_PER_PARTITION)
    )
    second_rows = tuple((row[0] + _ROWS_PER_PARTITION, *row[1:]) for row in first_rows)
    table = SparkTableSeed(
        columns=(
            SparkColumn("id", SparkColumnType.BIGINT),
            SparkColumn("age", SparkColumnType.INT),
            SparkColumn("string_num", SparkColumnType.STRING),
            SparkColumn("name", SparkColumnType.STRING),
            SparkColumn("address", SparkColumnType.STRING),
            SparkColumn("money", SparkColumnType.STRING),
            SparkColumn("buy_date", SparkColumnType.DATE),
            SparkColumn("date_detail", SparkColumnType.STRING),
        ),
        partition_column="dt",
        partitions=(
            SparkPartitionRows(value=_FIRST_PARTITION, rows=first_rows),
            SparkPartitionRows(value=_SECOND_PARTITION, rows=second_rows),
        ),
    )
    return SparkSeedPlan(
        case_id=case_id,
        ownership_token=ownership_token,
        main=table,
    )
