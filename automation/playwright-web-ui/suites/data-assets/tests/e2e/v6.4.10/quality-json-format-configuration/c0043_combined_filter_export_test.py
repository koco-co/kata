from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
    DataSourceType,
    JsonKeyDraft,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.assertions import (
    assert_all_keys_contain,
    assert_only_data_source,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.workbook import (
    JsonConfigurationWorkbook,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from pathlib import Path

    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationActions,
    )
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0043"
)
def test_exports_honor_source_search_and_combined_filters(
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    hive_prefix = automation_identity.unique_name("t44hive", max_length=36)
    spark_prefix = automation_identity.unique_name("t44spark", max_length=36)
    hive_keys = (f"{hive_prefix}Key1", f"{hive_prefix}Key2")
    spark_keys = (f"{spark_prefix}Key1", f"{spark_prefix}Key2")
    screen = json_configuration_actions.screen
    created: list[dict[str, object]] = []
    with step(
        action="通过 UI 新增两个 Hive2.x key 与两个 SparkThrift2.x key",
        expected="四条固定分组输入均完成 UI readback，类型与各自前缀一致",
        target=f"{hive_prefix}/{spark_prefix}",
    ):
        screen.open()
        for key in hive_keys:
            row = json_configuration_actions.create_root(
                JsonKeyDraft(key=key, data_source_type=DataSourceType.HIVE)
            )
            assert row.data_source_type == DataSourceType.HIVE.value
            created.append(row.business_payload())
        for key in spark_keys:
            row = json_configuration_actions.create_root(
                JsonKeyDraft(key=key, data_source_type=DataSourceType.SPARK_THRIFT)
            )
            assert row.data_source_type == DataSourceType.SPARK_THRIFT.value
            created.append(row.business_payload())
    with step(
        action="子场景 A：仅筛选 Hive2.x 后导出",
        expected="导出每行类型均为 Hive2.x，包含两个 hive key 且不含两个 spark key",
        target="数据源类型=Hive2.x",
    ):
        screen.clear_search()
        screen.filter_data_source(DataSourceType.HIVE)
        source_rows = JsonConfigurationWorkbook.read_export(
            screen.export(tmp_path / "source-filter")
        )
        assert_only_data_source(source_rows, DataSourceType.HIVE)
        source_keys = {row.get("key") for row in source_rows}
        assert set(hive_keys).issubset(source_keys)
        assert set(spark_keys).isdisjoint(source_keys)
    with step(
        action=f"子场景 B：清除类型筛选，仅搜索 hive 前缀 {hive_prefix} 后导出",
        expected="导出每个 key 均含 hive 前缀，包含两个 hive key 且不含 spark key",
        target=hive_prefix,
    ):
        screen.clear_data_source_filter()
        screen.search(hive_prefix)
        search_rows = JsonConfigurationWorkbook.read_export(
            screen.export(tmp_path / "search-filter")
        )
        assert_all_keys_contain(search_rows, hive_prefix)
        search_keys = {row.get("key") for row in search_rows}
        assert set(hive_keys).issubset(search_keys)
        assert set(spark_keys).isdisjoint(search_keys)
    with step(
        action="子场景 C：保持 hive 前缀搜索并叠加 Hive2.x 类型筛选后导出",
        expected="导出同时满足 key 前缀与数据源类型两个条件，只包含两个目标 hive key",
        target=f"key~{hive_prefix} AND source=Hive2.x",
    ):
        screen.filter_data_source(DataSourceType.HIVE)
        combined_rows = JsonConfigurationWorkbook.read_export(
            screen.export(tmp_path / "combined-filter")
        )
        assert_all_keys_contain(combined_rows, hive_prefix)
        assert_only_data_source(combined_rows, DataSourceType.HIVE)
        combined_keys = {row.get("key") for row in combined_rows}
        assert set(hive_keys).issubset(combined_keys)
        assert set(spark_keys).isdisjoint(combined_keys)
        business_records.record(
            record_type="json-validation-filter-export",
            record_id=hive_prefix,
            readback={
                "created": created,
                "combined_filter_keys": sorted(key for key in combined_keys if key),
                "verified_filters": [
                    "data_source_type=Hive2.x",
                    f"key_contains={hive_prefix}",
                    f"key_contains={hive_prefix} AND data_source_type=Hive2.x",
                ],
            },
        )
