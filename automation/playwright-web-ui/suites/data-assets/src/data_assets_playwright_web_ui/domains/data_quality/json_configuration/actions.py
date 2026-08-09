"""High-level, independently reusable JSON configuration UI actions."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DuplicatePolicy,
    JsonKeyDraft,
    JsonKeyReadback,
)

if TYPE_CHECKING:
    from pathlib import Path

    from data_assets_playwright_web_ui.domains.data_quality.json_configuration.screen import (
        JsonConfigurationScreen,
    )


@dataclass(frozen=True, slots=True)
class JsonConfigurationActions:
    """Compose product-level operations over the JSON configuration screen."""

    screen: JsonConfigurationScreen

    def create_root(
        self,
        draft: JsonKeyDraft,
        *,
        regex_test_data: str | None = None,
    ) -> JsonKeyReadback:
        """Create a root key and prove persistence through UI search/readback."""
        modal = self.screen.open_create()
        self.screen.fill_draft(modal, draft)
        if regex_test_data is not None:
            self.screen.regex_probe(modal, test_data=regex_test_data, expected_match=True)
        self.screen.confirm_modal(modal)
        self.screen.search(draft.key)
        return self.screen.readback(draft.key)

    def create_child(
        self,
        *,
        parent_key: str,
        draft: JsonKeyDraft,
    ) -> JsonKeyReadback:
        """Create a direct child and prove it by expanding the parent through the UI."""
        self.screen.search(parent_key)
        modal = self.screen.open_add_child(parent_key)
        child = JsonKeyDraft(
            key=draft.key,
            chinese_name=draft.chinese_name,
            value_format=draft.value_format,
            data_source_type=None,
        )
        self.screen.fill_draft(modal, child)
        self.screen.confirm_modal(modal)
        self.screen.search(parent_key)
        self.screen.expand(parent_key)
        return self.screen.readback(child.key)

    def update(self, *, existing_key: str, replacement: JsonKeyDraft) -> JsonKeyReadback:
        """Edit one exact key and prove all persisted values through UI readback."""
        self.screen.search(existing_key)
        modal = self.screen.open_edit(existing_key)
        self.screen.fill_draft(modal, replacement)
        self.screen.confirm_modal(modal)
        self.screen.search(replacement.key)
        return self.screen.readback(replacement.key)

    def delete(self, key: str) -> None:
        """Delete one key and prove it is absent from a fresh UI search."""
        self.screen.search(key)
        self.screen.delete(key)
        self.screen.search(key)
        self.screen.expect_no_row(key)

    def import_workbook(
        self,
        path: Path,
        *,
        policy: DuplicatePolicy,
        expect_error: bool = False,
    ) -> None:
        """Upload and submit a workbook using the product import modal."""
        modal = self.screen.open_import()
        self.screen.choose_import_policy(modal, policy)
        self.screen.upload_with_file_chooser(modal, path)
        if expect_error:
            self.screen.submit_import_error(modal)
        else:
            self.screen.submit_import_success(modal)
