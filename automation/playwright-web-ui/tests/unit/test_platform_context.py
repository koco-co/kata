from __future__ import annotations

import json
from dataclasses import FrozenInstanceError
from typing import TYPE_CHECKING, cast

import pytest

from playwright_web_ui.platform_context import (
    AUTH_COOKIE_ENV,
    PLATFORM_CONTEXT_ENV,
    PlatformContextError,
    PlaywrightCookie,
    load_platform_environment,
    parse_cookie_header,
    parse_platform_context,
    playwright_cookie_payload,
    serialize_platform_context,
)

if TYPE_CHECKING:
    from collections.abc import Callable

_SCHEMA_VERSION = 2
_TENANT_USER_ID = 42
_METADATA_ID = 202


def platform_context_payload() -> dict[str, object]:
    return {
        "schemaVersion": 2,
        "env": "synthetic-dev",
        "urls": {
            "baseUrl": "https://synthetic.example.test",
            "assetsBaseUrl": "https://synthetic.example.test/dataAssets",
            "offlineBaseUrl": "https://synthetic.example.test/batch",
            "portalBaseUrl": "https://synthetic.example.test/portal",
        },
        "tenant": {
            "name": "synthetic-tenant",
            "id": 41,
            "userId": 42,
            "username": "synthetic-user",
        },
        "projects": {
            "quality": {"id": 101, "name": "synthetic-quality"},
            "offline": {"id": 102, "name": "synthetic-offline"},
        },
        "datasources": {
            "primary": {
                "name": "synthetic-source",
                "batch": {"id": 201, "name": "synthetic-batch", "typeId": 1},
                "metadata": {"id": 202, "name": "synthetic-metadata", "typeId": 2},
                "assets": {"id": 203, "name": "synthetic-assets", "typeId": 3},
                "database": "synthetic_database",
                "schema": "synthetic_schema",
                "requiresOffline": True,
            }
        },
        "defaults": {"datasource": "primary"},
        "safety": {"allowWrite": False},
        "warnings": ["synthetic_compatibility_warning"],
    }


def _set_old_schema(payload: dict[str, object]) -> None:
    payload["schemaVersion"] = 1


def _add_unknown_field(payload: dict[str, object]) -> None:
    payload["unexpected"] = True


def _add_retired_automation_node(payload: dict[str, object]) -> None:
    payload["automation"] = {"cases": "C0001"}


def _set_boolean_tenant_id(payload: dict[str, object]) -> None:
    cast("dict[str, object]", payload["tenant"])["id"] = True


def _set_integer_write_flag(payload: dict[str, object]) -> None:
    cast("dict[str, object]", payload["safety"])["allowWrite"] = 1


def test_parse_platform_context_returns_deeply_immutable_typed_context() -> None:
    context = parse_platform_context(json.dumps(platform_context_payload()))

    assert context.schema_version == _SCHEMA_VERSION
    assert context.urls.base_url == "https://synthetic.example.test"
    assert context.tenant.user_id == _TENANT_USER_ID
    assert context.projects.offline is not None
    assert context.datasources["primary"].metadata.id == _METADATA_ID
    assert context.defaults.datasource == "primary"
    assert context.safety.allow_write is False
    assert context.warnings == ("synthetic_compatibility_warning",)
    with pytest.raises(FrozenInstanceError):
        context.env = "changed"  # pyright: ignore[reportAttributeAccessIssue]
    with pytest.raises(TypeError):
        cast("dict[str, object]", context.datasources)["other"] = object()


@pytest.mark.parametrize(
    ("mutation", "code"),
    [
        (_set_old_schema, "PLATFORM_CONTEXT_SCHEMA_INVALID"),
        (_add_unknown_field, "PLATFORM_CONTEXT_SCHEMA_INVALID"),
        (_add_retired_automation_node, "PLATFORM_CONTEXT_SCHEMA_INVALID"),
        (_set_boolean_tenant_id, "PLATFORM_CONTEXT_SCHEMA_INVALID"),
        (_set_integer_write_flag, "PLATFORM_CONTEXT_SCHEMA_INVALID"),
    ],
)
def test_parse_platform_context_rejects_non_exact_schema_and_strict_types(
    mutation: Callable[[dict[str, object]], object],
    code: str,
) -> None:
    payload = platform_context_payload()
    mutation(payload)

    with pytest.raises(PlatformContextError, match=code):
        parse_platform_context(json.dumps(payload))


@pytest.mark.parametrize(
    "invalid_url",
    [
        "ftp://synthetic.example.test",
        "https://user:pass@synthetic.example.test",
        "https://synthetic.example.test/path",
        "https://synthetic.example.test?query=value",
        "https://synthetic.example.test#fragment",
    ],
)
def test_parse_platform_context_rejects_unsafe_base_url(invalid_url: str) -> None:
    payload = platform_context_payload()
    cast("dict[str, object]", payload["urls"])["baseUrl"] = invalid_url

    with pytest.raises(PlatformContextError, match="PLATFORM_CONTEXT_SCHEMA_INVALID"):
        parse_platform_context(json.dumps(payload))


@pytest.mark.parametrize(
    "payload_update",
    [
        {"apiToken": "synthetic-private-value"},
        {"warnings": ["Authorization: Bearer synthetic-private-value"]},
    ],
)
def test_parse_platform_context_rejects_secret_like_material_without_echo(
    payload_update: dict[str, object],
) -> None:
    payload = platform_context_payload()
    payload.update(payload_update)

    with pytest.raises(PlatformContextError, match="PLATFORM_CONTEXT_SECRET_FORBIDDEN") as caught:
        parse_platform_context(json.dumps(payload))

    assert "synthetic-private-value" not in str(caught.value)


@pytest.mark.parametrize(
    "context_text",
    [
        '{"schemaVersion":2,"schemaVersion":2}',
        '{"schemaVersion":2,"urls":{"baseUrl":"https://one.test","baseUrl":"https://two.test"}}',
    ],
)
def test_parse_platform_context_rejects_duplicate_json_keys(context_text: str) -> None:
    with pytest.raises(PlatformContextError, match="PLATFORM_CONTEXT_INVALID"):
        parse_platform_context(context_text)


def test_parse_platform_context_rejects_escaped_control_characters() -> None:
    payload = platform_context_payload()
    cast("dict[str, object]", payload["urls"])["baseUrl"] = "https://synthetic.example.test\n"

    with pytest.raises(PlatformContextError, match="PLATFORM_CONTEXT_SCHEMA_INVALID"):
        parse_platform_context(json.dumps(payload))


@pytest.mark.parametrize(
    ("section", "field"),
    [
        ("tenant", "id"),
        ("projects", "offline"),
        ("root", "warnings"),
    ],
)
def test_parse_platform_context_rejects_explicit_null_for_optional_fields(
    section: str,
    field: str,
) -> None:
    payload = platform_context_payload()
    if section == "root":
        payload[field] = None
    else:
        cast("dict[str, object]", payload[section])[field] = None

    with pytest.raises(PlatformContextError, match="PLATFORM_CONTEXT_SCHEMA_INVALID"):
        parse_platform_context(json.dumps(payload))


def test_platform_context_round_trip_uses_canonical_safe_json() -> None:
    context = parse_platform_context(json.dumps(platform_context_payload()))

    serialized = serialize_platform_context(context)

    assert parse_platform_context(serialized) == context
    assert "synthetic-private-value" not in serialized


def test_cookie_parser_accepts_rfc_cookie_octets_quotes_and_optional_single_space() -> None:
    cookie = parse_cookie_header('alpha=one; beta=two=2; empty=; quoted="value"')

    assert tuple((pair.name, pair.value) for pair in cookie.pairs) == (
        ("alpha", "one"),
        ("beta", "two=2"),
        ("empty", ""),
        ("quoted", "value"),
    )
    assert playwright_cookie_payload(cookie, "https://synthetic.example.test") == (
        cast(
            "PlaywrightCookie",
            {"name": "alpha", "value": "one", "url": "https://synthetic.example.test/"},
        ),
        cast(
            "PlaywrightCookie",
            {"name": "beta", "value": "two=2", "url": "https://synthetic.example.test/"},
        ),
        cast(
            "PlaywrightCookie",
            {"name": "empty", "value": "", "url": "https://synthetic.example.test/"},
        ),
        cast(
            "PlaywrightCookie",
            {"name": "quoted", "value": "value", "url": "https://synthetic.example.test/"},
        ),
    )


@pytest.mark.parametrize(
    "header",
    [
        "alpha=one;alpha=two",
        "alpha=one;;beta=two",
        "alpha=one;",
        "alpha =one",
        "alpha=one ",
        "alpha=one;  beta=two",
        "alpha=one\tb",
        "alpha=one\nbeta=two",
        "alpha=one,beta=two",
    ],
)
def test_cookie_parser_rejects_ambiguous_or_invalid_headers_without_echo(header: str) -> None:
    with pytest.raises(PlatformContextError, match="AUTH_COOKIE_INVALID") as caught:
        parse_cookie_header(header)

    assert header not in str(caught.value)


def test_cookie_secret_values_include_pairs_but_only_sensitive_naked_values() -> None:
    header = "dt_tenant_name=synthetic-tenant; sid=synthetic-session-001; theme=dark"
    cookie = parse_cookie_header(header)

    assert header in cookie.secret_fragments
    assert "dt_tenant_name=synthetic-tenant" in cookie.secret_fragments
    assert "sid=synthetic-session-001" in cookie.secret_fragments
    assert "theme=dark" in cookie.secret_fragments
    assert "synthetic-session-001" in cookie.secret_fragments
    assert "synthetic-tenant" not in cookie.secret_fragments
    assert "dark" not in cookie.secret_fragments


def test_load_platform_environment_returns_cookie_payload_and_secret_fragments() -> None:
    raw_cookie = "sid=synthetic-session-001; theme=dark"

    environment = load_platform_environment(
        {
            PLATFORM_CONTEXT_ENV: json.dumps(platform_context_payload()),
            AUTH_COOKIE_ENV: raw_cookie,
        }
    )

    assert environment.context.env == "synthetic-dev"
    assert environment.cookies == playwright_cookie_payload(
        parse_cookie_header(raw_cookie),
        "https://synthetic.example.test",
    )
    assert raw_cookie in environment.secret_fragments


@pytest.mark.parametrize(
    ("environ", "code"),
    [
        ({AUTH_COOKIE_ENV: "sid=synthetic-session-001"}, "PLATFORM_CONTEXT_ENV_MISSING"),
        (
            {PLATFORM_CONTEXT_ENV: json.dumps(platform_context_payload())},
            "AUTH_COOKIE_ENV_MISSING",
        ),
    ],
)
def test_load_platform_environment_requires_both_ephemeral_values(
    environ: dict[str, str],
    code: str,
) -> None:
    with pytest.raises(PlatformContextError, match=code):
        load_platform_environment(environ)
