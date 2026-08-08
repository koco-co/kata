"""Fail-closed Allure writer for protected runtime values."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import Protocol, cast

import allure_commons
import pytest
from allure_commons import hookimpl
from allure_commons.logger import AllureFileLogger
from attrs import asdict

from playwright_web_ui.artifacts import (
    ArtifactPathError,
    JsonValue,
    encode_json,
    is_sensitive_key,
    normalize_json,
    redact_secret_text,
    write_new_atomic,
)

_REDACTED = "[REDACTED]"
_REDACTED_KEY = "protected_field"
_ATTACHMENT_LIMIT = 50 * 1024 * 1024


class _AllurePluginManager(Protocol):
    def register(self, plugin: object, name: str | None = None) -> str | None:
        """Register one Allure plugin implementation."""
        ...

    def unregister(
        self,
        plugin: object | None = None,
        name: str | None = None,
    ) -> object | None:
        """Unregister one Allure plugin implementation."""
        ...

    def get_name(self, plugin: object) -> str | None:
        """Return the registered name for one Allure plugin."""
        ...

    def get_plugins(self) -> set[object]:
        """Return all registered Allure plugins."""
        ...

    def is_registered(self, plugin: object) -> bool:
        """Return whether one Allure plugin is currently registered."""
        ...


class AllureSecretError(RuntimeError):
    """Represent a sanitized pytest failure without retaining protected data."""


class AllureSecretGuard:
    """Sanitize detached Allure data and track rejected reporting output."""

    def __init__(self, *, secret_values: tuple[str, ...]) -> None:
        """Bind the guard to the ephemeral secrets for one pytest process."""
        self._secret_values = secret_values
        self._breached = False

    @property
    def breached(self) -> bool:
        """Return whether protected or invalid data reached the reporting sink."""
        return self._breached

    def sanitize_model(self, value: object) -> JsonValue | None:
        """Detach and sanitize an attrs model, or fail closed without its data."""
        try:
            detached = asdict(value, filter=_include_allure_value)
            normalized = normalize_json(detached)
            sanitized, changed = self._sanitize_value(normalized)
        except Exception:  # noqa: BLE001
            self._breached = True
            return None
        self._breached = self._breached or changed
        return sanitized

    def sanitize_attachment(self, body: bytes | str) -> bytes | str:
        """Return safe attachment data and mark rejected protected content."""
        if len(body) <= _ATTACHMENT_LIMIT and not self._attachment_contains_secret(body):
            return body
        self._breached = True
        return _REDACTED.encode() if isinstance(body, bytes) else _REDACTED

    def reject_output(self) -> None:
        """Mark an unsafe file attachment or writer failure as rejected."""
        self._breached = True

    def _sanitize_value(self, value: JsonValue) -> tuple[JsonValue, bool]:
        if isinstance(value, str):
            sanitized = self._redact(value)
            return sanitized, sanitized != value
        if isinstance(value, list):
            changed = False
            sanitized_items: list[JsonValue] = []
            for item in value:
                sanitized, item_changed = self._sanitize_value(item)
                sanitized_items.append(sanitized)
                changed = changed or item_changed
            return sanitized_items, changed
        if isinstance(value, dict):
            return self._sanitize_dict(value)
        return value, False

    def _sanitize_dict(self, value: dict[str, JsonValue]) -> tuple[JsonValue, bool]:
        changed = False
        sanitized_items: dict[str, JsonValue] = {}
        pair_name = value.get("name")
        protected_pair = isinstance(pair_name, str) and is_sensitive_key(pair_name)
        for key, item in value.items():
            sanitized_key = self._redact(key)
            if sanitized_key != key:
                sanitized_key = _unique_key(sanitized_items, _REDACTED_KEY)
                changed = True
            if is_sensitive_key(key) or (protected_pair and key == "value"):
                sanitized_items[sanitized_key] = _REDACTED
                changed = changed or item != _REDACTED
                continue
            sanitized, item_changed = self._sanitize_value(item)
            sanitized_items[sanitized_key] = sanitized
            changed = changed or item_changed
        return sanitized_items, changed

    def _attachment_contains_secret(self, body: bytes | str) -> bool:
        if isinstance(body, str):
            return self._redact(body) != body
        if any(secret.encode() in body for secret in self._secret_values if secret):
            return True
        decoded = body.decode("utf-8", errors="ignore")
        return self._redact(decoded) != decoded

    def _redact(self, value: str) -> str:
        return redact_secret_text(
            value,
            secret_values=self._secret_values,
            limit=len(value) + 1,
        )


class GuardedAllureFileLogger:
    """Persist only sanitized, detached Allure models and attachment snapshots."""

    def __init__(self, report_dir: str, *, guard: AllureSecretGuard) -> None:
        """Bind a secure writer to one preallocated real result directory."""
        self._root = Path(report_dir)
        self._guard = guard

    @hookimpl(tryfirst=True)
    def report_result(self, result: object) -> None:
        """Write a sanitized test result without mutating the live model."""
        self._write_model(result, kind="result")

    @hookimpl(tryfirst=True)
    def report_container(self, container: object) -> None:
        """Write a sanitized fixture container without mutating the live model."""
        self._write_model(container, kind="container")

    @hookimpl(tryfirst=True)
    def report_globals(self, globals_item: object) -> None:
        """Write sanitized global Allure metadata."""
        self._write_model(globals_item, kind="globals")

    @hookimpl(tryfirst=True)
    def report_attached_data(self, body: bytes | str, file_name: str) -> None:
        """Write a safe attachment snapshot or a redacted placeholder."""
        safe_body = self._guard.sanitize_attachment(body)
        content = safe_body.encode() if isinstance(safe_body, str) else safe_body
        self._write_file(file_name, content)

    @hookimpl(tryfirst=True)
    def report_attached_file(self, source: str, file_name: str) -> None:
        """Replace an unsafe source-file attachment with a safe placeholder."""
        del source
        self._guard.reject_output()
        self._write_file(file_name, _REDACTED.encode())

    def _write_model(self, value: object, *, kind: str) -> None:
        payload = self._guard.sanitize_model(value)
        if not isinstance(payload, dict):
            payload = _fallback_model(kind)
        try:
            content = encode_json(payload)
        except TypeError, ValueError:
            self._guard.reject_output()
            content = encode_json(_fallback_model(kind))
        file_name = f"{uuid.uuid4()}-{kind}.json"
        self._write_file(file_name, content)

    def _write_file(self, file_name: str, content: bytes) -> None:
        path = Path(file_name)
        if not file_name or path.is_absolute() or len(path.parts) != 1 or path.name != file_name:
            self._guard.reject_output()
            return
        try:
            write_new_atomic(self._root / file_name, content, root=self._root)
        except ArtifactPathError, OSError:
            self._guard.reject_output()


def install_guarded_allure_logger(
    config: pytest.Config,
    guard: AllureSecretGuard,
    *,
    report_dir: str,
) -> None:
    """Replace the stock Allure file logger transactionally for one pytest run."""
    manager = cast("_AllurePluginManager", allure_commons.plugin_manager)
    stock_loggers = tuple(
        plugin for plugin in manager.get_plugins() if isinstance(plugin, AllureFileLogger)
    )
    if len(stock_loggers) != 1:
        msg = "ALLURE_GUARD_REGISTRATION_FAILED: expected one Allure file logger"
        raise pytest.UsageError(msg)
    stock_logger = stock_loggers[0]
    stock_name = manager.get_name(stock_logger)
    if stock_name is None:
        msg = "ALLURE_GUARD_REGISTRATION_FAILED: Allure file logger is unnamed"
        raise pytest.UsageError(msg)
    manager.unregister(plugin=stock_logger)
    secure_logger = GuardedAllureFileLogger(report_dir, guard=guard)
    secure_name = f"playwright-web-ui-allure-file-logger-{id(config)}"
    try:
        secure_registered = manager.register(secure_logger, name=secure_name)
    except Exception as error:
        manager.register(stock_logger, name=stock_name)
        msg = "ALLURE_GUARD_REGISTRATION_FAILED: reporting security guard is unavailable"
        raise pytest.UsageError(msg) from error
    if secure_registered is None:
        manager.register(stock_logger, name=stock_name)
        msg = "ALLURE_GUARD_REGISTRATION_FAILED: reporting security guard is unavailable"
        raise pytest.UsageError(msg)

    def restore_stock_logger() -> None:
        if manager.is_registered(secure_logger):
            manager.unregister(plugin=secure_logger)
        if not manager.is_registered(stock_logger):
            manager.register(stock_logger, name=stock_name)

    config.add_cleanup(restore_stock_logger)


def _include_allure_value(_attribute: object, value: object) -> bool:
    return bool(value) or value is False


def _unique_key(value: dict[str, JsonValue], base: str) -> str:
    if base not in value:
        return base
    index = 2
    while f"{base}_{index}" in value:
        index += 1
    return f"{base}_{index}"


def _fallback_model(kind: str) -> dict[str, JsonValue]:
    identifier = str(uuid.uuid4())
    if kind == "result":
        return {
            "uuid": identifier,
            "name": "Protected Allure result rejected",
            "status": "broken",
            "statusDetails": {"message": "ALLURE_REPORT_REJECTED"},
        }
    if kind == "container":
        return {
            "uuid": identifier,
            "name": "Protected Allure fixture report rejected",
        }
    return {"errors": [{"message": "ALLURE_REPORT_REJECTED"}]}
