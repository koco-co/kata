"""Structured, synchronous Playwright evidence captured on the test thread."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Literal, Protocol
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from playwright.sync_api import Error as PlaywrightError

from playwright_web_ui.artifacts import (
    ArtifactPathError,
    JsonValue,
    encode_json,
    redact_secret_text,
    write_new_atomic,
)

if TYPE_CHECKING:
    from pathlib import Path
    from types import TracebackType

    from playwright.sync_api import ConsoleMessage, Page, Request

    from playwright_web_ui.manifest import CaseKey

_DIAGNOSTIC_TEXT_LIMIT = 8_192
_EVENT_LIMIT = 50
_EVENT_TEXT_LIMIT = 1_000
_STEP_TEXT_LIMIT = 1_000
_SCREENSHOT_TIMEOUT_MS = 5_000
_MIN_SECRET_LENGTH = 4
_ALREADY_EXISTS = "EVIDENCE_ALREADY_EXISTS"
_PATH_UNSAFE = "EVIDENCE_PATH_UNSAFE"
_SCREENSHOT_FAILED = "EVIDENCE_SCREENSHOT_FAILED"
_STEP_INVALID = "EVIDENCE_STEP_INVALID"


class AttachmentSink(Protocol):
    """Allure-compatible attachment boundary used by the evidence recorder."""

    def __call__(self, body: bytes | str, *, name: str, media_type: str) -> None:
        """Attach ``body`` under a stable name and media type."""


class EvidenceError(RuntimeError):
    """Raised when required immutable evidence cannot be produced."""

    def __init__(self, code: str, message: str) -> None:
        """Initialize a stable code and human-readable diagnostic."""
        self.code = code
        super().__init__(f"{code}: {message}")


@dataclass(frozen=True, slots=True)
class StepDetails:
    """One business checkpoint declared by an E2E test."""

    action: str
    expected: str
    target: str


class StepContext:
    """Synchronous context manager that captures one business checkpoint."""

    def __init__(self, recorder: EvidenceRecorder, details: StepDetails) -> None:
        """Initialize one checkpoint bound to its per-case recorder."""
        self._recorder = recorder
        self._details = details

    def __enter__(self) -> None:
        """Enter without starting background work."""

    def __exit__(
        self,
        exception_type: type[BaseException] | None,
        exception: BaseException | None,
        traceback: TracebackType | None,
    ) -> Literal[False]:
        """Capture success or failure on the same thread as the Playwright page."""
        del traceback
        if exception is None:
            self._recorder.capture_success(self._details)
            return False
        name = exception_type.__name__ if exception_type is not None else "Exception"
        self._recorder.capture_failure(f"{name}: {exception}", step=self._details)
        return False


class EvidenceRecorder:
    """Per-case evidence recorder with bounded diagnostics and no-overwrite writes."""

    def __init__(
        self,
        *,
        case_key: CaseKey,
        evidence_root: Path,
        page: Page,
        attach: AttachmentSink,
        secret_values: tuple[str, ...] = (),
    ) -> None:
        """Initialize listeners and immutable output identity for one selected case."""
        self.case_key = case_key
        self._evidence_root = evidence_root
        self.case_path = evidence_root / case_key.feature_id / case_key.case_id
        self._page = page
        self._attach = attach
        self._secret_values = tuple(
            value for value in secret_values if len(value) >= _MIN_SECRET_LENGTH
        )
        self._console: list[JsonValue] = []
        self._failed_requests: list[JsonValue] = []
        self._sequence = 0
        self._failure_captured = False
        self._closed = False
        page.on("console", self._on_console)
        page.on("requestfailed", self._on_request_failed)

    @property
    def failure_captured(self) -> bool:
        """Return whether this recorder already persisted failure diagnostics."""
        return self._failure_captured

    def step(self, *, action: str, expected: str, target: str) -> StepContext:
        """Declare a synchronous business checkpoint context."""
        details = StepDetails(
            action=self._sanitize(_validate_step_text(action, "action"), _STEP_TEXT_LIMIT),
            expected=self._sanitize(_validate_step_text(expected, "expected"), _STEP_TEXT_LIMIT),
            target=self._sanitize(_validate_step_text(target, "target"), _STEP_TEXT_LIMIT),
        )
        return StepContext(self, details)

    def capture_success(self, details: StepDetails) -> None:
        """Persist and attach one successful checkpoint screenshot and metadata."""
        self._sequence += 1
        stem = f"step-{self._sequence:03d}"
        screenshot_name = f"{stem}.png"
        screenshot_path = self.case_path / screenshot_name
        metadata_path = self.case_path / f"{stem}.json"
        if screenshot_path.exists() or metadata_path.exists():
            message = f"checkpoint artifact already exists for {self.case_key}: {stem}"
            raise EvidenceError(
                _ALREADY_EXISTS,
                message,
            )
        try:
            screenshot = self._page.screenshot(
                animations="disabled",
                timeout=_SCREENSHOT_TIMEOUT_MS,
            )
        except PlaywrightError as error:
            message = f"cannot capture successful checkpoint for {self.case_key}: {error}"
            raise EvidenceError(
                _SCREENSHOT_FAILED,
                message,
            ) from error
        payload: dict[str, JsonValue] = {
            "schema_version": 1,
            "project_id": self.case_key.project_id,
            "feature_id": self.case_key.feature_id,
            "case_id": self.case_key.case_id,
            "sequence": self._sequence,
            "status": "passed",
            "action": details.action,
            "expected": details.expected,
            "target": details.target,
            "screenshot": screenshot_name,
        }
        try:
            write_new_atomic(screenshot_path, screenshot, root=self._evidence_root)
            encoded = encode_json(payload)
            write_new_atomic(metadata_path, encoded, root=self._evidence_root)
        except FileExistsError as error:
            message = f"checkpoint artifact already exists for {self.case_key}: {stem}"
            raise EvidenceError(
                _ALREADY_EXISTS,
                message,
            ) from error
        except ArtifactPathError as error:
            message = f"cannot safely write checkpoint for {self.case_key}: {error}"
            raise EvidenceError(
                _PATH_UNSAFE,
                message,
            ) from error
        self._attach(
            encoded.decode(),
            name=f"{stem}-checkpoint",
            media_type="application/json",
        )
        self._attach(screenshot, name=f"{stem}-screenshot", media_type="image/png")

    def capture_failure(self, error: str, *, step: StepDetails | None = None) -> None:
        """Best-effort capture of bounded diagnostics without masking the original failure."""
        if self._failure_captured:
            return
        self._failure_captured = True
        screenshot: bytes | None = None
        capture_errors: list[str] = []
        try:
            screenshot = self._page.screenshot(
                animations="disabled",
                timeout=_SCREENSHOT_TIMEOUT_MS,
            )
        except PlaywrightError as screenshot_error:
            capture_errors.append(f"screenshot: {screenshot_error}")

        payload: dict[str, JsonValue] = {
            "schema_version": 1,
            "project_id": self.case_key.project_id,
            "feature_id": self.case_key.feature_id,
            "case_id": self.case_key.case_id,
            "status": "failed",
            "error": self._sanitize(error, _DIAGNOSTIC_TEXT_LIMIT),
            "page_url": sanitize_url(self._safe_page_url(), self._secret_values),
            "page_title": self._sanitize(self._safe_page_title(), _EVENT_TEXT_LIMIT),
            "dom_summary": self._sanitize(self._safe_dom_summary(), _DIAGNOSTIC_TEXT_LIMIT),
            "console": list(self._console),
            "failed_requests": list(self._failed_requests),
            "step": _step_payload(step),
            "screenshot": "failure.png" if screenshot is not None else None,
            "capture_errors": [self._sanitize(item, _EVENT_TEXT_LIMIT) for item in capture_errors],
        }
        encoded = encode_json(payload)
        try:
            if screenshot is not None:
                write_new_atomic(
                    self.case_path / "failure.png",
                    screenshot,
                    root=self._evidence_root,
                )
            write_new_atomic(
                self.case_path / "failure.json",
                encoded,
                root=self._evidence_root,
            )
        except FileExistsError:
            return
        except ArtifactPathError:
            return
        try:
            self._attach(
                encoded.decode(),
                name="failure-diagnostics",
                media_type="application/json",
            )
            if screenshot is not None:
                self._attach(
                    screenshot,
                    name="failure-screenshot",
                    media_type="image/png",
                )
        except OSError, RuntimeError, TypeError, ValueError:
            # Artifact files remain durable if optional Allure attachment fails.
            return

    def close(self) -> None:
        """Detach listeners synchronously; no Page access occurs after fixture teardown."""
        if self._closed:
            return
        self._closed = True
        self._page.remove_listener("console", self._on_console)
        self._page.remove_listener("requestfailed", self._on_request_failed)

    def _on_console(self, message: ConsoleMessage) -> None:
        if len(self._console) >= _EVENT_LIMIT:
            return
        rendered = f"{message.type}: {message.text}"
        self._console.append(self._sanitize(rendered, _EVENT_TEXT_LIMIT))

    def _on_request_failed(self, request: Request) -> None:
        if len(self._failed_requests) >= _EVENT_LIMIT:
            return
        request_payload: dict[str, JsonValue] = {
            "url": sanitize_url(request.url, self._secret_values),
            "failure": self._sanitize(request.failure or "unknown failure", _EVENT_TEXT_LIMIT),
        }
        self._failed_requests.append(request_payload)

    def _safe_page_url(self) -> str:
        try:
            return self._page.url
        except PlaywrightError as error:
            return f"unavailable: {error}"

    def _safe_page_title(self) -> str:
        try:
            return self._page.title()
        except PlaywrightError as error:
            return f"unavailable: {error}"

    def _safe_dom_summary(self) -> str:
        try:
            return self._page.locator("body").inner_text(timeout=2_000)
        except PlaywrightError as error:
            return f"unavailable: {error}"

    def _sanitize(self, value: str, limit: int) -> str:
        return sanitize_text(value, secret_values=self._secret_values, limit=limit)


def sanitize_text(value: str, *, secret_values: tuple[str, ...], limit: int) -> str:
    """Redact known and common secret forms, then apply a hard character limit."""
    return redact_secret_text(value, secret_values=secret_values, limit=limit)


def sanitize_url(value: str, secret_values: tuple[str, ...]) -> str:
    """Strip user info and redact every query value before diagnostic persistence."""
    sanitized = sanitize_text(value, secret_values=secret_values, limit=_DIAGNOSTIC_TEXT_LIMIT)
    try:
        parts = urlsplit(sanitized)
        hostname = parts.hostname or ""
        if parts.port is not None:
            hostname = f"{hostname}:{parts.port}"
        query = urlencode([(key, "[REDACTED]") for key, _value in parse_qsl(parts.query)])
        return urlunsplit((parts.scheme, hostname, parts.path, query, ""))
    except ValueError:
        return sanitized


def _validate_step_text(value: str, field: str) -> str:
    if not value or value != value.strip() or len(value) > _STEP_TEXT_LIMIT:
        message = f"{field} must be trimmed, non-empty, and at most {_STEP_TEXT_LIMIT} characters"
        raise EvidenceError(
            _STEP_INVALID,
            message,
        )
    return value


def _step_payload(step: StepDetails | None) -> JsonValue:
    if step is None:
        return None
    return {
        "action": step.action,
        "expected": step.expected,
        "target": step.target,
    }
