"""Public API for the synchronous Playwright Web UI executor."""

from playwright_web_ui.case import automation_case
from playwright_web_ui.manifest import (
    AutomationCase,
    BusinessRecord,
    CaseKey,
    ExecutionManifest,
    ManifestError,
    load_execution_manifest,
)

__all__ = [
    "AutomationCase",
    "BusinessRecord",
    "CaseKey",
    "ExecutionManifest",
    "ManifestError",
    "automation_case",
    "load_execution_manifest",
]
