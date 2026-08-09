from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.assertions import (
    assert_export_filename,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.workbook import (
    JsonConfigurationWorkbook,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from pathlib import Path

    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture

_MINIMUM_EXPORT_ROWS = 100


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0040"
)
def test_large_export_row_count_matches_platform_total(
    json_configuration_screen: JsonConfigurationScreen,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    with step(
        action="读取 100 条以上 JSON key 的分页总数并导出 XLSX",
        expected="安全读取下载文件后，非空业务行总数与 UI 分页总记录数完全一致",
        target="大数据量导出",
    ):
        json_configuration_screen.open()
        expected_total = json_configuration_screen.total_count()
        assert expected_total >= _MINIMUM_EXPORT_ROWS
        downloaded = json_configuration_screen.export(tmp_path)
        assert_export_filename(downloaded)
        rows = JsonConfigurationWorkbook.read_export(downloaded)
        assert len(rows) == expected_total
