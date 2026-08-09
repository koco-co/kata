from __future__ import annotations

# ruff: noqa: INP001, RUF001
import re
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
    CASES,
    FEATURE_ID,
)
from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_value_validation import (
        JsonValueValidationJourney,
    )
    from playwright_web_ui.pytest_plugin import StepFixture

_MIN_DIAGNOSTIC_LOG_LENGTH = 20


@automation_case(
    project_id="data-assets",
    feature_id=FEATURE_ID,
    case_id="C0027",
)
def test_failed_instance_exposes_nonempty_connection_error_log(
    json_value_journey: JsonValueValidationJourney,
    step: StepFixture,
) -> None:
    case = CASES["C0027"]
    connection_failure = re.compile(
        r"(?is)(?:连接|connect(?:ion)?).*"
        r"(?:异常|失败|不可达|超时|refused|failed|unreachable|timeout)|"
        r"(?:异常|失败|不可达|超时|refused|failed|unreachable|timeout).*"
        r"(?:连接|connect(?:ion)?)",
    )
    for datasource_key in case.datasource_keys:
        with step(
            action=f"定位 {datasource_key} 中 TaskA 最新运行失败实例并悬浮日志图标",
            expected="实例精确匹配任务、表、数据源，并展示非空数据源连接错误描述",
            target=f"{case.table_name}/{case.task_name}",
        ):
            result_row = json_value_journey.screen.results.latest_result_row(
                case,
                datasource_key,
                terminal_text=re.compile("校验失败|运行失败"),
            )
            tooltip = json_value_journey.screen.results.failure_log_tooltip(result_row)
            expect(tooltip).to_contain_text(connection_failure)
            log_text = tooltip.inner_text().strip()
            assert len(log_text) >= _MIN_DIAGNOSTIC_LOG_LENGTH, (
                "连接失败日志必须包含可诊断的非空错误描述"
            )
