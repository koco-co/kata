from __future__ import annotations

from dataclasses import replace
from datetime import date

import pytest

from data_assets_playwright_web_ui.domains.data_quality.sql_merge_optimization.sql_seed import (
    SparkColumn,
    SparkColumnType,
    SparkPartitionRows,
    SparkSeedPlan,
    SparkTableSeed,
    SqlSeedError,
)

_OWNERSHIP_IDENTITY = "a0123456789"
_INVALID_OWNERSHIP_IDENTITY = "unsafe"
_ROWS_PER_PARTITION = 6


def partition_rows(value: str, *, offset: int = 0) -> SparkPartitionRows:
    return SparkPartitionRows(
        value=value,
        rows=(
            (offset + 1, "O'Brien", date(2026, 7, 1)),
            (offset + 2, None, date(2026, 7, 2)),
            (offset + 3, "Alice", date(2026, 7, 3)),
            (offset + 4, "Bob", date(2026, 7, 4)),
            (offset + 5, "Carol", date(2026, 7, 5)),
            (offset + 6, "Dave", date(2026, 7, 6)),
        ),
    )


def table_seed(
    *,
    partitions: tuple[SparkPartitionRows, ...] | None = None,
) -> SparkTableSeed:
    return SparkTableSeed(
        columns=(
            SparkColumn("id", SparkColumnType.INT),
            SparkColumn("name", SparkColumnType.STRING),
            SparkColumn("buy_date", SparkColumnType.DATE),
        ),
        partition_column="dt",
        partitions=(
            partition_rows("2026-08-04"),
            partition_rows("2026-08-05", offset=6),
        )
        if partitions is None
        else partitions,
    )


def seed_plan() -> SparkSeedPlan:
    return SparkSeedPlan(
        case_id="C0001",
        ownership_token=_OWNERSHIP_IDENTITY,
        main=table_seed(),
    )


def test_schema_and_multi_partition_data_fingerprints_are_stable_and_independent() -> None:
    base = seed_plan()
    first_partition = base.main.partitions[0]
    changed_data = replace(
        base,
        main=replace(
            base.main,
            partitions=(
                replace(
                    first_partition,
                    rows=((99, "changed", date(2026, 7, 9)), *first_partition.rows[1:]),
                ),
                base.main.partitions[1],
            ),
        ),
    )
    changed_schema = replace(
        base,
        main=replace(
            base.main,
            columns=(*base.main.columns, SparkColumn("amount", SparkColumnType.BIGINT)),
            partitions=tuple(
                replace(batch, rows=tuple((*row, 1) for row in batch.rows))
                for batch in base.main.partitions
            ),
        ),
    )

    assert base.schema_fingerprint == seed_plan().schema_fingerprint
    assert base.data_fingerprint == seed_plan().data_fingerprint
    assert base.schema_fingerprint == changed_data.schema_fingerprint
    assert base.data_fingerprint != changed_data.data_fingerprint
    assert base.schema_fingerprint != changed_schema.schema_fingerprint


@pytest.mark.parametrize(
    "plan",
    [
        replace(seed_plan(), ownership_token=_INVALID_OWNERSHIP_IDENTITY),
        replace(seed_plan(), case_id="C9999"),
        replace(
            seed_plan(),
            main=replace(
                table_seed(),
                columns=(
                    SparkColumn("id", SparkColumnType.INT),
                    SparkColumn("id", SparkColumnType.STRING),
                ),
                partitions=(
                    SparkPartitionRows(
                        "2026-08-04",
                        ((1, "duplicate"),) * _ROWS_PER_PARTITION,
                    ),
                    SparkPartitionRows(
                        "2026-08-05",
                        ((2, "duplicate"),) * _ROWS_PER_PARTITION,
                    ),
                ),
            ),
        ),
        replace(
            seed_plan(),
            main=table_seed(
                partitions=(
                    replace(
                        partition_rows("2026-08-04"),
                        rows=((1, "too-short"),) * _ROWS_PER_PARTITION,
                    ),
                    partition_rows("2026-08-05", offset=6),
                )
            ),
        ),
        replace(
            seed_plan(),
            main=table_seed(partitions=(partition_rows("2026-08-04"),)),
        ),
        replace(
            seed_plan(),
            main=table_seed(
                partitions=(
                    partition_rows("2026-08-04"),
                    partition_rows("2026-08-04", offset=6),
                )
            ),
        ),
        replace(
            seed_plan(),
            main=table_seed(
                partitions=(
                    replace(partition_rows("2026-08-04"), rows=()),
                    partition_rows("2026-08-05", offset=6),
                )
            ),
        ),
    ],
    ids=(
        "unsafe-owner",
        "noncanonical-case",
        "duplicate-column",
        "wrong-row-width",
        "missing-partition",
        "duplicate-partition",
        "empty-partition",
    ),
)
def test_plan_rejects_unsafe_or_incomplete_canonical_seed(plan: SparkSeedPlan) -> None:
    with pytest.raises(SqlSeedError, match="SQL_SEED_PLAN_INVALID"):
        plan.validate()
