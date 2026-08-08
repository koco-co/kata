from __future__ import annotations

from typing import TYPE_CHECKING

import pytest

from playwright_web_ui.source_policy import (
    SourcePolicyError,
    validate_controlled_browser_sources,
    validate_sync_only_sources,
)

if TYPE_CHECKING:
    from pathlib import Path


def test_sync_only_source_policy_accepts_synchronous_playwright(tmp_path: Path) -> None:
    source = tmp_path / "screen.py"
    source.write_text(
        "from playwright.sync_api import Page\n\n"
        "def read(page: Page) -> str:\n"
        "    return page.title()\n",
        encoding="utf-8",
    )

    validate_sync_only_sources((tmp_path,))


@pytest.mark.parametrize(
    "source",
    [
        "from playwright.async_api import Page\n",
        "from playwright import async_api\n",
        "import playwright.async_api\n",
        "import asyncio\n",
        "async def fixture_page():\n    return None\n",
        "def call(playwright):\n    return playwright.async_api\n",
        "import importlib as loader\nloader.import_module('playwright.async_api')\n",
        "from importlib import import_module as load\nload('asyncio')\n",
        "__import__('playwright.async_api')\n",
    ],
)
def test_sync_only_source_policy_rejects_async_api_and_async_mixing(
    tmp_path: Path,
    source: str,
) -> None:
    (tmp_path / "invalid.py").write_text(source, encoding="utf-8")

    with pytest.raises(SourcePolicyError, match="SYNC_API_ONLY"):
        validate_sync_only_sources((tmp_path,))


def test_sync_only_source_policy_reports_invalid_python(tmp_path: Path) -> None:
    (tmp_path / "invalid.py").write_text("def broken(:\n", encoding="utf-8")

    with pytest.raises(SourcePolicyError, match="SOURCE_SCAN_INVALID"):
        validate_sync_only_sources((tmp_path,))


def test_controlled_browser_policy_accepts_page_and_new_context_fixtures(
    tmp_path: Path,
) -> None:
    (tmp_path / "test_screen.py").write_text(
        "from playwright.sync_api import Page\n\n"
        "class DomainState:\n"
        "    browser = 'chromium-label'\n\n"
        "def test_screen(page: Page, new_context, browser_name):\n"
        "    assert page.title()\n"
        "    assert browser_name == 'chromium'\n"
        "    assert DomainState().browser\n"
        "    extra = new_context(locale='en-US')\n"
        "    extra.close()\n",
        encoding="utf-8",
    )

    validate_controlled_browser_sources((tmp_path,))


@pytest.mark.parametrize(
    "source",
    [
        (
            "from playwright.sync_api import sync_playwright\n"
            "def test_raw():\n    sync_playwright().start()\n"
        ),
        "def helper(browser):\n    return browser.new_context()\n",
        "import pytest\n@pytest.fixture\ndef page():\n    return object()\n",
        (
            "import pytest\n@pytest.fixture(name='context')\n"
            "def custom_context():\n    return object()\n"
        ),
        (
            "from pytest import fixture as fx\n@fx(name='page')\n"
            "def custom_page():\n    return object()\n"
        ),
        ("import pytest\nfx = pytest.fixture\n@fx\ndef page():\n    return object()\n"),
        ("import pytest\nfx = other = pytest.fixture\n@fx\ndef page():\n    return object()\n"),
        (
            "from pytest import fixture as fx\n"
            "def fixture_name():\n    return 'page'\n"
            "@fx(name=fixture_name())\n"
            "def hidden_override():\n    return object()\n"
        ),
        "def test_raw_browser(browser):\n    assert browser\n",
        (
            "import pytest\n@pytest.fixture\n"
            "def authenticated(browser_type):\n    return browser_type\n"
        ),
        (
            "import pytest\n@pytest.fixture(autouse=True)\n"
            "def poison(browser_context_args):\n"
            "    browser_context_args['storage_state'] = 'outside.json'\n"
        ),
        "def test_internal_output(output_path):\n    assert output_path\n",
        "def pytest_sessionstart(session):\n    session.config.option.tracing = 'on'\n",
        (
            "import pytest\n"
            "@pytest.hookimpl(specname='pytest_sessionstart')\n"
            "def mutate_runtime(session):\n"
            "    session.config.option.output = '/outside'\n"
        ),
        (
            "import pytest\n"
            "suite_hook = pytest.hookimpl\n"
            "@suite_hook(specname='pytest_sessionstart')\n"
            "def mutate_runtime(session):\n"
            "    session.config.option.output = '/outside'\n"
        ),
        (
            "def mutate_runtime(session):\n"
            "    session.config.option.output = '/outside'\n"
            "pytest_sessionstart = mutate_runtime\n"
        ),
        "pytest_plugins = ('suite.runtime_plugin',)\n",
        (
            "import pytest\n@pytest.fixture(autouse=True)\n"
            "def mutate_runtime(pytestconfig):\n"
            "    pytestconfig.option.output = '/outside'\n"
        ),
        (
            "import pytest\n@pytest.fixture(autouse=True)\n"
            "def mutate_via_request(request):\n"
            "    req = request\n"
            "    req.config.option.tracing = 'on'\n"
        ),
        "def test_escape(context):\n    context.browser.new_page()\n",
        (
            "def test_aliased_escape(page):\n"
            "    raw_browser = page.context.browser\n"
            "    raw_browser.new_page()\n"
        ),
        "def test_dynamic(request):\n    request.getfixturevalue('playwright')\n",
        "def test_dynamic_args(request):\n    request.getfixturevalue('browser_context_args')\n",
        (
            "def test_hidden_dynamic(request):\n"
            "    fixture_name = 'browser'\n"
            "    request.getfixturevalue(fixture_name)\n"
        ),
    ],
)
def test_controlled_browser_policy_rejects_auth_bootstrap_bypasses(
    tmp_path: Path,
    source: str,
) -> None:
    (tmp_path / "test_invalid.py").write_text(source, encoding="utf-8")

    with pytest.raises(SourcePolicyError, match="BROWSER_BOOTSTRAP_FORBIDDEN"):
        validate_controlled_browser_sources((tmp_path,))
