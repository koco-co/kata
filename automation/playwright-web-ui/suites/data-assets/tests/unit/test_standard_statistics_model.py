import pytest

from data_assets_playwright_web_ui.domains.data_standard.standard_statistics.model import (
    StandardStatisticsContractError,
    StandardStatisticsSnapshot,
)


def _metric_payload(*items: tuple[str, int, int | float]) -> object:
    return {
        "success": True,
        "data": {
            "statisticItems": [
                {"name": name, "count": count, "weight": weight} for name, count, weight in items
            ],
        },
    }


def test_statistics_snapshot_preserves_all_canonical_business_dimensions() -> None:
    snapshot = StandardStatisticsSnapshot.from_api_payloads(
        hot=_metric_payload(("金额", 7, 0)),
        catalog=_metric_payload(("CatalogA", 3, 100)),
        trend={
            "success": True,
            "data": {
                "statisticDate": ["2026-08-08", "2026-08-09"],
                "standardCount": [2, 3],
                "codeCount": [1, 1],
            },
        },
        source=_metric_payload(("手动", 3, 100)),
    )

    assert [(item.name, item.count) for item in snapshot.hot] == [("金额", 7)]
    assert [(item.name, item.count, item.weight) for item in snapshot.catalog] == [
        ("CatalogA", 3, 100.0),
    ]
    assert [(point.date, point.standard_count) for point in snapshot.trend] == [
        ("2026-08-08", 2),
        ("2026-08-09", 3),
    ]
    assert [(item.name, item.count, item.weight) for item in snapshot.source] == [
        ("手动", 3, 100.0),
    ]


@pytest.mark.parametrize(
    ("field", "payload"),
    [
        ("hot", _metric_payload(("", 1, 100))),
        ("catalog", _metric_payload(("CatalogA", -1, 100))),
        ("source", _metric_payload(("手动", 1, 101))),
        (
            "trend",
            {
                "success": True,
                "data": {
                    "statisticDate": ["2026-08-09"],
                    "standardCount": [],
                    "codeCount": [],
                },
            },
        ),
    ],
)
def test_statistics_snapshot_rejects_missing_or_incoherent_business_data(
    field: str,
    payload: object,
) -> None:
    payloads = {
        "hot": _metric_payload(("金额", 7, 0)),
        "catalog": _metric_payload(("CatalogA", 3, 100)),
        "trend": {
            "success": True,
            "data": {
                "statisticDate": ["2026-08-09"],
                "standardCount": [3],
                "codeCount": [1],
            },
        },
        "source": _metric_payload(("手动", 3, 100)),
    }
    payloads[field] = payload

    with pytest.raises(StandardStatisticsContractError):
        StandardStatisticsSnapshot.from_api_payloads(**payloads)
