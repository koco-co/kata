from __future__ import annotations

# ruff: noqa: INP001, RUF001
from time import monotonic
from typing import TYPE_CHECKING

from playwright_web_ui import automation_case

if TYPE_CHECKING:
    from data_assets_playwright_web_ui.domains.data_quality.json_configuration import (
        JsonConfigurationScreen,
    )
    from playwright_web_ui.pytest_plugin import StepFixture

_OPEN_LIMIT_SECONDS = 5
_INTERACTION_LIMIT_SECONDS = 3
_MINIMUM_TOTAL = 1_000
_PAGE_SIZE = 20
_FIRST_PAGE_KEYS = tuple(f"key{position}" for position in range(1, 21))
_SECOND_PAGE_KEYS = tuple(f"key{position}" for position in range(21, 41))


@automation_case(
    project_id="data-assets", feature_id="quality-json-format-configuration", case_id="C0039"
)
def test_thousand_row_list_search_and_page_two_latency(
    json_configuration_screen: JsonConfigurationScreen,
    step: StepFixture,
) -> None:
    with step(
        action="打开预置 1000 条以上确定性 key 的列表，将每页条数切换为 20 并完成 UI readback",
        expected="列表请求和 DOM 渲染在 5 秒内完成，总数至少 1000，第一页依次为 key1 至 key20",
        target="1000 条 key 首屏",
    ):
        started = monotonic()
        json_configuration_screen.open()
        json_configuration_screen.set_page_size(_PAGE_SIZE)
        assert json_configuration_screen.total_count() >= _MINIMUM_TOTAL
        first_page_keys = json_configuration_screen.visible_keys()
        assert first_page_keys == _FIRST_PAGE_KEYS
        assert len(first_page_keys) == _PAGE_SIZE
        assert monotonic() - started <= _OPEN_LIMIT_SECONDS
    with step(
        action="搜索 key500 并计时接口与渲染",
        expected="3 秒内返回并显示 key500 记录",
        target="key500",
    ):
        started = monotonic()
        json_configuration_screen.search("key500")
        search_keys = json_configuration_screen.visible_keys()
        assert search_keys == ("key500",)
        assert json_configuration_screen.readback("key500").key == "key500"
        assert monotonic() - started <= _INTERACTION_LIMIT_SECONDS
    with step(
        action="清除搜索后点击分页第 2 页并计时",
        expected="3 秒内完成翻页且第 2 页正好显示第 21 至 40 条共 20 条记录",
        target="分页第 2 页",
    ):
        json_configuration_screen.clear_search()
        first_page_keys = json_configuration_screen.visible_keys()
        assert first_page_keys == _FIRST_PAGE_KEYS
        started = monotonic()
        json_configuration_screen.goto_page(2, previous_keys=first_page_keys)
        second_page_keys = json_configuration_screen.visible_keys()
        assert second_page_keys == _SECOND_PAGE_KEYS
        assert len(second_page_keys) == _PAGE_SIZE
        assert second_page_keys != first_page_keys
        assert set(second_page_keys).isdisjoint(first_page_keys)
        assert monotonic() - started <= _INTERACTION_LIMIT_SECONDS
