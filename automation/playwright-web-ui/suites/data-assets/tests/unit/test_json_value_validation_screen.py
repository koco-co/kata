from __future__ import annotations

import pytest

from data_assets_playwright_web_ui.domains.data_quality.json_value_validation.result_screen import (
    is_task_detail_report_request,
    is_task_result_page_query_request,
)


@pytest.mark.parametrize(
    ("method", "url", "expected"),
    [
        (
            "POST",
            "https://example.test/dassets/v1/valid/monitorRecord/pageQuery?page=1",
            True,
        ),
        (
            "GET",
            "https://example.test/dassets/v1/valid/monitorRecord/pageQuery",
            False,
        ),
        (
            "POST",
            "https://example.test/dassets/v1/valid/monitorRecord/pageQuery/extra",
            False,
        ),
        (
            "POST",
            "https://example.test/other?page=/dassets/v1/valid/monitorRecord/pageQuery",
            False,
        ),
    ],
)
def test_task_result_page_query_predicate_requires_exact_post_path(
    method: str,
    url: str,
    *,
    expected: bool,
) -> None:
    assert is_task_result_page_query_request(method, url) is expected


@pytest.mark.parametrize(
    ("method", "url", "expected"),
    [
        (
            "POST",
            "https://example.test/dassets/v1/valid/monitorRecord/detailReport?record=1",
            True,
        ),
        (
            "GET",
            "https://example.test/dassets/v1/valid/monitorRecord/detailReport",
            False,
        ),
        (
            "POST",
            "https://example.test/dassets/v1/valid/monitorRecord/detailReport/extra",
            False,
        ),
    ],
)
def test_task_detail_report_predicate_requires_exact_post_path(
    method: str,
    url: str,
    *,
    expected: bool,
) -> None:
    assert is_task_detail_report_request(method, url) is expected
