"""Pytest fixtures owned by the JSON value-validation capability."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
from data_assets_playwright_web_ui.domains.data_quality.json_value_validation.actions import (
    JsonValueValidationJourney,
)
from data_assets_playwright_web_ui.domains.data_quality.json_value_validation.assertions import (
    JsonValueAssertions,
)
from data_assets_playwright_web_ui.domains.data_quality.json_value_validation.screen import (
    JsonValueValidationScreen,
)

if TYPE_CHECKING:
    from playwright.sync_api import Page

    from playwright_web_ui.platform_context import PlatformContext


@pytest.fixture
def json_value_journey(
    page: Page,
    platform_context: PlatformContext,
) -> JsonValueValidationJourney:
    """Build the JSON value-validation facade on the controlled browser page."""
    screen = JsonValueValidationScreen(DataAssetsNavigation(page, platform_context))
    return JsonValueValidationJourney(screen=screen, assertions=JsonValueAssertions())
