from typing import TYPE_CHECKING, cast

from playwright_web_ui import automation_case

if TYPE_CHECKING:
    import pytest


def test_automation_case_decorator_records_composite_identity() -> None:
    @automation_case(
        project_id="data-assets",
        feature_id="asset-catalog",
        case_id="C0001",
    )
    def scenario() -> None:
        pass

    marks = cast("list[pytest.Mark]", scenario.__dict__["pytestmark"])

    assert len(marks) == 1
    assert marks[0].name == "automation_case"
    assert marks[0].kwargs == {
        "project_id": "data-assets",
        "feature_id": "asset-catalog",
        "case_id": "C0001",
    }
