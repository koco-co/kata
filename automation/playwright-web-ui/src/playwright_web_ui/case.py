"""Typed pytest marker for canonical automation-case identity."""

from __future__ import annotations

import pytest


def automation_case(
    *,
    project_id: str,
    feature_id: str,
    case_id: str,
) -> pytest.MarkDecorator:
    """Bind one pytest item to one canonical project, feature, and case identity."""
    return pytest.mark.automation_case(
        project_id=project_id,
        feature_id=feature_id,
        case_id=case_id,
    )
