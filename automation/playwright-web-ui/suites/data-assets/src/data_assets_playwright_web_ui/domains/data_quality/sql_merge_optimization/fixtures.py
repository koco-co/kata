"""Function-scoped Spark seed lifecycle for SQL-merge candidate journeys."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Protocol

import pytest

from .sql_seed import (
    SparkBatchSeedClient,
    SparkCleanupReceipt,
    SparkSeedPlan,
    SparkSeedReceipt,
    SqlSeedError,
)

_CLEANUP_FAILURE_CODE = "SQL_SEED_CLEANUP_FAILED"

if TYPE_CHECKING:
    from collections.abc import Iterator

    from playwright.sync_api import Page

    from playwright_web_ui.platform_context import PlatformContext


class _SparkSeedClient(Protocol):
    def setup(self, plan: SparkSeedPlan) -> SparkSeedReceipt:
        """Create and fingerprint one runtime-owned table bundle."""
        ...

    def cleanup(self, plan: SparkSeedPlan) -> SparkCleanupReceipt:
        """Drop only the table bundle owned by the supplied plan."""
        ...


@dataclass(slots=True)
class SqlMergeSparkSeedFactory:
    """Register successful seed plans and clean them in reverse setup order."""

    client: _SparkSeedClient
    _registered: list[SparkSeedPlan] = field(
        default_factory=list[SparkSeedPlan],
        init=False,
        repr=False,
    )

    def setup(self, plan: SparkSeedPlan) -> SparkSeedReceipt:
        """Seed one plan and register it only after the complete setup succeeds."""
        receipt = self.client.setup(plan)
        self._registered.append(plan)
        return receipt

    def cleanup_all(self) -> tuple[SparkCleanupReceipt, ...]:
        """Attempt every owned cleanup and surface a bounded aggregate failure."""
        receipts: list[SparkCleanupReceipt] = []
        failures: list[tuple[str, str]] = []
        while self._registered:
            plan = self._registered.pop()
            try:
                receipts.append(self.client.cleanup(plan))
            except SqlSeedError as error:
                failures.append((plan.case_id, error.code))
        if failures:
            summary = ",".join(f"{case_id}:{code}" for case_id, code in failures)
            raise SqlSeedError(_CLEANUP_FAILURE_CODE, summary)
        return tuple(receipts)


@pytest.fixture
def sql_merge_spark_seed(
    page: Page,
    platform_context: PlatformContext,
) -> Iterator[SqlMergeSparkSeedFactory]:
    """Yield a function-scoped seed factory with mandatory reverse cleanup."""
    factory = SqlMergeSparkSeedFactory(SparkBatchSeedClient(page, platform_context))
    try:
        yield factory
    finally:
        factory.cleanup_all()
