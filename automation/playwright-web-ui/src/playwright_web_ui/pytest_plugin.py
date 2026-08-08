"""Pytest collection gate for immutable Playwright Web UI executions."""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path
from typing import cast

import pytest

from playwright_web_ui.manifest import (
    CaseKey,
    ExecutionManifest,
    ManifestError,
    load_execution_manifest,
)

EXECUTOR_ID = "playwright-web-ui"
_OPTION_DEST = "execution_manifest"
_MANIFEST_KEY: pytest.StashKey[ExecutionManifest] = pytest.StashKey()


def pytest_addoption(parser: pytest.Parser) -> None:
    """Register the immutable execution-manifest path."""
    group = parser.getgroup("playwright-web-ui")
    group.addoption(
        "--execution-manifest",
        action="store",
        dest=_OPTION_DEST,
        metavar="PATH",
        help="validate collection and execution against an immutable manifest",
    )


def pytest_configure(config: pytest.Config) -> None:
    """Load the manifest once for both collection-only and executable runs."""
    config.addinivalue_line(
        "markers",
        "automation_case(project_id, feature_id, case_id): canonical automation identity",
    )
    manifest_option = cast("str | None", config.getoption(_OPTION_DEST, default=None))
    if manifest_option is None:
        return
    try:
        manifest = load_execution_manifest(Path(manifest_option))
    except ManifestError as error:
        msg = f"invalid execution manifest: {error}"
        raise pytest.UsageError(msg) from error
    if manifest.executor_id != EXECUTOR_ID:
        expected = f'"{EXECUTOR_ID}"'
        actual = f'"{manifest.executor_id}"'
        msg = f"execution manifest executor_id must be {expected}, got {actual}"
        raise pytest.UsageError(msg)
    config.stash[_MANIFEST_KEY] = manifest


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Select manifest cases and reject invalid or incomplete canonical collection."""
    manifest = config.stash.get(_MANIFEST_KEY, None)
    if manifest is None:
        return

    expected = {selected_case.key for selected_case in manifest.cases}
    selected: dict[CaseKey, list[str]] = defaultdict(list)
    selected_items: list[pytest.Item] = []
    deselected_items: list[pytest.Item] = []
    marker_errors: list[str] = []
    for item in items:
        markers = list(item.iter_markers(name="automation_case"))
        if len(markers) != 1:
            marker_errors.append(f"{item.nodeid}: expected exactly one automation_case marker")
            continue
        try:
            key = _case_key_from_marker(markers[0])
        except ValueError as error:
            marker_errors.append(f"{item.nodeid}: {error}")
            continue
        if key in expected:
            selected[key].append(item.nodeid)
            selected_items.append(item)
        else:
            deselected_items.append(item)

    if marker_errors:
        details = "\n  - ".join(marker_errors)
        msg = f"invalid automation_case markers:\n  - {details}"
        raise pytest.UsageError(msg)

    duplicates = {key: nodeids for key, nodeids in selected.items() if len(nodeids) > 1}
    if duplicates:
        details = "; ".join(
            f"{key}: {', '.join(nodeids)}" for key, nodeids in sorted(duplicates.items(), key=str)
        )
        msg = f"duplicate collected automation case: {details}"
        raise pytest.UsageError(msg)

    actual = set(selected)
    missing = sorted(expected - actual, key=str)
    if missing:
        parts = ["collection does not match execution manifest"]
        parts.append(f"missing: {', '.join(map(str, missing))}")
        raise pytest.UsageError("; ".join(parts))

    if deselected_items:
        items[:] = selected_items
        config.hook.pytest_deselected(items=deselected_items)


def _case_key_from_marker(marker: pytest.Mark) -> CaseKey:
    if marker.args:
        msg = "automation_case accepts keyword arguments only"
        raise ValueError(msg)
    required = {"project_id", "feature_id", "case_id"}
    if set(marker.kwargs) != required:
        msg = "automation_case requires exactly project_id, feature_id, and case_id"
        raise ValueError(msg)
    values = {key: marker.kwargs[key] for key in required}
    if any(not isinstance(value, str) for value in values.values()):
        msg = "automation_case identity values must be strings"
        raise ValueError(msg)
    return CaseKey(
        project_id=cast("str", values["project_id"]),
        feature_id=cast("str", values["feature_id"]),
        case_id=cast("str", values["case_id"]),
    )
