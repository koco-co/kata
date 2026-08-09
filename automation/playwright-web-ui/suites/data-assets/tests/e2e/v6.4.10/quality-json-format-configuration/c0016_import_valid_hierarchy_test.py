from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DuplicatePolicy,
    JsonImportRow,
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0016"
)
def test_import_valid_five_sheet_hierarchy(
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    json_configuration_screen = json_configuration_actions.screen
    prefix = automation_identity.unique_name("import", max_length=38)
    root_one, root_two, child = f"{prefix}Key1", f"{prefix}Key2", f"{prefix}Child"
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(
            JsonImportRow(1, (), root_one, "导入键一", r"^[a-z]+$"),
            JsonImportRow(1, (), root_two, "导入键二", ""),
            JsonImportRow(2, (root_one,), child, "子导入键一", ""),
        ),
    )
    with step(
        action="通过文件选择器上传含 5 个 Sheet 的正确 XLSX，并使用重复则跳过导入",
        expected="导入成功且弹窗关闭，列表刷新",
        target=workbook.name,
    ):
        json_configuration_screen.open()
        json_configuration_actions.import_workbook(workbook, policy=DuplicatePolicy.SKIP)
    with step(
        action="搜索两个根 key 并展开第一个根 key",
        expected="两个根记录及子层级均按文件内容回显，空 value 格式显示为空",
        target=prefix,
    ):
        json_configuration_screen.search(root_one)
        first = json_configuration_screen.readback(root_one)
        assert first.chinese_name == "导入键一"
        assert first.value_format == r"^[a-z]+$"
        json_configuration_screen.expand(root_one)
        child_readback = json_configuration_screen.readback(child)
        assert child_readback.chinese_name == "子导入键一"
        json_configuration_screen.search(root_two)
        second = json_configuration_screen.readback(root_two)
        assert second.chinese_name == "导入键二"
        assert second.value_format == ""
        business_records.record(
            record_type="json-validation-import",
            record_id=prefix,
            readback={
                "root_keys": [root_one, root_two],
                "child_key": child,
                "root_one_value_format": first.value_format,
            },
        )
