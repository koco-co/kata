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
from playwright_web_ui.runtime_identity import AutomationRuntimeIdentity, RuntimeIdentityError
from playwright_web_ui.suite import SuiteDefinition, SuiteRegistryError

__all__ = [
    "AutomationCase",
    "AutomationRuntimeIdentity",
    "BusinessRecord",
    "CaseKey",
    "ExecutionManifest",
    "ManifestError",
    "RuntimeIdentityError",
    "SuiteDefinition",
    "SuiteRegistryError",
    "automation_case",
    "load_execution_manifest",
]
