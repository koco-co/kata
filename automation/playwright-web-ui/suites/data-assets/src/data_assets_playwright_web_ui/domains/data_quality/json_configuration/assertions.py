"""Strong business assertions for JSON configuration readbacks and workbooks."""

from __future__ import annotations

import re
from typing import TYPE_CHECKING, Final

if TYPE_CHECKING:
    from pathlib import Path

    from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
        DataSourceType,
        JsonKeyDraft,
        JsonKeyReadback,
    )

_EXPORT_NAME_RE: Final = re.compile(r"^json_format_\d{8}\.xlsx$")
_IMPORT_ERROR_NAME_RE: Final = re.compile(r"^json_format_error_\d{8}\.xlsx$")


class JsonConfigurationAssertionError(AssertionError):
    """Raised when UI readback or a downloaded workbook violates its business contract."""


def _require(condition: bool, message: str) -> None:  # noqa: FBT001
    if not condition:
        raise JsonConfigurationAssertionError(message)


def assert_readback_matches(
    readback: JsonKeyReadback,
    draft: JsonKeyDraft,
    *,
    require_actor: bool = False,
) -> None:
    """Compare persisted UI values with the submitted form values."""
    _require(readback.key == draft.key, "persisted key must match the submitted key")
    _require(
        readback.chinese_name == draft.chinese_name,
        "persisted Chinese name must match the submitted value",
    )
    _require(
        readback.value_format == draft.value_format,
        "persisted value format must match the submitted value",
    )
    if draft.data_source_type is not None:
        _require(
            readback.data_source_type == draft.data_source_type.value,
            "persisted data-source type must match the submitted value",
        )
    if require_actor:
        _require(bool(readback.created_by), "persisted record must expose its creator")
        _require(bool(readback.created_at), "persisted record must expose its creation time")


def assert_only_data_source(rows: tuple[dict[str, str], ...], value: DataSourceType) -> None:
    """Require a non-empty export whose every row has one data-source type."""
    _require(bool(rows), "filtered export must contain at least one business row")
    _require(
        all(row.get("数据源类型") == value.value for row in rows),
        "every exported row must satisfy the selected data-source filter",
    )


def assert_all_keys_contain(rows: tuple[dict[str, str], ...], keyword: str) -> None:
    """Require a non-empty export whose every key satisfies the active search."""
    _require(bool(rows), "searched export must contain at least one business row")
    _require(
        all(keyword in row.get("key", "") for row in rows),
        "every exported key must satisfy the active key search",
    )


def assert_export_filename(path: Path) -> None:
    """Require the dated JSON configuration export filename."""
    _require(
        _EXPORT_NAME_RE.fullmatch(path.name) is not None,
        "export filename must match json_format_YYYYMMDD.xlsx",
    )


def assert_import_error_filename(path: Path) -> None:
    """Require the dated import-error workbook filename."""
    _require(
        _IMPORT_ERROR_NAME_RE.fullmatch(path.name) is not None,
        "error filename must match json_format_error_YYYYMMDD.xlsx",
    )
