"""Synchronous Playwright screen for JSON validation configuration."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from playwright.sync_api import expect

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DataSourceType,
    DuplicatePolicy,
    FormSignature,
    JsonKeyDraft,
    JsonKeyReadback,
)

if TYPE_CHECKING:
    from pathlib import Path

    from playwright.sync_api import Download, Locator, Page, Response

    from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation

_ROUTE: Final = "/dq/generalConfig/jsonValidationConfig"
_LIST_ENDPOINT: Final = "/dassets/v1/valid/jsonValidationConfig/getTreeByPage"
_UI_TIMEOUT_MS: Final = 30_000
_HEADERS: Final = (
    "key",
    "中文名称",
    "value格式",
    "数据源类型",
    "创建人",
    "创建时间",
    "更新人",
    "更新时间",
    "操作",
)
_ERROR_IMPORT_TEXT: Final = "导入表格中存在错误数据，请检查后重新导入"  # noqa: RUF001
_MINIMUM_BUSINESS_CELL_COUNT: Final = 9


class JsonConfigurationUiError(AssertionError):
    """Raised when rendered UI values violate the JSON configuration contract."""


@dataclass(frozen=True, slots=True)
class JsonConfigurationScreen:
    """Operate the LTQC JSON configuration page through the controlled browser."""

    navigation: DataAssetsNavigation

    @property
    def page(self) -> Page:
        """Return the executor-owned pytest-playwright page."""
        return self.navigation.page

    @property
    def table(self) -> Locator:
        """Return the JSON configuration table container."""
        return self.page.locator(".json-format-check .ant-table").first

    def open(self) -> None:
        """Open the canonical route and assert the complete table contract."""
        with self.page.expect_response(
            self._is_list_response,
            timeout=_UI_TIMEOUT_MS,
        ) as response_info:
            self.navigation.open(_ROUTE, landmark="json格式校验管理")
        self._require_successful_list_response(response_info.value)
        expect(self.page.locator(".json-format-check").first).to_be_visible(timeout=_UI_TIMEOUT_MS)
        self.wait_for_table()

    def expect_table_contract(self) -> None:
        """Assert all canonical business columns are rendered."""
        expect(self.table, "JSON 配置列表必须可见").to_be_visible(timeout=_UI_TIMEOUT_MS)
        header = self.table.locator("thead").first
        for label in _HEADERS:
            expect(
                header.get_by_text(label, exact=True).first,
                f"JSON 配置列表必须展示“{label}”列",
            ).to_be_visible(timeout=_UI_TIMEOUT_MS)

    def wait_for_table(self) -> None:
        """Wait until Ant Design finishes the table request and render."""
        expect(self.table, "JSON 配置列表必须完成挂载").to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(self.table.locator(".ant-spin-spinning").first).to_be_hidden(timeout=_UI_TIMEOUT_MS)

    def open_create(self) -> Locator:
        """Open and return the root-key creation modal."""
        self._header_button("新增").click()
        modal = self.visible_modal("新建")
        self.expect_root_form(modal)
        return modal

    def open_import(self) -> Locator:
        """Open and return the import modal."""
        self._header_button("导入").click()
        modal = self.visible_modal("导入")
        expect(modal.get_by_text("重复处理规则", exact=True)).to_be_visible()
        expect(modal.get_by_text("上传文件", exact=True)).to_be_visible()
        expect(modal.get_by_text(DuplicatePolicy.SKIP.value, exact=True)).to_be_visible()
        return modal

    def visible_modal(self, title: str | None = None) -> Locator:
        """Return the last visible Ant Design modal, optionally constrained by title."""
        modals = self.page.locator(".ant-modal:visible")
        modal = (
            modals.filter(has=self.page.locator(".ant-modal-title", has_text=title)).last
            if title is not None
            else modals.last
        )
        expect(modal, f"“{title or '目标'}”弹窗必须打开").to_be_visible(timeout=_UI_TIMEOUT_MS)
        return modal

    def expect_root_form(self, modal: Locator) -> None:
        """Assert root creation fields, defaults, and conditional regex area."""
        signature = self.form_signature(modal)
        for label in ("数据源类型", "key", "中文名称", "value格式"):
            if label not in signature.labels:
                message = f"新增表单缺少“{label}”字段"
                raise JsonConfigurationUiError(message)
        if "key" not in signature.required_labels or "数据源类型" not in signature.required_labels:
            message = "新增表单必须把 key 和数据源类型标为必填"
            raise JsonConfigurationUiError(message)
        expect(self._selected_data_source(modal)).to_have_text(DataSourceType.SPARK_THRIFT.value)
        expect(modal.locator("textarea[name='testData'], textarea#testData")).to_have_count(0)
        expect(modal.get_by_role("button", name="正则匹配测试")).to_have_count(0)

    def fill_draft(self, modal: Locator, draft: JsonKeyDraft) -> None:
        """Fill one create/edit/child form with its typed business values."""
        if draft.data_source_type is not None and self._data_source_item(modal).count() == 1:
            self.select_data_source(modal, draft.data_source_type)
        self._input(modal, "jsonKey").fill(draft.key)
        self._input(modal, "name").fill(draft.chinese_name)
        self._input(modal, "value").fill(draft.value_format)
        expect(self._input(modal, "jsonKey")).to_have_value(draft.key)
        expect(self._input(modal, "name")).to_have_value(draft.chinese_name)
        expect(self._input(modal, "value")).to_have_value(draft.value_format)

    def select_data_source(self, modal: Locator, value: DataSourceType) -> None:
        """Select one of the exact three supported data-source values."""
        item = self._data_source_item(modal)
        trigger = item.locator(".ant-select").first
        expect(trigger).to_be_visible(timeout=_UI_TIMEOUT_MS)
        trigger.click()
        dropdown = self.page.locator(".ant-select-dropdown:visible").last
        option = dropdown.locator(".ant-select-item-option").filter(has_text=value.value)
        expect(option).to_have_count(1)
        option.click()
        expect(self._selected_data_source(modal)).to_have_text(value.value)

    def data_source_choices(self, modal: Locator) -> tuple[str, ...]:
        """Open the select and read every displayed product option."""
        self._data_source_item(modal).locator(".ant-select").first.click()
        dropdown = self.page.locator(".ant-select-dropdown:visible").last
        expect(dropdown).to_be_visible(timeout=_UI_TIMEOUT_MS)
        values = tuple(
            text.strip()
            for text in dropdown.locator(".ant-select-item-option-content").all_inner_texts()
        )
        self.page.keyboard.press("Escape")
        expect(dropdown).to_be_hidden(timeout=_UI_TIMEOUT_MS)
        return values

    def regex_probe(self, modal: Locator, *, test_data: str, expected_match: bool) -> None:
        """Run the modal's dynamic regex tester and assert its visible business result."""
        test_input = modal.locator("textarea").first
        expect(test_input, "value格式非空时必须展示测试数据输入框").to_be_visible(
            timeout=_UI_TIMEOUT_MS
        )
        test_input.fill(test_data)
        modal.get_by_role("button", name="正则匹配测试", exact=True).click()
        expected = (
            re.compile("匹配成功|符合正则") if expected_match else re.compile("匹配失败|不符合正则")
        )
        expect(modal.get_by_text(expected).first).to_be_visible(timeout=_UI_TIMEOUT_MS)

    def confirm_modal(self, modal: Locator, *, closes: bool = True) -> None:
        """Submit a modal and optionally require it to close after persistence."""
        modal.get_by_role("button", name=re.compile(r"^确\s*定$")).first.click()
        if closes:
            expect(modal).to_be_hidden(timeout=_UI_TIMEOUT_MS)
            self.wait_for_table()

    def cancel_modal(self, modal: Locator) -> None:
        """Close a modal without persisting changes."""
        modal.get_by_role("button", name=re.compile(r"^取\s*消$")).first.click()
        expect(modal).to_be_hidden(timeout=_UI_TIMEOUT_MS)

    def expect_key_validation(self, modal: Locator, *, value: str, message: str) -> None:
        """Submit an invalid key and require the exact visible validation message."""
        self._input(modal, "jsonKey").fill(value)
        self.confirm_modal(modal, closes=False)
        expect(modal.get_by_text(message, exact=False).first).to_be_visible(timeout=_UI_TIMEOUT_MS)
        expect(modal).to_be_visible()

    def search(self, keyword: str) -> None:
        """Perform the UI's fuzzy key search and wait for the result table."""
        search = self.page.locator(".dt-search input").first
        expect(search).to_be_visible(timeout=_UI_TIMEOUT_MS)
        with self.page.expect_response(
            self._is_list_response,
            timeout=_UI_TIMEOUT_MS,
        ) as response_info:
            search.fill(keyword)
            search.press("Enter")
        self._require_successful_list_response(response_info.value)
        self.wait_for_table()

    def clear_search(self) -> None:
        """Clear the key search and restore the unfiltered list."""
        self.search("")

    def row(self, key: str) -> Locator:
        """Return the first row whose key cell exactly matches the requested key."""
        key_cell = self.page.locator(".json-format-check__key-text").filter(
            has_text=re.compile(rf"^{re.escape(key)}$")
        )
        return self.page.locator(".json-format-check .ant-table-row").filter(has=key_cell).first

    def expect_row(self, key: str) -> Locator:
        """Require one exact key row and return it."""
        row = self.row(key)
        expect(row, f"列表必须展示 key “{key}”").to_be_visible(timeout=_UI_TIMEOUT_MS)
        return row

    def expect_no_row(self, key: str) -> None:
        """Require that no rendered row has the exact key."""
        expect(self.row(key), f"列表不得展示 key “{key}”").to_have_count(0)

    def readback(self, key: str) -> JsonKeyReadback:
        """Read the complete business row after a search or hierarchy expansion."""
        row = self.expect_row(key)
        cells = row.locator("td")
        if cells.count() < _MINIMUM_BUSINESS_CELL_COUNT:
            message = "JSON 配置结果行必须包含完整业务列"
            raise JsonConfigurationUiError(message)
        return JsonKeyReadback(
            key=_normalized_cell(cells.nth(1).inner_text()),
            chinese_name=_normalized_cell(cells.nth(2).inner_text()),
            value_format=_normalized_cell(cells.nth(3).inner_text()),
            data_source_type=_normalized_cell(cells.nth(4).inner_text()),
            created_by=_normalized_cell(cells.nth(5).inner_text()),
            created_at=_normalized_cell(cells.nth(6).inner_text()),
            updated_by=_normalized_cell(cells.nth(7).inner_text()),
            updated_at=_normalized_cell(cells.nth(8).inner_text()),
        )

    def open_edit(self, key: str) -> Locator:
        """Open the exact key row's edit modal."""
        row = self.expect_row(key)
        row.get_by_role("button", name="编辑", exact=True).click()
        modal = self.visible_modal("编辑")
        expect(self._input(modal, "jsonKey")).to_have_value(key)
        return modal

    def open_add_child(self, parent_key: str) -> Locator:
        """Open a parent row's child-key modal and assert root-only fields are absent."""
        row = self.expect_row(parent_key)
        row.get_by_role("button", name="新增子层级", exact=True).click()
        modal = self.visible_modal("新建子层级")
        expect(self._data_source_item(modal)).to_have_count(0)
        return modal

    def expand(self, key: str) -> None:
        """Expand exactly one collapsed hierarchy row."""
        row = self.expect_row(key)
        icon = row.locator(".ant-table-row-expand-icon-collapsed").first
        expect(icon, f"key “{key}”必须具有可展开子层级").to_be_visible(timeout=_UI_TIMEOUT_MS)
        icon.click()
        expect(row.locator(".ant-table-row-expand-icon-expanded").first).to_be_visible(
            timeout=_UI_TIMEOUT_MS
        )

    def expect_leaf_controls(self, key: str) -> None:
        """Assert a fifth-level row cannot add children but remains editable/deletable."""
        row = self.expect_row(key)
        add_child = row.get_by_role("button", name="新增子层级", exact=True)
        expect(add_child).to_be_disabled()
        expect(row.get_by_role("button", name="编辑", exact=True)).to_be_enabled()
        expect(row.get_by_role("button", name="删除", exact=True)).to_be_enabled()
        expect(row.locator(".ant-table-row-expand-icon-collapsed")).to_have_count(0)

    def delete(self, key: str) -> None:
        """Delete one key through its row action and confirm cascade wording."""
        row = self.expect_row(key)
        row.get_by_role("button", name="删除", exact=True).click()
        popover = self.page.locator(".ant-popover:visible").last
        expect(popover).to_contain_text("请确认是否删除key信息")
        expect(popover).to_contain_text("若存在子层级key信息会联动删除")
        popover.get_by_role("button", name="删除", exact=True).click()
        self.wait_for_table()

    def select_rows(self, keys: tuple[str, ...]) -> None:
        """Select exact tree rows for a batch action."""
        for key in keys:
            checkbox = self.expect_row(key).locator("input[type='checkbox']").first
            checkbox.check()
            expect(checkbox).to_be_checked()
        expect(self._header_button("批量删除")).to_be_enabled()

    def batch_delete_selected(self) -> None:
        """Delete selected rows and assert the batch cascade confirmation."""
        self._header_button("批量删除").click()
        modal = self.page.locator(".ant-modal-confirm:visible").last
        expect(modal).to_contain_text("是否批量删除key信息")
        expect(modal).to_contain_text("若存在子层级key信息会联动删除")
        modal.get_by_role("button", name="删除", exact=True).click()
        expect(modal).to_be_hidden(timeout=_UI_TIMEOUT_MS)
        self.wait_for_table()

    def filter_data_source(self, source_type: DataSourceType) -> None:
        """Apply the table's single-select data-source filter."""
        self._apply_column_filter("数据源类型", source_type.value)

    def filter_creator(self, creator: str) -> None:
        """Apply the canonical creator filter and require its exact option."""
        self._apply_column_filter("创建人", creator)

    def _apply_column_filter(self, column: str, value: str) -> None:
        """Apply one exact Ant Design table-column filter."""
        header = self.table.locator("th").filter(has_text=column).first
        trigger = header.locator(".ant-table-filter-trigger")
        expect(trigger, f"“{column}”列必须提供筛选入口").to_be_visible(timeout=_UI_TIMEOUT_MS)
        trigger.click()
        dropdown = self.page.locator(
            ".ant-dropdown:visible, .ant-table-filter-dropdown:visible"
        ).last
        expect(dropdown).to_be_visible(timeout=_UI_TIMEOUT_MS)
        option = dropdown.get_by_text(value, exact=True)
        expect(option).to_be_visible()
        with self.page.expect_response(
            self._is_list_response,
            timeout=_UI_TIMEOUT_MS,
        ) as response_info:
            option.click()
            confirm = dropdown.get_by_role("button", name=re.compile("确[定认]")).first
            if confirm.count() == 1:
                confirm.click()
        self._require_successful_list_response(response_info.value)
        self.wait_for_table()

    def visible_business_row_count(self) -> int:
        """Return the number of actual records rendered on the current page."""
        return self.table.locator("tbody > tr.ant-table-row").count()

    def clear_data_source_filter(self) -> None:
        """Reset the table's data-source filter."""
        header = self.table.locator("th").filter(has_text="数据源类型").first
        header.locator(".ant-table-filter-trigger").click()
        dropdown = self.page.locator(
            ".ant-dropdown:visible, .ant-table-filter-dropdown:visible"
        ).last
        reset = dropdown.get_by_role("button", name=re.compile("重置|清空")).first
        expect(reset).to_be_visible(timeout=_UI_TIMEOUT_MS)
        with self.page.expect_response(
            self._is_list_response,
            timeout=_UI_TIMEOUT_MS,
        ) as response_info:
            reset.click()
        self._require_successful_list_response(response_info.value)
        self.wait_for_table()

    def visible_readbacks(self) -> tuple[JsonKeyReadback, ...]:
        """Return every currently rendered business row."""
        return tuple(self.readback(key) for key in dict.fromkeys(self.visible_keys()))

    def visible_keys(self) -> tuple[str, ...]:
        """Return rendered key values in current table order."""
        return tuple(
            text.strip()
            for text in self.page.locator(".json-format-check__key-text").all_inner_texts()
            if text.strip() and text.strip() != "--"
        )

    def total_count(self) -> int:
        """Read the pagination's total business-record count."""
        footer = (
            self.page.locator(".json-format-check").get_by_text(re.compile(r"共\s*\d+\s*条")).last
        )
        expect(footer).to_be_visible(timeout=_UI_TIMEOUT_MS)
        match = re.search(r"\d+", footer.inner_text())
        if match is None:
            message = "分页必须展示总记录数"
            raise JsonConfigurationUiError(message)
        return int(match.group())

    def goto_page(self, number: int, *, previous_keys: tuple[str, ...] = ()) -> None:
        """Navigate through pagination and wait for its list request and DOM replacement."""
        button = self.page.locator(".ant-pagination-item").filter(has_text=str(number)).first
        expect(button).to_be_visible(timeout=_UI_TIMEOUT_MS)
        with self.page.expect_response(
            self._is_list_response,
            timeout=_UI_TIMEOUT_MS,
        ) as response_info:
            button.click()
        self._require_successful_list_response(response_info.value)
        self.wait_for_table()
        expect(button).to_have_class(re.compile("ant-pagination-item-active"))
        if previous_keys:
            expect(
                self.page.locator(".json-format-check__key-text").first,
                "翻页请求完成后首条 key 必须替换",
            ).not_to_have_text(previous_keys[0], timeout=_UI_TIMEOUT_MS)

    def set_page_size(self, page_size: int) -> None:
        """Select a supported page size and wait for the resulting list request."""
        if page_size not in {10, 20, 50, 100}:
            message = "page size must be one of 10, 20, 50, or 100"
            raise ValueError(message)
        selector = self.page.locator(".ant-pagination-options-size-changer").first
        expect(selector, "分页必须提供每页条数选择器").to_be_visible(timeout=_UI_TIMEOUT_MS)
        if re.search(rf"(?:^|\D){page_size}\s*条/页(?:\D|$)", selector.inner_text()):
            return
        selector.click()
        dropdown = self.page.locator(".ant-select-dropdown:visible").last
        option = dropdown.get_by_text(re.compile(rf"^{page_size}\s*条/页$"))
        expect(option).to_be_visible(timeout=_UI_TIMEOUT_MS)
        with self.page.expect_response(
            self._is_list_response,
            timeout=_UI_TIMEOUT_MS,
        ) as response_info:
            option.click()
        self._require_successful_list_response(response_info.value)
        self.wait_for_table()
        expect(selector).to_contain_text(str(page_size))

    def expect_empty(self) -> None:
        """Assert the no-results state and zero total."""
        expect(self.table.get_by_text("暂无数据", exact=True)).to_be_visible(timeout=_UI_TIMEOUT_MS)
        if self.total_count() != 0:
            message = "空搜索结果的分页总数必须为 0"
            raise JsonConfigurationUiError(message)

    def form_signature(self, modal: Locator) -> FormSignature:
        """Read modal title, field order, and required fields from rendered DOM."""
        title = modal.locator(".ant-modal-title").inner_text().strip()
        labels = modal.locator(".ant-form-item-label label")
        ordered = tuple(text.strip().removesuffix(":") for text in labels.all_inner_texts())
        required = frozenset(
            labels.nth(index).inner_text().strip().removesuffix(":")
            for index in range(labels.count())
            if "ant-form-item-required" in (labels.nth(index).get_attribute("class") or "")
        )
        return FormSignature(title=title, labels=ordered, required_labels=required)

    def choose_import_policy(self, modal: Locator, policy: DuplicatePolicy) -> None:
        """Select an exact import duplicate policy."""
        radio = modal.get_by_text(policy.value, exact=True).locator("xpath=ancestor::label[1]")
        expect(radio).to_be_visible(timeout=_UI_TIMEOUT_MS)
        radio.click()
        expect(radio.locator("input[type='radio']")).to_be_checked()

    def upload_with_file_chooser(self, modal: Locator, path: Path) -> None:
        """Upload a local fixture using Playwright's real file-chooser event."""
        with self.page.expect_file_chooser(timeout=_UI_TIMEOUT_MS) as chooser_info:
            modal.get_by_role("button", name="上传", exact=True).click()
        chooser_info.value.set_files(str(path))
        expect(modal).to_contain_text(path.name)

    def upload_rejected_file(self, modal: Locator, path: Path) -> None:
        """Choose a deliberately unsupported file and require the XLSX-only warning."""
        with self.page.expect_file_chooser(timeout=_UI_TIMEOUT_MS) as chooser_info:
            modal.get_by_role("button", name="上传", exact=True).click()
        chooser_info.value.set_files(str(path))
        expect(self.page.get_by_text("仅支持上传xlsx文件", exact=True).last).to_be_visible(
            timeout=_UI_TIMEOUT_MS
        )
        expect(modal).not_to_contain_text(path.name)

    def submit_import_success(self, modal: Locator) -> None:
        """Submit an import and require persisted success plus modal closure."""
        self.confirm_modal(modal)
        expect(self.page.get_by_text("导入成功", exact=True).last).to_be_visible(
            timeout=_UI_TIMEOUT_MS
        )

    def submit_import_error(self, modal: Locator) -> None:
        """Submit an invalid workbook and require the exported-error affordance."""
        self.confirm_modal(modal, closes=False)
        notice = self.page.locator(".ant-notification-notice:visible").filter(
            has_text=_ERROR_IMPORT_TEXT
        )
        expect(notice).to_have_count(1, timeout=_UI_TIMEOUT_MS)
        expect(notice.get_by_text("点击导出", exact=True)).to_be_visible()

    def submit_import_rejected(self, modal: Locator, *, message: str) -> None:
        """Submit a workbook rejected before error-file generation and require its reason."""
        self.confirm_modal(modal, closes=False)
        expect(self.page.get_by_text(message, exact=False).last).to_be_visible(
            timeout=_UI_TIMEOUT_MS
        )
        expect(modal).to_be_visible()

    def download_import_error(self, target_dir: Path) -> Path:
        """Download the current import-error workbook through Playwright."""
        notice = self.page.locator(".ant-notification-notice:visible").filter(
            has_text=_ERROR_IMPORT_TEXT
        )
        with self.page.expect_download(timeout=_UI_TIMEOUT_MS) as download_info:
            notice.get_by_text("点击导出", exact=True).click()
        return _save_download(download_info.value, target_dir)

    def download_template(self, modal: Locator, target_dir: Path) -> Path:
        """Download the platform import template through Playwright."""
        with self.page.expect_download(timeout=_UI_TIMEOUT_MS) as download_info:
            modal.get_by_role("button", name="下载模板", exact=True).click()
        return _save_download(download_info.value, target_dir)

    def export(self, target_dir: Path) -> Path:
        """Export the current selection/filter and save the browser download."""
        self._header_button("导出").click()
        popover = self.page.locator(".ant-popover:visible").last
        expect(popover).to_contain_text(re.compile("请确认是否导出"))
        with self.page.expect_download(timeout=_UI_TIMEOUT_MS) as download_info:
            popover.get_by_role("button", name=re.compile("确[定认]")).first.click()
        return _save_download(download_info.value, target_dir)

    def _header_button(self, name: str) -> Locator:
        spaced = r"\s*".join(map(re.escape, name))
        button = self.page.get_by_role("button", name=re.compile(rf"^{spaced}$")).first
        expect(button, f"页面“{name}”按钮必须可见").to_be_visible(timeout=_UI_TIMEOUT_MS)
        return button

    @staticmethod
    def _input(modal: Locator, name: str) -> Locator:
        return modal.locator(f"input#{name}, input[id$='{name}']").first

    @staticmethod
    def _data_source_item(modal: Locator) -> Locator:
        return modal.locator(".ant-form-item").filter(has_text="数据源类型")

    def _selected_data_source(self, modal: Locator) -> Locator:
        return self._data_source_item(modal).locator(".ant-select-selection-item").first

    @staticmethod
    def _is_list_response(response: Response) -> bool:
        return response.request.method == "POST" and _LIST_ENDPOINT in response.url

    @staticmethod
    def _require_successful_list_response(response: Response) -> None:
        if not response.ok:
            message = f"JSON configuration list request failed with HTTP {response.status}"
            raise JsonConfigurationUiError(message)


def _normalized_cell(value: str) -> str:
    text = value.strip()
    return "" if text in {"-", "--", "- -"} else text


def _save_download(download: Download, target_dir: Path) -> Path:
    target_dir.mkdir(parents=True, exist_ok=True)
    suggested = download.suggested_filename
    if not suggested:
        message = "浏览器下载必须提供文件名"
        raise JsonConfigurationUiError(message)
    target = target_dir / suggested
    download.save_as(target)
    if not target.is_file() or target.stat().st_size == 0:
        message = "浏览器下载文件必须存在且非空"
        raise JsonConfigurationUiError(message)
    return target
