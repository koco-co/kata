from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

from playwright_web_ui.source_policy import SourcePolicyError, validate_sync_only_sources

if TYPE_CHECKING:
    from pathlib import Path


def test_sync_only_source_policy_accepts_synchronous_playwright(tmp_path: Path) -> None:
    source = tmp_path / "screen.py"
    source.write_text(
        "from playwright.sync_api import Page\n\n"
        "def read(page: Page) -> str:\n"
        "    return page.title()\n",
        encoding="utf-8",
    )

    validate_sync_only_sources((tmp_path,))


@pytest.mark.parametrize(
    "source",
    [
        "from playwright.async_api import Page\n",
        "from playwright import async_api\n",
        "import playwright.async_api\n",
        "import asyncio\n",
        "async def fixture_page():\n    return None\n",
        "def call(playwright):\n    return playwright.async_api\n",
        "import importlib as loader\nloader.import_module('playwright.async_api')\n",
        "from importlib import import_module as load\nload('asyncio')\n",
        "__import__('playwright.async_api')\n",
    ],
)
def test_sync_only_source_policy_rejects_async_api_and_async_mixing(
    tmp_path: Path,
    source: str,
) -> None:
    (tmp_path / "invalid.py").write_text(source, encoding="utf-8")

    with pytest.raises(SourcePolicyError, match="SYNC_API_ONLY"):
        validate_sync_only_sources((tmp_path,))


def test_sync_only_source_policy_reports_invalid_python(tmp_path: Path) -> None:
    (tmp_path / "invalid.py").write_text("def broken(:\n", encoding="utf-8")

    with pytest.raises(SourcePolicyError, match="SOURCE_SCAN_INVALID"):
        validate_sync_only_sources((tmp_path,))
