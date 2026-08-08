from __future__ import annotations

import json
from base64 import b64decode
from typing import TYPE_CHECKING, cast

import pytest

from playwright_web_ui.artifacts import is_valid_png
from playwright_web_ui.evidence import EvidenceError, EvidenceRecorder, sanitize_text
from playwright_web_ui.manifest import CaseKey

if TYPE_CHECKING:
    from pathlib import Path

    from playwright.sync_api import Page

_DIAGNOSTIC_LIMIT = 8_192
_VALID_PNG = b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
)


class FakeLocator:
    def inner_text(self, *, timeout: float) -> str:
        assert timeout > 0
        return "Visible body token=top-secret " + ("x" * 20_000)


class FakeConsoleMessage:
    type = "error"
    text = "Authorization: Bearer top-secret"


class FakeRequest:
    url = "https://example.test/api?token=top-secret&view=table"
    failure = "net::ERR_FAILED cookie=top-secret"


class FakePage:
    def __init__(self) -> None:
        self.url = "https://example.test/page?session=top-secret&tab=rules"
        self.listeners: dict[str, list[object]] = {}
        self.screenshot_calls = 0

    def title(self) -> str:
        return "Rules password=top-secret"

    def locator(self, selector: str) -> FakeLocator:
        assert selector == "body"
        return FakeLocator()

    def screenshot(self, **_kwargs: object) -> bytes:
        self.screenshot_calls += 1
        return _VALID_PNG

    def on(self, event: str, callback: object) -> None:
        self.listeners.setdefault(event, []).append(callback)

    def remove_listener(self, event: str, callback: object) -> None:
        self.listeners[event].remove(callback)

    def emit(self, event: str, value: object) -> None:
        for callback in self.listeners[event]:
            cast("object", callback)(value)  # type: ignore[operator]


def recorder(tmp_path: Path) -> tuple[EvidenceRecorder, FakePage, list[tuple[str, str]]]:
    page = FakePage()
    attachments: list[tuple[str, str]] = []

    def attach(body: bytes | str, *, name: str, media_type: str) -> None:
        assert body
        attachments.append((name, media_type))

    evidence = EvidenceRecorder(
        case_key=CaseKey("data-assets", "json-configuration", "C0001"),
        evidence_root=tmp_path,
        page=cast("Page", page),
        attach=attach,
        secret_values=("top-secret",),
    )
    return evidence, page, attachments


def test_png_validator_decodes_real_scanlines_and_rejects_forged_bytes() -> None:
    corrupted = bytearray(_VALID_PNG)
    corrupted[-1] ^= 0x01

    assert is_valid_png(_VALID_PNG)
    assert not is_valid_png(b"png")
    assert not is_valid_png(bytes(corrupted))


def test_successful_step_writes_structured_checkpoint_and_attaches_screenshot(
    tmp_path: Path,
) -> None:
    evidence, page, attachments = recorder(tmp_path)

    with evidence.step(
        action="Create the rule",
        expected="The rule is visible after refresh",
        target="Data quality rule list",
    ):
        pass
    evidence.close()

    case_path = tmp_path / "json-configuration" / "C0001"
    payload = json.loads((case_path / "step-001.json").read_text(encoding="utf-8"))
    assert payload == {
        "schema_version": 1,
        "project_id": "data-assets",
        "feature_id": "json-configuration",
        "case_id": "C0001",
        "sequence": 1,
        "status": "passed",
        "action": "Create the rule",
        "expected": "The rule is visible after refresh",
        "target": "Data quality rule list",
        "screenshot": "step-001.png",
    }
    assert (case_path / "step-001.png").read_bytes() == _VALID_PNG
    assert page.screenshot_calls == 1
    assert attachments == [
        ("step-001-checkpoint", "application/json"),
        ("step-001-screenshot", "image/png"),
    ]


def test_successful_step_redacts_secret_text_before_persisting_metadata(tmp_path: Path) -> None:
    evidence, _page, _attachments = recorder(tmp_path)

    with evidence.step(
        action="Send cookie=top-secret",
        expected="Bearer top-secret is never shown",
        target="Session top-secret",
    ):
        pass
    evidence.close()

    path = tmp_path / "json-configuration" / "C0001" / "step-001.json"
    raw = path.read_text(encoding="utf-8")
    payload = json.loads(raw)
    assert "top-secret" not in raw
    assert payload["action"] == "Send cookie=[REDACTED]"
    assert payload["expected"] == "Bearer [REDACTED] is never shown"
    assert payload["target"] == "Session [REDACTED]"


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("accessToken=synthetic-value", "accessToken=[REDACTED]"),
        ('{"accessToken":"synthetic-value"}', '{"accessToken":"[REDACTED]"}'),
        ("clientApiKey: synthetic-value", "clientApiKey: [REDACTED]"),
        ("Cookie: first=one; second=two", "Cookie: [REDACTED]"),
        ("Authorization: Basic synthetic-value", "Authorization: [REDACTED]"),
    ],
)
def test_sanitize_text_redacts_secret_key_variants(raw: str, expected: str) -> None:
    assert sanitize_text(raw, secret_values=(), limit=_DIAGNOSTIC_LIMIT) == expected


def test_failure_captures_bounded_redacted_page_console_and_request_diagnostics(
    tmp_path: Path,
) -> None:
    evidence, page, attachments = recorder(tmp_path)
    page.emit("console", FakeConsoleMessage())
    page.emit("requestfailed", FakeRequest())

    def fail_checkpoint() -> None:
        with evidence.step(
            action="Save the rule",
            expected="The saved row is readable",
            target="Rule list",
        ):
            message = "token=top-secret"
            raise AssertionError(message)

    with pytest.raises(AssertionError, match="top-secret"):
        fail_checkpoint()
    evidence.close()

    case_path = tmp_path / "json-configuration" / "C0001"
    raw = (case_path / "failure.json").read_text(encoding="utf-8")
    payload = json.loads(raw)
    assert "top-secret" not in raw
    assert "[REDACTED]" in raw
    assert len(payload["dom_summary"]) <= _DIAGNOSTIC_LIMIT
    assert payload["page_url"].endswith("session=%5BREDACTED%5D&tab=%5BREDACTED%5D")
    assert payload["console"] == ["error: Authorization: [REDACTED]"]
    assert payload["failed_requests"][0]["failure"] == "net::ERR_FAILED cookie=[REDACTED]"
    assert (case_path / "failure.png").read_bytes() == _VALID_PNG
    assert ("failure-diagnostics", "application/json") in attachments
    assert ("failure-screenshot", "image/png") in attachments


@pytest.mark.parametrize("field", ["action", "expected", "target"])
def test_step_rejects_blank_or_untrimmed_fields(tmp_path: Path, field: str) -> None:
    evidence, _page, _attachments = recorder(tmp_path)
    values = {
        "action": "Create",
        "expected": "Visible",
        "target": "Rule list",
    }
    values[field] = " blank "

    with pytest.raises(EvidenceError, match="EVIDENCE_STEP_INVALID"):
        evidence.step(**values)


def test_evidence_never_overwrites_an_existing_checkpoint(tmp_path: Path) -> None:
    evidence, _page, _attachments = recorder(tmp_path)
    case_path = tmp_path / "json-configuration" / "C0001"
    case_path.mkdir(parents=True)
    (case_path / "step-001.png").write_bytes(b"existing")

    with (
        pytest.raises(EvidenceError, match="EVIDENCE_ALREADY_EXISTS"),
        evidence.step(
            action="Create",
            expected="Visible",
            target="Rule list",
        ),
    ):
        pass

    assert (case_path / "step-001.png").read_bytes() == b"existing"


def test_evidence_rejects_symlink_escape_without_writing_outside_root(tmp_path: Path) -> None:
    evidence_root = tmp_path / "evidence"
    evidence_root.mkdir()
    outside = tmp_path / "outside"
    outside.mkdir()
    (evidence_root / "json-configuration").symlink_to(outside, target_is_directory=True)
    page = FakePage()

    def ignore_attachment(
        body: bytes | str,
        *,
        name: str,
        media_type: str,
    ) -> None:
        assert body
        assert name
        assert media_type

    evidence = EvidenceRecorder(
        case_key=CaseKey("data-assets", "json-configuration", "C0001"),
        evidence_root=evidence_root,
        page=cast("Page", page),
        attach=ignore_attachment,
    )

    with (
        pytest.raises(EvidenceError, match="EVIDENCE_PATH_UNSAFE"),
        evidence.step(
            action="Create",
            expected="Visible",
            target="Rule list",
        ),
    ):
        pass

    assert not list(outside.iterdir())
