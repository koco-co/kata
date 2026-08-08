from __future__ import annotations

import json
from dataclasses import dataclass
from typing import TYPE_CHECKING, cast

import pytest

from playwright_web_ui.platform_context import (
    AUTH_COOKIE_ENV,
    PLATFORM_CONTEXT_ENV,
    PlatformEnvironment,
    load_platform_environment,
)
from playwright_web_ui.pytest_browser_runtime import authenticated_fixture_result

from .test_platform_context import platform_context_payload

if TYPE_CHECKING:
    from collections.abc import Callable, Mapping

    from _pytest.fixtures import FixtureDef


@dataclass
class _FakeFixtureDef:
    argname: str
    func: Callable[[], None]
    cached_result: tuple[object, object, None] | None


def _environment() -> PlatformEnvironment:
    return load_platform_environment(
        {
            PLATFORM_CONTEXT_ENV: json.dumps(platform_context_payload()),
            AUTH_COOKIE_ENV: "sid=synthetic-session-001",
        }
    )


def _browser_context_fixture(module: str, value: object) -> _FakeFixtureDef:
    def fixture() -> None:
        return None

    fixture.__module__ = module
    return _FakeFixtureDef(
        argname="browser_context_args",
        func=fixture,
        cached_result=(value, object(), None),
    )


def _secure_context_args(module: str, value: dict[str, object]) -> Mapping[str, object]:
    fixturedef = _browser_context_fixture(module, value)
    result = authenticated_fixture_result(
        cast("FixtureDef[object]", fixturedef),
        cast("pytest.FixtureRequest", object()),
        value,
        _environment(),
    )
    return cast("Mapping[str, object]", result)


def test_stock_pytest_playwright_fixture_may_use_managed_video_directory() -> None:
    result = _secure_context_args(
        "pytest_playwright.pytest_playwright",
        {"record_video_dir": "/managed/playwright-video"},
    )

    assert result["record_video_dir"] == "/managed/playwright-video"
    assert result["base_url"] == "https://synthetic.example.test"


def test_custom_browser_context_fixture_cannot_route_video_directory() -> None:
    with pytest.raises(pytest.UsageError, match="PLAYWRIGHT_CONTEXT_OPTION_FORBIDDEN"):
        _secure_context_args(
            "suite.conftest",
            {"record_video_dir": "/outside/video"},
        )


def test_stock_fixture_cannot_override_managed_video_size() -> None:
    with pytest.raises(pytest.UsageError, match="PLAYWRIGHT_CONTEXT_OPTION_FORBIDDEN"):
        _secure_context_args(
            "pytest_playwright.pytest_playwright",
            {"record_video_size": {"width": 1280, "height": 720}},
        )
