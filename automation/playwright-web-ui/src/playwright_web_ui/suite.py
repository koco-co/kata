"""Typed, entry-point based suite discovery without workspace scanning."""

from __future__ import annotations

import re
from dataclasses import dataclass
from importlib import metadata, util
from pathlib import Path
from typing import TYPE_CHECKING, Protocol, cast

if TYPE_CHECKING:
    from collections.abc import Sequence

SUITE_ENTRY_POINT_GROUP = "playwright_web_ui.suites"
_PROJECT_ID_RE = re.compile(r"^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$")
_FIXTURE_PLUGIN_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*$")
_SUITE_DEFINITION_INVALID = "SUITE_DEFINITION_INVALID"
_SUITE_DUPLICATE = "SUITE_DUPLICATE"
_SUITE_FIXTURE_PLUGIN_INVALID = "SUITE_FIXTURE_PLUGIN_INVALID"
_SUITE_ID_INVALID = "SUITE_ID_INVALID"
_SUITE_ID_MISMATCH = "SUITE_ID_MISMATCH"
_SUITE_LOAD_FAILED = "SUITE_LOAD_FAILED"
_SUITE_NOT_FOUND = "SUITE_NOT_FOUND"
_SUITE_PATH_INVALID = "SUITE_PATH_INVALID"
_SUITE_PATH_NOT_FOUND = "SUITE_PATH_NOT_FOUND"
_SUITE_PATH_OUTSIDE_ROOT = "SUITE_PATH_OUTSIDE_ROOT"
_SUITE_PATH_UNSAFE = "SUITE_PATH_UNSAFE"


class SuiteEntryPoint(Protocol):
    """Minimal metadata entry-point interface used by the registry."""

    @property
    def name(self) -> str:
        """Return the registered project identifier."""
        ...

    @property
    def value(self) -> str:
        """Return the import target for diagnostics."""
        ...

    def load(self) -> object:
        """Load the registered suite definition."""
        ...


@dataclass(frozen=True, slots=True)
class SuiteDefinition:
    """A suite's stable identity and explicitly located pytest test resource."""

    project_id: str
    root_path: Path
    tests_path: Path
    fixture_plugins: tuple[str, ...] = ()


class SuiteRegistryError(RuntimeError):
    """Raised when installed suite metadata is missing, ambiguous, or unsafe."""

    exit_code = 2

    def __init__(self, code: str, message: str) -> None:
        """Initialize a stable code and human-readable diagnostic."""
        self.code = code
        self.detail = message
        super().__init__(f"{code}: {message}")


def load_suite(
    project_id: str,
    *,
    entries: Sequence[SuiteEntryPoint] | None = None,
) -> SuiteDefinition:
    """Load exactly one suite registered for ``project_id``."""
    _validate_project_id(project_id, "requested project_id")
    available = _entry_points(entries)
    matches: list[SuiteEntryPoint] = [entry for entry in available if entry.name == project_id]
    if not matches:
        raise SuiteRegistryError(_SUITE_NOT_FOUND, f"no suite registered for {project_id}")
    if len(matches) > 1:
        targets = ", ".join(sorted(entry.value for entry in matches))
        raise SuiteRegistryError(
            _SUITE_DUPLICATE,
            f"multiple suites registered for {project_id}: {targets}",
        )
    return _load_definition(matches[0])


def discover_suites(
    *,
    entries: Sequence[SuiteEntryPoint] | None = None,
) -> tuple[SuiteDefinition, ...]:
    """Load and validate every installed suite in stable project order."""
    available = _entry_points(entries)
    by_name: dict[str, list[SuiteEntryPoint]] = {}
    for entry in available:
        by_name.setdefault(entry.name, []).append(entry)
    for project_id in sorted(by_name):
        matches = by_name[project_id]
        if len(matches) > 1:
            targets = ", ".join(sorted(entry.value for entry in matches))
            raise SuiteRegistryError(
                _SUITE_DUPLICATE,
                f"multiple suites registered for {project_id}: {targets}",
            )
    return tuple(_load_definition(entry) for entry in available)


def _entry_points(
    entries: Sequence[SuiteEntryPoint] | None,
) -> tuple[SuiteEntryPoint, ...]:
    if entries is None:
        installed = metadata.entry_points(group=SUITE_ENTRY_POINT_GROUP)
        values = cast("tuple[SuiteEntryPoint, ...]", tuple(installed))
    else:
        values = tuple(entries)
    return tuple(sorted(values, key=lambda entry: (entry.name, entry.value)))


def _load_definition(entry: SuiteEntryPoint) -> SuiteDefinition:
    _validate_project_id(entry.name, "entry point name")
    try:
        target = entry.load()
    except Exception as error:
        msg = f"cannot load registered suite {entry.name} from {entry.value}"
        raise SuiteRegistryError(_SUITE_LOAD_FAILED, msg) from error
    if not isinstance(target, SuiteDefinition):
        target_type = f"{type(target).__module__}.{type(target).__qualname__}"
        raise SuiteRegistryError(
            _SUITE_DEFINITION_INVALID,
            f"{entry.name} must load SuiteDefinition, got {target_type}",
        )
    if target.project_id != entry.name:
        raise SuiteRegistryError(
            _SUITE_ID_MISMATCH,
            f"entry point {entry.name} loaded project_id {target.project_id}",
        )
    _validate_project_id(target.project_id, "suite project_id")
    root = _existing_directory(target.root_path, "root_path")
    tests = _existing_directory(target.tests_path, "tests_path")
    if tests == root or not tests.is_relative_to(root):
        raise SuiteRegistryError(
            _SUITE_PATH_OUTSIDE_ROOT,
            f"tests_path must be below root_path: {tests}",
        )
    fixture_plugins = _validate_fixture_plugins(target.fixture_plugins)
    return SuiteDefinition(
        project_id=target.project_id,
        root_path=root,
        tests_path=tests,
        fixture_plugins=fixture_plugins,
    )


def _validate_fixture_plugins(value: object) -> tuple[str, ...]:
    if type(value) is not tuple:
        raise SuiteRegistryError(
            _SUITE_FIXTURE_PLUGIN_INVALID,
            "fixture_plugins must be a tuple of importable module names",
        )
    plugins = cast("tuple[object, ...]", value)
    validated: list[str] = []
    for plugin in plugins:
        if not isinstance(plugin, str) or _FIXTURE_PLUGIN_RE.fullmatch(plugin) is None:
            raise SuiteRegistryError(
                _SUITE_FIXTURE_PLUGIN_INVALID,
                "fixture_plugins must contain valid Python module names",
            )
        if plugin in validated:
            raise SuiteRegistryError(
                _SUITE_FIXTURE_PLUGIN_INVALID,
                "fixture_plugins must contain unique module names",
            )
        try:
            specification = util.find_spec(plugin)
        except (ImportError, AttributeError, ModuleNotFoundError, ValueError) as error:
            raise SuiteRegistryError(
                _SUITE_FIXTURE_PLUGIN_INVALID,
                "fixture plugin module cannot be resolved",
            ) from error
        if specification is None:
            raise SuiteRegistryError(
                _SUITE_FIXTURE_PLUGIN_INVALID,
                "fixture plugin module cannot be resolved",
            )
        validated.append(plugin)
    return tuple(validated)


def _existing_directory(path: object, field: str) -> Path:
    if not isinstance(path, Path) or not path.is_absolute():
        raise SuiteRegistryError(
            _SUITE_PATH_INVALID,
            f"{field} must be an absolute path: {path}",
        )
    try:
        resolved = path.resolve(strict=True)
    except OSError as error:
        raise SuiteRegistryError(
            _SUITE_PATH_NOT_FOUND,
            f"{field} does not exist: {path}",
        ) from error
    if resolved != path or path.is_symlink() or not path.is_dir():
        raise SuiteRegistryError(
            _SUITE_PATH_UNSAFE,
            f"{field} must be a real directory without symlink traversal: {path}",
        )
    return resolved


def _validate_project_id(value: str, field: str) -> None:
    if not _PROJECT_ID_RE.fullmatch(value):
        raise SuiteRegistryError(
            _SUITE_ID_INVALID,
            f"{field} must be lowercase kebab-case: {value}",
        )
