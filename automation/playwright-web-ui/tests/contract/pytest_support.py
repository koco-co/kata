"""Shared black-box helpers for pytest plugin contract tests."""

from __future__ import annotations

import json
import textwrap
from base64 import b64decode
from typing import TYPE_CHECKING

from playwright_web_ui.platform_context import AUTH_COOKIE_ENV, PLATFORM_CONTEXT_ENV
from playwright_web_ui.pytest_runtime_paths import ATTEMPT_PATH_ENV

if TYPE_CHECKING:
    from pathlib import Path

    import pytest
    from _pytest.pytester import RunResult

SYNTHETIC_AUTH_COOKIE = "sid=synthetic-session-001; dt_tenant_name=synthetic-tenant"
VALID_PNG = b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def manifest_payload(*, platform_write: bool = False) -> dict[str, object]:
    """Return one valid single-case execution manifest payload."""
    return {
        "schema_version": 2,
        "logical_run_id": "20260808-1030-run-01",
        "execution_id": "execution-01",
        "project_id": "data-assets",
        "executor_id": "playwright-web-ui",
        "cases": [
            {
                "feature_id": "asset-catalog",
                "case_id": "C0001",
                "title": "Create an asset",
                "effects": {"platform_write": platform_write},
                "business_record": {"policy": "required"},
            }
        ],
    }


def platform_context_payload() -> dict[str, object]:
    """Return one valid non-secret platform context for runtime tests."""
    return {
        "schemaVersion": 2,
        "env": "synthetic-dev",
        "urls": {
            "baseUrl": "https://synthetic.example.test",
            "assetsBaseUrl": "https://synthetic.example.test/dataAssets",
            "offlineBaseUrl": "https://synthetic.example.test/batch",
            "portalBaseUrl": "https://synthetic.example.test/portal",
        },
        "tenant": {"name": "synthetic-tenant"},
        "projects": {"quality": {"id": 101, "name": "synthetic-quality"}},
        "datasources": {
            "primary": {
                "name": "synthetic-source",
                "metadata": {"id": 201, "name": "synthetic-metadata", "typeId": 2},
                "assets": {"id": 202, "name": "synthetic-assets", "typeId": 3},
                "database": "synthetic_database",
                "schema": "synthetic_schema",
                "requiresOffline": False,
            }
        },
        "defaults": {"datasource": "primary"},
        "safety": {"allowWrite": False},
    }


def write_manifest(pytester: pytest.Pytester, payload: object) -> Path:
    """Write one execution manifest inside the isolated pytester workspace."""
    path = pytester.path / "execution-manifest.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    return path


def write_case(pytester: pytest.Pytester, *, case: str = "C0001") -> None:
    """Write one canonical marker-only test case."""
    pytester.makepyfile(
        f"""
        from playwright_web_ui import automation_case

        @automation_case(
            project_id="data-assets",
            feature_id="asset-catalog",
            case_id="{case}",
        )
        def test_case():
            pass
        """
    )


def prepare_attempt(pytester: pytest.Pytester, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Preallocate the immutable attempt outputs and export their path."""
    attempt = pytester.path / "attempts" / "001"
    for name in ("allure-results", "evidence", "business-records", "playwright-artifacts"):
        (attempt / name).mkdir(parents=True)
    monkeypatch.setenv(ATTEMPT_PATH_ENV, str(attempt))
    monkeypatch.setenv(PLATFORM_CONTEXT_ENV, json.dumps(platform_context_payload()))
    monkeypatch.setenv(AUTH_COOKIE_ENV, SYNTHETIC_AUTH_COOKIE)
    return attempt


def run_runtime(
    pytester: pytest.Pytester,
    manifest: Path,
    attempt: Path,
    *extra_args: str,
) -> RunResult:
    """Run a manifest with the mandatory canonical Allure result directory."""
    return pytester.runpytest_subprocess(
        "--execution-manifest",
        str(manifest),
        "--alluredir",
        str(attempt / "allure-results"),
        "--allure-no-capture",
        "--show-capture=no",
        *runtime_output_args(attempt),
        *extra_args,
    )


def runtime_output_args(attempt: Path) -> tuple[str, str]:
    """Return the only pytest-playwright output path allowed for one attempt."""
    return "--output", str(attempt / "playwright-artifacts")


def fake_page_source() -> str:
    """Return a synchronous in-memory Page fixture with a structurally valid PNG."""
    return textwrap.dedent(
        f"""
        import pytest

        class Body:
            def inner_text(self, **kwargs):
                return "Visible rule row"

        class FakePage:
            url = "https://example.test/rules"

            def __init__(self):
                self.listeners = {{}}

            def title(self):
                return "Rules"

            def locator(self, selector):
                return Body()

            def screenshot(self, **kwargs):
                return {VALID_PNG!r}

            def on(self, event, callback):
                self.listeners.setdefault(event, []).append(callback)

            def remove_listener(self, event, callback):
                self.listeners[event].remove(callback)

        @pytest.fixture
        def page():
            return FakePage()
        """
    )
