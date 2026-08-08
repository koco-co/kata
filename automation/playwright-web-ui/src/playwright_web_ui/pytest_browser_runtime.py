"""Controlled pytest-playwright browser-context authentication helpers."""

from __future__ import annotations

from contextlib import suppress
from types import MappingProxyType
from typing import TYPE_CHECKING, Never, Protocol, cast

import pytest

if TYPE_CHECKING:
    from collections.abc import Mapping

    from _pytest.fixtures import FixtureDef

    from playwright_web_ui.platform_context import PlatformEnvironment

_FORBIDDEN_CONTEXT_OPTIONS = frozenset(
    {
        "client_certificates",
        "extra_http_headers",
        "http_credentials",
        "proxy",
        "record_har_content",
        "record_har_mode",
        "record_har_omit_content",
        "record_har_path",
        "record_har_url_filter",
        "record_video_dir",
        "record_video_size",
        "storage_state",
    }
)
_PYTEST_PLAYWRIGHT_MODULE = "pytest_playwright.pytest_playwright"


class _BrowserContext(Protocol):
    def add_cookies(self, cookies: object) -> None:
        """Add normalized cookies to this browser context."""
        ...

    def close(self) -> None:
        """Close this browser context."""
        ...


class _NewContext(Protocol):
    def __call__(self, **kwargs: object) -> _BrowserContext:
        """Create one browser context through pytest-playwright."""
        ...


def authenticated_fixture_result(
    fixturedef: FixtureDef[object],
    request: pytest.FixtureRequest,
    result: object,
    environment: PlatformEnvironment,
) -> object:
    """Secure core pytest-playwright fixture values before pytest caches them."""
    expected_base_url = environment.context.urls.base_url
    if fixturedef.argname == "browser_context_args":
        return _canonical_browser_context_args(fixturedef, result, expected_base_url)
    if fixturedef.argname != "new_context":
        return result
    return _authenticated_new_context_fixture(
        fixturedef,
        request,
        result,
        environment,
    )


def raise_base_url_conflict() -> Never:
    """Raise a stable error without exposing the conflicting URL."""
    msg = "PLATFORM_BASE_URL_CONFLICT: configured base URL differs from platform context"
    raise pytest.UsageError(msg)


def _canonical_browser_context_args(
    fixturedef: FixtureDef[object],
    result: object,
    expected_base_url: str,
) -> object:
    if not isinstance(result, dict):
        msg = "PLATFORM_BASE_URL_CONFLICT: browser_context_args must be a mapping"
        raise pytest.UsageError(msg)
    context_args = cast("dict[str, object]", result)
    _validate_context_options(
        context_args,
        expected_base_url=expected_base_url,
        allow_managed_video=(fixturedef.func.__module__ == _PYTEST_PLAYWRIGHT_MODULE),
    )
    canonical_args = MappingProxyType({**context_args, "base_url": expected_base_url})
    _cache_fixture_result(fixturedef, canonical_args)
    return canonical_args


def _authenticated_new_context_fixture(
    fixturedef: FixtureDef[object],
    request: pytest.FixtureRequest,
    result: object,
    environment: PlatformEnvironment,
) -> object:
    if not callable(result):
        msg = "AUTH_COOKIE_INJECTION_FAILED: new_context fixture must return a callback"
        raise pytest.UsageError(msg)
    expected_base_url = environment.context.urls.base_url
    marker = next(
        _request_item(request).iter_markers(name="browser_context_args"),
        None,
    )
    if marker is not None:
        _validate_context_options(
            marker.kwargs,
            expected_base_url=expected_base_url,
            allow_managed_video=False,
        )
    original = cast("_NewContext", result)

    def authenticated_new_context(**kwargs: object) -> _BrowserContext:
        _validate_context_options(
            kwargs,
            expected_base_url=expected_base_url,
            allow_managed_video=False,
        )
        context = original(**kwargs)
        try:
            context.add_cookies([dict(cookie) for cookie in environment.cookies])
        except Exception:  # noqa: BLE001
            with suppress(Exception):
                context.close()
            msg = "AUTH_COOKIE_INJECTION_FAILED: browser context authentication failed"
            raise pytest.UsageError(msg) from None
        return context

    _cache_fixture_result(fixturedef, authenticated_new_context)
    return authenticated_new_context


def _validate_context_options(
    options: Mapping[str, object],
    *,
    expected_base_url: str,
    allow_managed_video: bool,
) -> None:
    if "base_url" in options and options["base_url"] != expected_base_url:
        raise_base_url_conflict()
    forbidden = set(options) & _FORBIDDEN_CONTEXT_OPTIONS
    if allow_managed_video:
        forbidden.discard("record_video_dir")
    if forbidden:
        msg = (
            "PLAYWRIGHT_CONTEXT_OPTION_FORBIDDEN: protected browser context options "
            "must be controlled by the executor"
        )
        raise pytest.UsageError(msg)


def _cache_fixture_result(fixturedef: FixtureDef[object], value: object) -> None:
    cached_result = fixturedef.cached_result
    if cached_result is None:
        msg = "AUTH_COOKIE_INJECTION_FAILED: fixture cache is unavailable"
        raise pytest.UsageError(msg)
    fixturedef.cached_result = (value, cached_result[1], None)


def _request_item(request: pytest.FixtureRequest) -> pytest.Item:
    return cast("pytest.Item", request.node)  # pyright: ignore[reportUnknownMemberType]
