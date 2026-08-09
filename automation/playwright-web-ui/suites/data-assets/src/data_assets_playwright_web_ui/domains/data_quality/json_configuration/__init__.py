"""JSON validation configuration UI automation capability."""

from data_assets_playwright_web_ui.domains.data_quality.json_configuration.actions import (
    JsonConfigurationActions,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.model import (
    DataSourceType,
    DuplicatePolicy,
    JsonKeyDraft,
    JsonKeyReadback,
)
from data_assets_playwright_web_ui.domains.data_quality.json_configuration.screen import (
    JsonConfigurationScreen,
)

__all__ = [
    "DataSourceType",
    "DuplicatePolicy",
    "JsonConfigurationActions",
    "JsonConfigurationScreen",
    "JsonKeyDraft",
    "JsonKeyReadback",
]
