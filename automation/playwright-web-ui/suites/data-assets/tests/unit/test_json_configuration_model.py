from __future__ import annotations

import pytest

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DataSourceType,
    DuplicatePolicy,
    JsonKeyDraft,
    JsonKeyValidationError,
)


def test_json_key_draft_preserves_exact_business_values() -> None:
    draft = JsonKeyDraft(
        key="customerInfo",
        chinese_name="客户信息",
        value_format=r"^[a-zA-Z]+$",
        data_source_type=DataSourceType.HIVE,
    )

    assert draft.key == "customerInfo"
    assert draft.chinese_name == "客户信息"
    assert draft.value_format == r"^[a-zA-Z]+$"
    assert draft.data_source_type is DataSourceType.HIVE


@pytest.mark.parametrize("length", [1, 255])
def test_json_key_draft_accepts_supported_key_boundaries(length: int) -> None:
    assert JsonKeyDraft(key="a" * length).key == "a" * length


@pytest.mark.parametrize("value", ["", "   ", "a" * 256])
def test_json_key_draft_rejects_values_blocked_by_the_ui(value: str) -> None:
    with pytest.raises(JsonKeyValidationError):
        JsonKeyDraft(key=value)


def test_supported_data_sources_and_duplicate_policies_match_product_contract() -> None:
    assert tuple(DataSourceType) == (
        DataSourceType.SPARK_THRIFT,
        DataSourceType.HIVE,
        DataSourceType.DORIS,
    )
    assert [item.value for item in DataSourceType] == [
        "SparkThrift2.x",
        "Hive2.x",
        "Doris3.x",
    ]
    assert [item.value for item in DuplicatePolicy] == ["重复则跳过", "重复则覆盖更新"]
