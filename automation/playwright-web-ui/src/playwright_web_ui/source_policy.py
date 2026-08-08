"""Static guard that keeps the Playwright executor synchronous by construction."""

from __future__ import annotations

import ast
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from collections.abc import Iterator
    from pathlib import Path

_ASYNC_IMPORTS = {"asyncio", "playwright.async_api", "pytest_asyncio"}
_SOURCE_INVALID = "SOURCE_SCAN_INVALID"
_SYNC_ONLY = "SYNC_API_ONLY"
_BROWSER_BOOTSTRAP_FORBIDDEN = "BROWSER_BOOTSTRAP_FORBIDDEN"
_CORE_BROWSER_FIXTURES = {
    "_artifacts_recorder",
    "_pw_artifacts_folder",
    "base_url",
    "browser",
    "browser_channel",
    "browser_context_args",
    "browser_name",
    "browser_type",
    "browser_type_launch_args",
    "connect_options",
    "context",
    "delete_output_dir",
    "device",
    "is_chromium",
    "is_firefox",
    "is_webkit",
    "launch_browser",
    "new_context",
    "output_path",
    "page",
    "playwright",
}
_RAW_BROWSER_FIXTURES = {
    "_artifacts_recorder",
    "_pw_artifacts_folder",
    "browser",
    "browser_context_args",
    "browser_type",
    "browser_type_launch_args",
    "connect_options",
    "delete_output_dir",
    "launch_browser",
    "output_path",
    "playwright",
    "pytestconfig",
}


class SourcePolicyError(RuntimeError):
    """Raised when executor or suite source violates the synchronous API policy."""

    def __init__(self, code: str, message: str) -> None:
        """Initialize a stable code and human-readable diagnostic."""
        self.code = code
        self.detail = message
        super().__init__(f"{code}: {message}")


def validate_sync_only_sources(roots: tuple[Path, ...]) -> None:
    """Reject async Playwright imports and async functions under source roots."""
    for path, tree in _source_trees(roots):
        violation = _first_violation(tree)
        if violation is not None:
            line, reason = violation
            message = f"{path}:{line}: {reason}"
            raise SourcePolicyError(
                _SYNC_ONLY,
                message,
            )


def validate_controlled_browser_sources(roots: tuple[Path, ...]) -> None:
    """Reject suite code that can bypass the authenticated context factory."""
    for path, tree in _source_trees(roots):
        violation = _first_browser_bootstrap_violation(tree)
        if violation is not None:
            line, reason = violation
            message = f"{path}:{line}: {reason}"
            raise SourcePolicyError(
                _BROWSER_BOOTSTRAP_FORBIDDEN,
                message,
            )


def _source_trees(roots: tuple[Path, ...]) -> Iterator[tuple[Path, ast.AST]]:
    for root in roots:
        resolved_root = root.resolve(strict=True)
        for path in sorted(resolved_root.rglob("*.py")):
            if path.is_symlink():
                message = f"Python source must not be a symlink: {path}"
                raise SourcePolicyError(_SOURCE_INVALID, message)
            try:
                source = path.read_text(encoding="utf-8")
                tree = ast.parse(source, filename=str(path))
            except (OSError, UnicodeError, SyntaxError) as error:
                message = f"cannot parse Python source {path}: {error}"
                raise SourcePolicyError(_SOURCE_INVALID, message) from error
            yield path, tree


def _first_browser_bootstrap_violation(tree: ast.AST) -> tuple[int, str] | None:
    fixture_aliases = _pytest_fixture_aliases(tree)
    hookimpl_aliases = _pytest_hookimpl_aliases(tree)
    module_violation = _module_plugin_registration_violation(tree)
    if module_violation is not None:
        return module_violation
    for node in ast.walk(tree):
        violation = _browser_bootstrap_violation(
            node,
            fixture_aliases=fixture_aliases,
            hookimpl_aliases=hookimpl_aliases,
        )
        if violation is not None:
            return violation
    return None


def _browser_bootstrap_violation(
    node: ast.AST,
    *,
    fixture_aliases: set[str],
    hookimpl_aliases: set[str],
) -> tuple[int, str] | None:
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        return _function_bootstrap_violation(
            node,
            fixture_aliases=fixture_aliases,
            hookimpl_aliases=hookimpl_aliases,
        )
    if (
        isinstance(node, ast.ImportFrom)
        and node.module == "playwright.sync_api"
        and any(alias.name == "sync_playwright" for alias in node.names)
    ):
        return node.lineno, "direct sync_playwright bootstrap is forbidden"
    if isinstance(node, ast.Call):
        return _call_bootstrap_violation(node)
    if isinstance(node, ast.Attribute) and _is_direct_context_browser_access(node):
        return node.lineno, "context.browser bypasses authenticated contexts"
    return None


def _function_bootstrap_violation(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
    *,
    fixture_aliases: set[str],
    hookimpl_aliases: set[str],
) -> tuple[int, str] | None:
    if _has_hookimpl_decorator(node, hookimpl_aliases=hookimpl_aliases):
        return node.lineno, "suite pytest hook implementations are forbidden"
    if node.name.startswith("pytest_"):
        return node.lineno, "suite pytest lifecycle hooks are forbidden"
    is_fixture, fixture_name = _fixture_identity(
        node,
        fixture_aliases=fixture_aliases,
    )
    if is_fixture and fixture_name is None:
        return node.lineno, "dynamic fixture names are forbidden"
    if fixture_name in _CORE_BROWSER_FIXTURES:
        return node.lineno, f"core browser fixture override is forbidden: {fixture_name}"
    if is_fixture or node.name.startswith("test_"):
        raw_arguments = _function_argument_names(node) & _RAW_BROWSER_FIXTURES
        if raw_arguments:
            return node.lineno, "raw browser fixtures are forbidden"
    return _function_browser_escape_violation(node)


def _call_bootstrap_violation(node: ast.Call) -> tuple[int, str] | None:
    function = node.func
    if isinstance(function, ast.Name) and function.id == "sync_playwright":
        return node.lineno, "direct sync_playwright bootstrap is forbidden"
    if isinstance(function, ast.Attribute) and function.attr in {
        "new_context",
        "launch_persistent_context",
        "sync_playwright",
    }:
        return node.lineno, "direct browser/context bootstrap is forbidden"
    if _requests_raw_browser_fixture(node):
        return node.lineno, "dynamic raw browser fixture access is forbidden"
    return None


def _fixture_identity(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
    *,
    fixture_aliases: set[str],
) -> tuple[bool, str | None]:
    for decorator in node.decorator_list:
        call = decorator if isinstance(decorator, ast.Call) else None
        target = call.func if call is not None else decorator
        is_fixture = (isinstance(target, ast.Name) and target.id in fixture_aliases) or (
            isinstance(target, ast.Attribute) and target.attr == "fixture"
        )
        if not is_fixture:
            continue
        if call is not None:
            for keyword in call.keywords:
                if (
                    keyword.arg == "name"
                    and isinstance(keyword.value, ast.Constant)
                    and isinstance(keyword.value.value, str)
                ):
                    return True, keyword.value.value
                if keyword.arg == "name":
                    return True, None
        return True, node.name
    return False, None


def _pytest_fixture_aliases(tree: ast.AST) -> set[str]:
    return _pytest_attribute_aliases(tree, "fixture")


def _pytest_hookimpl_aliases(tree: ast.AST) -> set[str]:
    return _pytest_attribute_aliases(tree, "hookimpl")


def _pytest_attribute_aliases(tree: ast.AST, attribute: str) -> set[str]:
    aliases = {attribute}
    module_aliases = {"pytest"}
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            module_aliases.update(
                alias.asname or alias.name for alias in node.names if alias.name == "pytest"
            )
        elif isinstance(node, ast.ImportFrom) and node.module == "pytest":
            aliases.update(
                alias.asname or alias.name for alias in node.names if alias.name == attribute
            )
    changed = True
    while changed:
        changed = False
        for node in ast.walk(tree):
            for target, value in _alias_assignments(node):
                if target not in aliases and _is_pytest_attribute_alias(
                    value,
                    attribute=attribute,
                    aliases=aliases,
                    module_aliases=module_aliases,
                ):
                    aliases.add(target)
                    changed = True
    return aliases


def _is_pytest_attribute_alias(
    value: ast.expr,
    *,
    attribute: str,
    aliases: set[str],
    module_aliases: set[str],
) -> bool:
    reference = value.func if isinstance(value, ast.Call) else value
    if isinstance(reference, ast.Name):
        return reference.id in aliases
    return (
        isinstance(reference, ast.Attribute)
        and reference.attr == attribute
        and isinstance(reference.value, ast.Name)
        and reference.value.id in module_aliases
    )


def _alias_assignments(node: ast.AST) -> Iterator[tuple[str, ast.expr]]:
    if isinstance(node, ast.Assign):
        if (
            len(node.targets) == 1
            and isinstance(node.targets[0], (ast.Tuple, ast.List))
            and isinstance(node.value, (ast.Tuple, ast.List))
            and len(node.targets[0].elts) == len(node.value.elts)
        ):
            for target, value in zip(node.targets[0].elts, node.value.elts, strict=True):
                if isinstance(target, ast.Name):
                    yield target.id, value
            return
        for target in node.targets:
            if isinstance(target, ast.Name):
                yield target.id, node.value
        return
    if isinstance(node, ast.AnnAssign) and isinstance(node.target, ast.Name):
        if node.value is not None:
            yield node.target.id, node.value
        return
    if isinstance(node, ast.NamedExpr):
        yield node.target.id, node.value


def _has_hookimpl_decorator(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
    *,
    hookimpl_aliases: set[str],
) -> bool:
    for decorator in node.decorator_list:
        target = decorator.func if isinstance(decorator, ast.Call) else decorator
        if isinstance(target, ast.Name) and target.id in hookimpl_aliases:
            return True
        if isinstance(target, ast.Attribute) and target.attr == "hookimpl":
            return True
    return False


def _module_plugin_registration_violation(tree: ast.AST) -> tuple[int, str] | None:
    if not isinstance(tree, ast.Module):
        return None
    for node in tree.body:
        targets: tuple[ast.expr, ...] = ()
        if isinstance(node, ast.Assign):
            targets = tuple(node.targets)
        elif isinstance(node, ast.AnnAssign):
            targets = (node.target,)
        for target in targets:
            if not isinstance(target, ast.Name):
                continue
            if target.id == "pytest_plugins" or target.id.startswith("pytest_"):
                return node.lineno, "suite pytest plugin registration is forbidden"
    return None


def _function_argument_names(node: ast.FunctionDef | ast.AsyncFunctionDef) -> set[str]:
    arguments = (*node.args.posonlyargs, *node.args.args, *node.args.kwonlyargs)
    return {argument.arg for argument in arguments}


def _function_browser_escape_violation(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
) -> tuple[int, str] | None:
    taints = {
        name: name
        for name in _function_argument_names(node)
        if name in {"context", "new_context", "page", "request"}
    }
    scope_nodes = tuple(_function_scope_nodes(node))
    changed = True
    while changed:
        changed = False
        for candidate in scope_nodes:
            assignment = _simple_assignment(candidate)
            if assignment is None:
                continue
            target, value = assignment
            kind = _browser_expression_kind(value, taints)
            if kind is not None and taints.get(target) != kind:
                taints[target] = kind
                changed = True
    for candidate in scope_nodes:
        if not isinstance(candidate, ast.Attribute):
            continue
        receiver_kind = _browser_expression_kind(candidate.value, taints)
        if candidate.attr == "browser" and receiver_kind == "context":
            return candidate.lineno, "context.browser bypasses authenticated contexts"
        if candidate.attr == "config" and receiver_kind == "request":
            return candidate.lineno, "request.config is reserved for the executor"
    return None


def _function_scope_nodes(
    node: ast.FunctionDef | ast.AsyncFunctionDef,
) -> Iterator[ast.AST]:
    pending: list[ast.AST] = list(reversed(node.body))
    while pending:
        candidate = pending.pop()
        yield candidate
        if isinstance(candidate, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
            continue
        pending.extend(reversed(list(ast.iter_child_nodes(candidate))))


def _simple_assignment(node: ast.AST) -> tuple[str, ast.expr] | None:
    if isinstance(node, ast.Assign) and len(node.targets) == 1:
        target = node.targets[0]
        if isinstance(target, ast.Name):
            return target.id, node.value
    if (
        isinstance(node, ast.AnnAssign)
        and isinstance(node.target, ast.Name)
        and node.value is not None
    ):
        return node.target.id, node.value
    if isinstance(node, ast.NamedExpr):
        return node.target.id, node.value
    return None


def _browser_expression_kind(
    node: ast.AST,
    taints: dict[str, str],
) -> str | None:
    kind: str | None = None
    if isinstance(node, ast.Name):
        kind = taints.get(node.id)
    elif isinstance(node, ast.Call):
        function_kind = _browser_expression_kind(node.func, taints)
        kind = "context" if function_kind == "new_context" else None
    elif isinstance(node, ast.Attribute):
        receiver_kind = _browser_expression_kind(node.value, taints)
        if node.attr == "context" and receiver_kind == "page":
            kind = "context"
        elif node.attr == "browser" and receiver_kind == "context":
            kind = "browser"
        elif node.attr == "config" and receiver_kind == "request":
            kind = "pytest_config"
    return kind


def _is_direct_context_browser_access(node: ast.Attribute) -> bool:
    if node.attr != "browser":
        return False
    receiver = node.value
    if isinstance(receiver, ast.Name):
        return receiver.id == "context"
    return isinstance(receiver, ast.Attribute) and receiver.attr == "context"


def _requests_raw_browser_fixture(node: ast.Call) -> bool:
    function = node.func
    if not (
        isinstance(function, ast.Attribute) and function.attr == "getfixturevalue" and node.args
    ):
        return False
    value = node.args[0]
    if not (isinstance(value, ast.Constant) and isinstance(value.value, str)):
        return True
    return value.value in _RAW_BROWSER_FIXTURES


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
