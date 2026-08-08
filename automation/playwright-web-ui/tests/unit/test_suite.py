from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING

import pytest

from playwright_web_ui.suite import (
    SuiteDefinition,
    SuiteRegistryError,
    discover_suites,
    load_suite,
)

if TYPE_CHECKING:
    from pathlib import Path


@dataclass(frozen=True, slots=True)
class FakeEntryPoint:
    name: str
    value: str
    target: object

    def load(self) -> object:
        return self.target


@dataclass(frozen=True, slots=True)
class FailingEntryPoint:
    name: str
    value: str
    protected_detail: str

    def load(self) -> object:
        raise RuntimeError(self.protected_detail)


def suite_definition(root: Path, *, project_id: str = "data-assets") -> SuiteDefinition:
    tests_path = root / "tests" / "e2e"
    tests_path.mkdir(parents=True)
    return SuiteDefinition(project_id=project_id, root_path=root, tests_path=tests_path)


def test_load_suite_selects_one_exact_typed_entry_point(tmp_path: Path) -> None:
    expected = suite_definition(tmp_path / "suite")
    entries = [
        FakeEntryPoint(name="other", value="other:SUITE", target=object()),
        FakeEntryPoint(
            name="data-assets",
            value="data_assets_playwright_web_ui:SUITE",
            target=expected,
        ),
    ]

    actual = load_suite("data-assets", entries=entries)

    assert actual == expected


def test_load_suite_rejects_unknown_project_without_loading_other_entry_points(
    tmp_path: Path,
) -> None:
    expected = suite_definition(tmp_path / "suite")
    entries = [FakeEntryPoint(name="data-assets", value="suite:SUITE", target=expected)]

    with pytest.raises(SuiteRegistryError, match=r"SUITE_NOT_FOUND.*missing-project"):
        load_suite("missing-project", entries=entries)


def test_load_suite_rejects_duplicate_project_registration_stably(tmp_path: Path) -> None:
    expected = suite_definition(tmp_path / "suite")
    entries = [
        FakeEntryPoint(name="data-assets", value="zeta:SUITE", target=expected),
        FakeEntryPoint(name="data-assets", value="alpha:SUITE", target=expected),
    ]

    with pytest.raises(SuiteRegistryError, match=r"SUITE_DUPLICATE.*alpha:SUITE, zeta:SUITE"):
        load_suite("data-assets", entries=entries)


def test_discover_suites_rejects_entry_point_identity_mismatch(tmp_path: Path) -> None:
    definition = suite_definition(tmp_path / "suite", project_id="different-project")
    entries = [FakeEntryPoint(name="data-assets", value="suite:SUITE", target=definition)]

    with pytest.raises(SuiteRegistryError, match="SUITE_ID_MISMATCH"):
        discover_suites(entries=entries)


def test_load_suite_rejects_untyped_entry_point_target() -> None:
    entries = [FakeEntryPoint(name="data-assets", value="suite:SUITE", target="data-assets")]

    with pytest.raises(SuiteRegistryError, match="SUITE_DEFINITION_INVALID"):
        load_suite("data-assets", entries=entries)


def test_load_suite_does_not_echo_entry_point_exception_details() -> None:
    protected_detail = "sid=synthetic-do-not-log"
    entries = [
        FailingEntryPoint(
            name="data-assets",
            value="suite:SUITE",
            protected_detail=protected_detail,
        )
    ]

    with pytest.raises(SuiteRegistryError) as captured:
        load_suite("data-assets", entries=entries)

    assert captured.value.code == "SUITE_LOAD_FAILED"
    assert protected_detail not in str(captured.value)


def test_load_suite_requires_existing_tests_below_suite_root(tmp_path: Path) -> None:
    root = tmp_path / "suite"
    root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    definition = SuiteDefinition(
        project_id="data-assets",
        root_path=root,
        tests_path=outside,
    )
    entries = [FakeEntryPoint(name="data-assets", value="suite:SUITE", target=definition)]

    with pytest.raises(SuiteRegistryError, match="SUITE_PATH_OUTSIDE_ROOT"):
        load_suite("data-assets", entries=entries)


def test_load_suite_rejects_symlinked_test_path(tmp_path: Path) -> None:
    root = tmp_path / "suite"
    root.mkdir()
    actual_tests = root / "actual-tests"
    actual_tests.mkdir()
    linked_tests = root / "tests"
    linked_tests.symlink_to(actual_tests, target_is_directory=True)
    definition = SuiteDefinition(
        project_id="data-assets",
        root_path=root,
        tests_path=linked_tests,
    )
    entries = [FakeEntryPoint(name="data-assets", value="suite:SUITE", target=definition)]

    with pytest.raises(SuiteRegistryError, match="SUITE_PATH_UNSAFE"):
        load_suite("data-assets", entries=entries)
