from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DuplicatePolicy,
    JsonImportRow,
    JsonKeyDraft,
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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0034"
)
def test_skip_import_adds_missing_child(
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    json_configuration_screen = json_configuration_actions.screen
    parent = automation_identity.unique_name("parentD", max_length=39)
    child = automation_identity.unique_name("newChild2", max_length=41)
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(2, (parent,), child, "新增子键", r"^[a-z]+$"),),
    )
    with step(
        action=f"通过 UI 创建无子层级父 key {parent}，再以重复则跳过导入新子 key",
        expected="父级可展开，子 key 回显新增子键和 ^[a-z]+$",
        target=child,
    ):
        json_configuration_screen.open()
        json_configuration_actions.create_root(JsonKeyDraft(key=parent))
        json_configuration_actions.import_workbook(workbook, policy=DuplicatePolicy.SKIP)
        json_configuration_screen.search(parent)
        json_configuration_screen.expand(parent)
        readback = json_configuration_screen.readback(child)
        assert readback.chinese_name == "新增子键"
        assert readback.value_format == r"^[a-z]+$"
        business_records.record(
            record_type="json-validation-child-import-create",
            record_id=child,
            readback={"parent_key": parent, **readback.business_payload()},
        )
