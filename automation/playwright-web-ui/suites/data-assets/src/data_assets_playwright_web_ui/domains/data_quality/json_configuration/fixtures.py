"""Pytest fixtures owned by the JSON configuration capability."""

from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

from data_assets_playwright_web_ui.components.navigation import DataAssetsNavigation
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.actions import (
    JsonConfigurationActions,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.screen import (
    JsonConfigurationScreen,
)

if TYPE_CHECKING:
    from playwright.sync_api import Page

    from playwright_web_ui.platform_context import PlatformContext


@pytest.fixture
def json_configuration_screen(
    page: Page,
    platform_context: PlatformContext,
) -> JsonConfigurationScreen:
    """Build the JSON configuration screen on the controlled browser page."""
    return JsonConfigurationScreen(DataAssetsNavigation(page, platform_context))


@pytest.fixture
def json_configuration_actions(
    json_configuration_screen: JsonConfigurationScreen,
) -> JsonConfigurationActions:
    """Build JSON configuration actions from the project screen fixture."""
    return JsonConfigurationActions(json_configuration_screen)
