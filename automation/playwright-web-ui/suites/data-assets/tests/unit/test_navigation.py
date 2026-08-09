import pytest

from data_assets_playwright_web_ui.components.navigation import build_data_assets_url


def test_build_data_assets_url_normalizes_the_product_root_and_project_identity() -> None:
    assert (
        build_data_assets_url(
            "https://example.test/dataAssets/",
            "/standardStatistic",
            42,
        )
        == "https://example.test/dataAssets/#/standardStatistic?pid=42"
    )


@pytest.mark.parametrize("route", ["standardStatistic", "//standardStatistic", "/"])
def test_build_data_assets_url_rejects_noncanonical_routes(route: str) -> None:
    with pytest.raises(ValueError, match="canonical absolute SPA route"):
        build_data_assets_url("https://example.test/dataAssets", route, 42)
