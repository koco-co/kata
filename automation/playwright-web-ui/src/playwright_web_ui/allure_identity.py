"""Canonical automation identity labels for Allure test results."""

from __future__ import annotations

from typing import TYPE_CHECKING, Final, Protocol, cast

import allure

if TYPE_CHECKING:
    from playwright_web_ui.manifest import CaseKey

_CANONICAL_LABELS: Final = ("project_id", "feature_id", "case_id")


class _AllureLabel(Protocol):
    def __call__(self, label_type: str, *labels: str) -> None:
        """Attach one or more values under an Allure label name."""
        ...


def apply_canonical_case_labels(key: CaseKey) -> None:
    """Attach one validated manifest identity to the current Allure result."""
    values = (key.project_id, key.feature_id, key.case_id)
    label = cast(
        "_AllureLabel",
        allure.dynamic.label,  # pyright: ignore[reportUnknownMemberType]
    )
    for label_name, value in zip(_CANONICAL_LABELS, values, strict=True):
        label(label_name, value)
