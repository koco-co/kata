"""Static guard that keeps the Playwright executor synchronous by construction."""

from __future__ import annotations

import ast
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from pathlib import Path

_ASYNC_IMPORTS = {"asyncio", "playwright.async_api", "pytest_asyncio"}
_SOURCE_INVALID = "SOURCE_SCAN_INVALID"
_SYNC_ONLY = "SYNC_API_ONLY"


class SourcePolicyError(RuntimeError):
    """Raised when executor or suite source violates the synchronous API policy."""

    def __init__(self, code: str, message: str) -> None:
        """Initialize a stable code and human-readable diagnostic."""
        self.code = code
        self.detail = message
        super().__init__(f"{code}: {message}")


def validate_sync_only_sources(roots: tuple[Path, ...]) -> None:
    """Reject async Playwright imports and async functions under source roots."""
    for root in roots:
        resolved_root = root.resolve(strict=True)
        for path in sorted(resolved_root.rglob("*.py")):
            if path.is_symlink():
                message = f"Python source must not be a symlink: {path}"
                raise SourcePolicyError(
                    _SOURCE_INVALID,
                    message,
                )
            try:
                source = path.read_text(encoding="utf-8")
                tree = ast.parse(source, filename=str(path))
            except (OSError, UnicodeError, SyntaxError) as error:
                message = f"cannot parse Python source {path}: {error}"
                raise SourcePolicyError(
                    _SOURCE_INVALID,
                    message,
                ) from error
            violation = _first_violation(tree)
            if violation is not None:
                line, reason = violation
                message = f"{path}:{line}: {reason}"
                raise SourcePolicyError(
                    _SYNC_ONLY,
                    message,
                )


def _first_violation(tree: ast.AST) -> tuple[int, str] | None:
    importlib_aliases = {"importlib"}
    dynamic_import_aliases = {"__import__"}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            importlib_aliases.update(
                alias.asname or alias.name for alias in node.names if alias.name == "importlib"
            )
        elif isinstance(node, ast.ImportFrom) and node.module == "importlib":
            dynamic_import_aliases.update(
                alias.asname or alias.name for alias in node.names if alias.name == "import_module"
            )
    for node in ast.walk(tree):
        violation = _node_violation(
            node,
            importlib_aliases=importlib_aliases,
            dynamic_import_aliases=dynamic_import_aliases,
        )
        if violation is not None:
            return violation
    return None


def _node_violation(
    node: ast.AST,
    *,
    importlib_aliases: set[str],
    dynamic_import_aliases: set[str],
) -> tuple[int, str] | None:
    if isinstance(node, ast.AsyncFunctionDef):
        return node.lineno, "async functions and fixtures are forbidden"
    if isinstance(node, (ast.Await, ast.AsyncFor, ast.AsyncWith)):
        return node.lineno, "async syntax is forbidden"
    if isinstance(node, (ast.Import, ast.ImportFrom)):
        return _import_node_violation(node)
    if isinstance(node, ast.Call) and _is_dynamic_import_call(
        node,
        importlib_aliases=importlib_aliases,
        dynamic_import_aliases=dynamic_import_aliases,
    ):
        return node.lineno, "dynamic imports are forbidden by the sync-only policy"
    if isinstance(node, ast.Attribute) and _attribute_name(node) == "playwright.async_api":
        return node.lineno, "playwright.async_api access is forbidden"
    return None


def _import_node_violation(node: ast.Import | ast.ImportFrom) -> tuple[int, str] | None:
    if isinstance(node, ast.Import):
        return _import_violation(node)
    return _import_from_violation(node)


def _is_dynamic_import_call(
    node: ast.Call,
    *,
    importlib_aliases: set[str],
    dynamic_import_aliases: set[str],
) -> bool:
    function = node.func
    if isinstance(function, ast.Name):
        return function.id in dynamic_import_aliases
    return (
        isinstance(function, ast.Attribute)
        and function.attr == "import_module"
        and isinstance(function.value, ast.Name)
        and function.value.id in importlib_aliases
    )


def _import_violation(node: ast.Import) -> tuple[int, str] | None:
    for alias in node.names:
        if alias.name in _ASYNC_IMPORTS or alias.name.startswith("playwright.async_api."):
            return node.lineno, f"forbidden async import: {alias.name}"
    return None


def _import_from_violation(node: ast.ImportFrom) -> tuple[int, str] | None:
    module = node.module or ""
    if module in _ASYNC_IMPORTS or module.startswith("playwright.async_api."):
        return node.lineno, f"forbidden async import: {module}"
    if module == "playwright" and any(alias.name == "async_api" for alias in node.names):
        return node.lineno, "forbidden async import: playwright.async_api"
    return None


def _attribute_name(node: ast.Attribute) -> str:
    parts = [node.attr]
    value = node.value
    while isinstance(value, ast.Attribute):
        parts.append(value.attr)
        value = value.value
    if isinstance(value, ast.Name):
        parts.append(value.id)
    return ".".join(reversed(parts))
