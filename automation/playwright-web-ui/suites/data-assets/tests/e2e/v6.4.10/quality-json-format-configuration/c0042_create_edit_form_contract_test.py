from __future__ import annotations

# ruff: noqa: INP001, RUF001
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration import JsonKeyDraft
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationActions,
    )
    from playwright_web_ui.business_records import BusinessRecordRecorder
    from playwright_web_ui.pytest_plugin import StepFixture
    from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0042"
)
def test_create_and_edit_forms_have_identical_structure_and_contextual_title(
    json_configuration_actions: JsonConfigurationActions,
    automation_identity: AutomationRuntimeIdentity,
    business_records: BusinessRecordRecorder,
    step: StepFixture,
) -> None:
    key = automation_identity.unique_name("structCmpA", max_length=42)
    chinese_name = "结构对比测试"
    screen = json_configuration_actions.screen
    with step(
        action=f"通过新增弹窗创建 key={key}、中文名称={chinese_name}",
        expected="列表 UI readback 精确回显 key 与中文名称",
        target=key,
    ):
        screen.open()
        created = json_configuration_actions.create_root(
            JsonKeyDraft(key=key, chinese_name=chinese_name)
        )
        assert created.chinese_name == chinese_name
    with step(
        action="再次打开新增弹窗，按 DOM 顺序读取 title、全部字段标签与必填集合后取消",
        expected="新增 title 为新增或新建，字段签名完整且弹窗正常关闭",
        target="新增表单签名",
    ):
        create_modal = screen.open_create()
        create_signature = screen.form_signature(create_modal)
        assert create_signature.title in {"新增", "新建"}
        screen.cancel_modal(create_modal)
    with step(
        action=f"搜索 {key} 并打开编辑弹窗，采集相同表单签名",
        expected="编辑 title 为“编辑 - 结构对比测试”，字段顺序数组与必填项集合逐项等于新增表单",
        target="编辑表单签名",
    ):
        screen.search(key)
        edit_modal = screen.open_edit(key)
        edit_signature = screen.form_signature(edit_modal)
        assert edit_signature.title == f"编辑 - {chinese_name}"
        assert edit_signature.labels == create_signature.labels
        assert edit_signature.required_labels == create_signature.required_labels
        business_records.record(
            record_type="json-validation-form-contract",
            record_id=key,
            readback={
                **created.business_payload(),
                "create_title": create_signature.title,
                "edit_title": edit_signature.title,
                "labels": list(edit_signature.labels),
                "required_labels": sorted(edit_signature.required_labels),
            },
        )
