"""Data Assets Playwright Web UI suite registration."""

from pathlib import Path
from typing import Final

from playwright_web_ui import SuiteDefinition

_SUITE_ROOT = Path(__file__).resolve().parents[2]

SUITE: Final = SuiteDefinition(
    project_id="data-assets",
    root_path=_SUITE_ROOT,
    tests_path=_SUITE_ROOT / "tests" / "e2e",
    fixture_plugins=(
        "data_assets_playwright_web_ui.domains.data_quality.json_value_validation.fixtures",
    ),
)
