from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from pathlib import Path

    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0023"
)
def test_csv_upload_is_rejected_before_submit(
    json_configuration_screen: JsonConfigurationScreen,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    csv_path = tmp_path / "test_import_15696.csv"
    csv_path.write_text("* key,中文名称,value格式\nimportKey1,导入键一,\n", encoding="utf-8")
    with step(
        action="在导入弹窗通过文件选择器选择 CSV 文件",
        expected="系统提示仅支持上传 xlsx，CSV 不进入待上传文件列表",
        target=csv_path.name,
    ):
        json_configuration_screen.open()
        modal = json_configuration_screen.open_import()
        json_configuration_screen.upload_rejected_file(modal, csv_path)
