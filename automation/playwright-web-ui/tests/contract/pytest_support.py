"""Shared black-box helpers for pytest plugin contract tests."""

from __future__ import annotations

import json
import textwrap
from base64 import b64decode
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

    import pytest
    from _pytest.pytester import RunResult

ATTEMPT_PATH_ENV = "AUTOMATION_ATTEMPT_PATH"
VALID_PNG = b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


def manifest_payload() -> dict[str, object]:
    """Return one valid single-case execution manifest payload."""
    return {
        "schema_version": 1,
        "logical_run_id": "20260808-1030-run-01",
        "execution_id": "execution-01",
        "project_id": "data-assets",
        "executor_id": "playwright-web-ui",
        "cases": [
            {
                "feature_id": "asset-catalog",
                "case_id": "C0001",
                "title": "Create an asset",
                "business_record": {"policy": "required"},
            }
        ],
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
    for name in ("allure-results", "evidence", "business-records"):
        (attempt / name).mkdir(parents=True)
    monkeypatch.setenv(ATTEMPT_PATH_ENV, str(attempt))
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
        *extra_args,
    )


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
