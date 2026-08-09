"""Strict form-control primitives for the Data Quality rule editors."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from playwright.sync_api import expect

from .screen_base import UI_TIMEOUT_MS, SqlMergeUiError

if TYPE_CHECKING:
    from playwright.sync_api import Locator, Page


@dataclass(frozen=True, slots=True)
class ExactFormControls:
    """Operate only visible, labeled Ant-compatible controls within one scope."""

    page: Page

    def item(self, root: Locator, label: str) -> Locator:
        """Return the last visible form item carrying one exact label."""
        candidates = root.locator(".ant-form-item:visible").filter(
            has=root.get_by_text(label, exact=True)
        )
        if candidates.count() < 1:
            message = f"页面必须展示带标签“{label}”的表单项"
            raise SqlMergeUiError(message)
        item = candidates.last
        expect(item, f"表单项“{label}”必须可见").to_be_visible(timeout=UI_TIMEOUT_MS)
        return item

    def fill(self, root: Locator, *, label: str, value: str, index: int = 0) -> None:
        """Fill one exact indexed input inside a labeled item and read it back."""
        item = self.item(root, label)
        inputs = item.locator(
            "input:not(.ant-select-selection-search-input):visible, textarea:visible"
        )
        resolved = _resolve_index(inputs.count(), index)
        if resolved is None:
            message = f"表单项“{label}”缺少第 {index + 1} 个输入控件"
            raise SqlMergeUiError(message)
        control = inputs.nth(resolved)
        control.fill(value)
        expect(control, f"表单项“{label}”必须回显输入值").to_have_value(
            value,
            timeout=UI_TIMEOUT_MS,
        )

    def select(self, root: Locator, *, label: str, value: str, index: int = 0) -> None:
        """Select one exact option from one indexed labeled selector."""
        item = self.item(root, label)
        selectors = item.locator(".ant-select:visible")
        resolved = _resolve_index(selectors.count(), index)
        if resolved is None:
            message = f"表单项“{label}”缺少第 {index + 1} 个选择控件"
            raise SqlMergeUiError(message)
        selector = selectors.nth(resolved)
        self.select_control(selector, value=value, label=label)

    def select_control(self, selector: Locator, *, value: str, label: str) -> None:
        """Select one exact option from an already-scoped visible selector."""
        expect(selector, f"表单项“{label}”必须展示选择控件").to_be_visible(timeout=UI_TIMEOUT_MS)
        selector.locator(".ant-select-selector").click()
        dropdown = self.page.locator(".ant-select-dropdown:visible").last
        expect(dropdown, f"表单项“{label}”必须打开选项面板").to_be_visible(timeout=UI_TIMEOUT_MS)
        option = dropdown.get_by_text(value, exact=True)
        expect(option, f"表单项“{label}”必须有唯一选项“{value}”").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        option.click()
        expect(selector, f"表单项“{label}”必须回显“{value}”").to_contain_text(
            value,
            timeout=UI_TIMEOUT_MS,
        )

    @staticmethod
    def fill_control(control: Locator, *, value: str, label: str) -> None:
        """Fill and read back an already-scoped input without selector search inputs."""
        expect(control, f"表单项“{label}”必须展示输入控件").to_be_visible(timeout=UI_TIMEOUT_MS)
        control.fill(value)
        expect(control, f"表单项“{label}”必须回显输入值").to_have_value(
            value,
            timeout=UI_TIMEOUT_MS,
        )

    def select_many(self, root: Locator, *, label: str, values: tuple[str, ...]) -> None:
        """Select every unique value in an exact multi-select and read all chips back."""
        if not values or len(set(values)) != len(values):
            message = "多选控件需要非空且不重复的期望值"
            raise ValueError(message)
        item = self.item(root, label)
        selector = item.locator(".ant-select:visible").last
        expect(selector, f"表单项“{label}”必须展示多选控件").to_be_visible(timeout=UI_TIMEOUT_MS)
        for value in values:
            selector.locator(".ant-select-selector").click()
            dropdown = self.page.locator(".ant-select-dropdown:visible").last
            option = dropdown.get_by_text(value, exact=True)
            expect(option, f"多选控件“{label}”必须有选项“{value}”").to_have_count(
                1,
                timeout=UI_TIMEOUT_MS,
            )
            option.click()
        self.page.keyboard.press("Escape")
        for value in values:
            expect(selector.get_by_text(value, exact=True)).to_be_visible(timeout=UI_TIMEOUT_MS)

    def choose(self, root: Locator, *, label: str, value: str) -> None:
        """Choose an exact radio or checkbox value within one labeled item."""
        item = self.item(root, label)
        control = item.get_by_text(value, exact=True)
        expect(control, f"表单项“{label}”必须有选项“{value}”").to_have_count(
            1,
            timeout=UI_TIMEOUT_MS,
        )
        control.click()
        checked = item.locator(".ant-radio-checked, .ant-checkbox-checked").filter(
            has=item.get_by_text(value, exact=True)
        )
        if checked.count() == 0:
            selected = item.get_by_text(value, exact=True)
            expect(selected, f"选项“{value}”必须保持选中状态").to_be_visible(timeout=UI_TIMEOUT_MS)

    def expect_text(self, root: Locator, *, label: str, value: str) -> None:
        """Require a labeled form item to read back one exact configured value."""
        item = self.item(root, label)
        expect(
            item.get_by_text(value, exact=True), f"表单项“{label}”必须回显“{value}”"
        ).to_be_visible(timeout=UI_TIMEOUT_MS)


def _resolve_index(count: int, index: int) -> int | None:
    resolved = count + index if index < 0 else index
    return resolved if 0 <= resolved < count else None
