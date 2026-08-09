"""Authenticated Data Assets SPA navigation shared by business domains."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from playwright.sync_api import expect

if TYPE_CHECKING:
    from playwright.sync_api import Page

    from playwright_web_ui.platform_context import PlatformContext

_NAVIGATION_TIMEOUT_MS: Final = 60_000
_LANDMARK_TIMEOUT_MS: Final = 30_000
_ROUTE_RE: Final = re.compile(r"^/[A-Za-z0-9][A-Za-z0-9/_-]*$")
_PROJECT_CONTEXT_SCRIPT: Final = """
(projectId) => {
  sessionStorage.setItem("X-Valid-Project-ID", projectId);
  sessionStorage.setItem("dq_project_id", projectId);
  localStorage.setItem("X-Valid-Project-ID", projectId);
  localStorage.setItem("dq_project_id", projectId);
  localStorage.setItem("dataAssets_project_id", projectId);
  localStorage.setItem("currentProject", projectId);
}
"""


class DataAssetsNavigationError(AssertionError):
    """Raised when the authenticated Data Assets shell cannot be opened safely."""


def build_data_assets_url(assets_base_url: str, route: str, project_id: int) -> str:
    """Build one canonical Data Assets hash route for a resolved project."""
    if _ROUTE_RE.fullmatch(route) is None:
        message = "route must be a canonical absolute SPA route"
        raise ValueError(message)
    return f"{assets_base_url.rstrip('/')}/#{route}?pid={project_id}"


def _build_project_context_init_script(project_id: int) -> str:
    return f"""
(() => {{
  const projectId = String({project_id});
  sessionStorage.setItem("X-Valid-Project-ID", projectId);
  sessionStorage.setItem("dq_project_id", projectId);
  localStorage.setItem("X-Valid-Project-ID", projectId);
  localStorage.setItem("dq_project_id", projectId);
  localStorage.setItem("dataAssets_project_id", projectId);
  localStorage.setItem("currentProject", projectId);
}})();
"""


@dataclass(frozen=True, slots=True)
class DataAssetsNavigation:
    """Navigate through the authenticated browser and resolved project context."""

    page: Page
    platform_context: PlatformContext

    @property
    def project_id(self) -> int:
        """Return the quality project used by Data Assets domain pages."""
        return self.platform_context.projects.quality.id

    def open(self, route: str, *, landmark: str) -> None:
        """Open one SPA route and verify the authenticated product shell."""
        project_id = str(self.project_id)
        self.page.add_init_script(_build_project_context_init_script(self.project_id))
        response = self.page.goto(
            build_data_assets_url(
                self.platform_context.urls.assets_base_url,
                route,
                self.project_id,
            ),
            wait_until="domcontentloaded",
            timeout=_NAVIGATION_TIMEOUT_MS,
        )
        if response is not None and not response.ok:
            message = f"Data Assets route returned HTTP {response.status}"
            raise DataAssetsNavigationError(message)
        self.page.evaluate(_PROJECT_CONTEXT_SCRIPT, project_id)

        body = self.page.locator("body")
        expect(
            body, "authenticated Data Assets shell must not show a login form"
        ).not_to_contain_text(
            re.compile(r"欢迎登录|UIC账号登录|账号登录|密码"),
            timeout=_LANDMARK_TIMEOUT_MS,
        )
        expect(body, "Data Assets shell must not show a global server error").not_to_contain_text(
            re.compile(r"服务器异常|请求异常|502 Bad Gateway"),
            timeout=_LANDMARK_TIMEOUT_MS,
        )
        expect(
            self.page.get_by_text(landmark, exact=True).first,
            f'Data Assets route must display landmark "{landmark}"',
        ).to_be_visible(timeout=_LANDMARK_TIMEOUT_MS)
