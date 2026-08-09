"""Read-only Data Standard statistics and reference-data UI contract."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final, cast

from playwright.sync_api import expect

from data_assets_playwright_web_ui.domains.data_standard.standard_statistics.model import (
    StandardStatisticsContractError,
    StandardStatisticsSnapshot,
    StatisticMetric,
)

if TYPE_CHECKING:
    from playwright.sync_api import Locator, Page, Response

    from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
    from data_assets_playwright_web_ui.domains.data_standard.standard_statistics.model import (
        StandardReferenceData,
    )

_UI_TIMEOUT_MS: Final = 30_000
_MINIMUM_RECORD_COUNT: Final = 1
_CHART_TITLES: Final = (
    "标准热度",
    "标准目录分布",
    "标准趋势",
    "标准来源分布",
)
_STATISTICS_RESPONSE_PATTERNS: Final = {
    "hot": re.compile(r"/standardStatistic/standardHot(?:\?.*)?$"),
    "catalog": re.compile(r"/standardStatistic/standardCatalog(?:\?.*)?$"),
    "trend": re.compile(r"/standardStatistic/standardTrend(?:\?.*)?$"),
    "source": re.compile(r"/standardStatistic/standardSource(?:\?.*)?$"),
}


@dataclass(frozen=True, slots=True)
class StandardStatisticsScreen:
    """Exercise the canonical read-only Data Standard UI journey."""

    navigation: DataAssetsNavigation

    @property
    def page(self) -> Page:
        """Return the controlled pytest-playwright page."""
        return self.navigation.page

    def open_statistics(self) -> StandardStatisticsSnapshot:
        """Open statistics and capture the four business payloads caused by that UI load."""
        with (
            self.page.expect_response(_STATISTICS_RESPONSE_PATTERNS["hot"]) as hot_info,
            self.page.expect_response(_STATISTICS_RESPONSE_PATTERNS["catalog"]) as catalog_info,
            self.page.expect_response(_STATISTICS_RESPONSE_PATTERNS["trend"]) as trend_info,
            self.page.expect_response(_STATISTICS_RESPONSE_PATTERNS["source"]) as source_info,
        ):
            self.navigation.open("/standardStatistic", landmark="标准统计")

        return StandardStatisticsSnapshot.from_api_payloads(
            hot=self._response_payload(hot_info.value, label="标准热度"),
            catalog=self._response_payload(catalog_info.value, label="标准目录分布"),
            trend=self._response_payload(trend_info.value, label="标准趋势"),
            source=self._response_payload(source_info.value, label="标准来源分布"),
        )

    def expect_non_empty_summary_cards(self) -> None:
        """Assert all three summary cards contain non-zero numeric metrics."""
        standard_card = self.page.locator(".cards__standard")
        expect(standard_card).to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(standard_card.locator(".content__title")).to_have_text("数据标准")
        self._expect_minimum_metric(
            standard_card.locator(".content__total"),
            label="数据标准",
        )

        for label in ("代码表", "词根管理"):
            card = self.page.locator(".cards__other .other__item").filter(has_text=label)
            expect(card, f"统计卡片“{label}”必须可见").to_be_visible(timeout=_UI_TIMEOUT_MS)
            expect(card.locator(".item__content--title")).to_have_text(label)
            self._expect_minimum_metric(
                card.locator(".item__content--count"),
                label=label,
            )

    def expect_populated_distribution_charts(
        self,
        snapshot: StandardStatisticsSnapshot,
    ) -> None:
        """Assert all charts render the business data captured from this UI page load."""
        for title in _CHART_TITLES:
            panel = self._chart_panel(title)
            expect(panel, f"图表“{title}”必须可见").to_be_visible(timeout=_UI_TIMEOUT_MS)
            expect(panel.locator(".content__empty"), f"图表“{title}”不得为空").to_have_count(0)
            expect(panel.locator("canvas").first, f"图表“{title}”必须完成绘制").to_be_visible(
                timeout=_UI_TIMEOUT_MS,
            )
            selected_dimension = panel.locator(".ant-select-selection-item")
            expect(selected_dimension, f"图表“{title}”必须展示统计维度").to_have_text(
                "数据标准",
            )

        self._expect_progress_metrics(self._chart_panel("标准目录分布"), snapshot.catalog)
        self._expect_progress_metrics(self._chart_panel("标准来源分布"), snapshot.source)

        if not snapshot.hot:
            message = "标准热度必须包含标准名称与引用次数"
            raise StandardStatisticsContractError(message)
        if not snapshot.trend:
            message = "标准趋势必须包含时间轴与数据标准数量数据点"
            raise StandardStatisticsContractError(message)

    def expect_root_record(self, expected: StandardReferenceData) -> None:
        """Search for and assert the canonical root record through the UI."""
        self.navigation.open("/rootManage", landmark="词根管理")
        self._expect_headers(("词根简称", "词根全称", "词根中文名", "操作"))
        self._search("请输入词根简称/全称/中文名进行搜索", expected.root_abbreviation)
        row = self._visible_row(expected.root_abbreviation)
        self._expect_exact_cell(row, expected.root_abbreviation, minimum=2)
        self._expect_exact_cell(row, expected.root_full_name)
        self._expect_exact_cell(row, expected.root_chinese_name)

    def expect_code_record(self, expected: StandardReferenceData) -> None:
        """Select the code catalog, search, and assert the canonical code row."""
        self.navigation.open("/codeTableManage", landmark="码表管理")
        self._expect_headers(("代码名称", "代码编号", "代码说明", "操作"))
        catalog = (
            self.page.locator(".ant-tree-node-content-wrapper")
            .filter(
                has_text=re.compile(rf"^{re.escape(expected.code_catalog)}$"),
            )
            .first
        )
        expect(catalog, f"代码目录“{expected.code_catalog}”必须可见").to_be_visible(
            timeout=_UI_TIMEOUT_MS,
        )
        catalog.click()
        expect(catalog).to_have_class(re.compile(r"ant-tree-node-selected"))
        self._search("请输入代码名称/代码编号进行搜索", expected.code_number)
        row = self._visible_row(expected.code_number)
        self._expect_exact_cell(row, expected.code_name)
        self._expect_exact_cell(row, expected.code_number)
        row.get_by_role("link", name=expected.code_name, exact=True).click()
        drawer = self.page.locator(".codeTableManage-drawer")
        expect(drawer, "码表详情抽屉必须打开").to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(drawer.get_by_text("代码目录", exact=True)).to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(
            drawer.get_by_text(expected.code_catalog, exact=True),
            f"代码记录必须明确归属目录“{expected.code_catalog}”",
        ).to_be_visible(timeout=_UI_TIMEOUT_MS)

    def expect_standard_record(self, expected: StandardReferenceData) -> None:
        """Search the standard and confirm its number in the read-only detail drawer."""
        self.navigation.open("/dataStandard", landmark="标准定义")
        self._expect_headers(("中文名称", "英文名称", "英文缩写", "状态", "操作"))
        self._search("请输入标准名称进行搜索", expected.standard_number)
        row = self._visible_row(expected.standard_chinese_name)
        self._expect_exact_cell(row, expected.standard_chinese_name)
        self._expect_exact_cell(row, expected.standard_english_name)
        row.get_by_text(expected.standard_chinese_name, exact=True).first.click()
        drawer = self.page.locator(".ant-drawer-content").filter(has_text="标准信息")
        expect(drawer, "标准详情抽屉必须打开").to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(drawer).to_contain_text(expected.standard_number)

    def _expect_minimum_metric(self, locator: Locator, *, label: str) -> None:
        expect(locator, f"统计指标“{label}”必须可见").to_be_visible(timeout=_UI_TIMEOUT_MS)
        text = re.sub(r"[\s,]", "", locator.inner_text())
        if re.fullmatch(r"\d+", text) is None:
            message = f"统计指标“{label}”必须是整数但实际值为“{text}”"
            raise StandardStatisticsContractError(message)
        if int(text) < _MINIMUM_RECORD_COUNT:
            message = f"统计指标“{label}”必须大于等于 {_MINIMUM_RECORD_COUNT}"
            raise StandardStatisticsContractError(message)

    def _chart_panel(self, title: str) -> Locator:
        return self.page.locator(".standard-chart").filter(
            has=self.page.get_by_text(title, exact=True),
        )

    @staticmethod
    def _expect_progress_metrics(
        panel: Locator,
        metrics: tuple[StatisticMetric, ...],
    ) -> None:
        lines = panel.locator(".dtc-progress-line")
        expect(lines, "图表统计行必须与业务响应一一对应").to_have_count(len(metrics))
        for index, metric in enumerate(metrics):
            if metric.weight is None:
                message = "目录与来源分布必须提供百分比"
                raise StandardStatisticsContractError(message)
            contents = lines.nth(index).locator(".dtc-progress-line-content")
            expect(contents).to_have_count(2)
            expect(contents.nth(0)).to_have_text(f"{metric.name}: {metric.count}")
            rendered_weight = contents.nth(1).inner_text().strip()
            if re.fullmatch(r"(?:0|[1-9]\d*)(?:\.\d+)?%", rendered_weight) is None:
                message = f"统计项“{metric.name}”必须展示合法百分比"
                raise StandardStatisticsContractError(message)
            if float(rendered_weight.removesuffix("%")) != metric.weight:
                message = f"统计项“{metric.name}”展示百分比与业务响应不一致"
                raise StandardStatisticsContractError(message)

    def _expect_headers(self, headers: tuple[str, ...]) -> None:
        table_head = self.page.locator("thead")
        expect(table_head.first, "数据表表头必须可见").to_be_visible(timeout=_UI_TIMEOUT_MS)
        for header in headers:
            expect(
                table_head.get_by_text(header, exact=True).first,
                f"数据表必须展示“{header}”列",
            ).to_be_visible(timeout=_UI_TIMEOUT_MS)

    def _search(self, placeholder: str, value: str) -> None:
        search = self.page.get_by_placeholder(placeholder, exact=True)
        expect(search).to_be_visible(timeout=_UI_TIMEOUT_MS)
        search.fill(value)
        search.press("Enter")
        expect(self.page.locator(".ant-table .ant-spin-spinning").first).to_be_hidden(
            timeout=_UI_TIMEOUT_MS,
        )

    def _visible_row(self, text: str) -> Locator:
        row = self.page.locator("tbody .ant-table-row").filter(has_text=text).first
        expect(row, f"搜索结果必须展示“{text}”").to_be_visible(timeout=_UI_TIMEOUT_MS)
        return row

    @staticmethod
    def _expect_exact_cell(row: Locator, text: str, *, minimum: int = 1) -> None:
        matches = row.get_by_text(text, exact=True)
        expect(matches.first, f"结果行必须展示精确值“{text}”").to_be_visible()
        if matches.count() < minimum:
            message = f"结果行中的精确值“{text}”至少应出现 {minimum} 次"
            raise StandardStatisticsContractError(message)

    @staticmethod
    def _response_payload(response: Response, *, label: str) -> object:
        if not response.ok:
            message = f"{label}请求必须成功但实际 HTTP 状态为 {response.status}"
            raise StandardStatisticsContractError(message)
        return cast("object", response.json())
