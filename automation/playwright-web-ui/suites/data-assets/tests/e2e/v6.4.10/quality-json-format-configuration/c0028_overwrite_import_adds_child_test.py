from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from playwright.sync_api import expect

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
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0028"
)
def test_overwrite_import_adds_missing_child(
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    tmp_path: Path,
    step: StepFixture,
) -> None:
    json_configuration_screen = json_configuration_actions.screen
    parent = automation_identity.unique_name("parentB", max_length=39)
    child = automation_identity.unique_name("newChild1", max_length=41)
    workbook = JsonConfigurationWorkbook.build_import(
        tmp_path / "json_format_import_15696.xlsx",
        rows=(JsonImportRow(2, (parent,), child, "新增子键", r"^[a-z]+$"),),
    )
    with step(
        action=f"通过 UI 创建无子层级父 key {parent}",
        expected="父行没有可展开图标",
        target=parent,
    ):
        json_configuration_screen.open()
        json_configuration_actions.create_root(JsonKeyDraft(key=parent))
        expect(
            json_configuration_screen.expect_row(parent).locator(
                ".ant-table-row-expand-icon-collapsed"
            )
        ).to_have_count(0)
    with step(
        action="重复则覆盖更新导入父级下不存在的子 key",
        expected="父行出现展开图标，子 key 回显新增子键和 ^[a-z]+$",
        target=child,
    ):
        json_configuration_actions.import_workbook(workbook, policy=DuplicatePolicy.OVERWRITE)
        json_configuration_screen.search(parent)
        json_configuration_screen.expand(parent)
        child_readback = json_configuration_screen.readback(child)
        assert child_readback.chinese_name == "新增子键"
        assert child_readback.value_format == r"^[a-z]+$"
        business_records.record(
            record_type="json-validation-child-import-create",
            record_id=child,
            readback={"parent_key": parent, **child_readback.business_payload()},
        )
