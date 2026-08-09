"""Typed, secret-free platform context and ephemeral browser authentication."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from types import MappingProxyType
from typing import TYPE_CHECKING, Literal, Never, TypedDict, cast
from urllib.parse import urlsplit

from playwright_web_ui.artifacts import JsonValue, contains_secret_material, normalize_json

if TYPE_CHECKING:
    from collections.abc import Mapping

PLATFORM_CONTEXT_ENV = "AUTOMATION_PLATFORM_CONTEXT"
AUTH_COOKIE_ENV = "AUTOMATION_AUTH_COOKIE"
_CONTEXT_LIMIT = 1024 * 1024
_COOKIE_LIMIT = 64 * 1024
_STRING_LIMIT = 10_000
_SCHEMA_VERSION = 2
_MIN_NAKED_SECRET_LENGTH = 4
_QUOTED_COOKIE_VALUE_MIN_LENGTH = 2
_HTTP_PORT = 80
_HTTPS_PORT = 443
_ASCII_CONTROL_END = 0x20
_ASCII_DELETE = 0x7F
_ENV_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
_DATA_SOURCE_KEY_RE = re.compile(r"^[a-z][a-z0-9_-]*$")
_COOKIE_NAME_RE = re.compile(r"^[!#$%&'*+.^_`|~0-9A-Za-z-]+$")
_COOKIE_VALUE_RE = re.compile(r"^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]*$")
_SENSITIVE_COOKIE_PARTS = {
    "auth",
    "authorization",
    "credential",
    "jwt",
    "password",
    "secret",
    "session",
    "sid",
    "ticket",
    "token",
}


class PlatformContextError(ValueError):
    """Represent a stable, redacted platform-context contract failure."""

    def __init__(self, code: str, detail: str) -> None:
        """Initialize a symbolic code and a value-free diagnostic."""
        self.code = code
        self.detail = detail
        super().__init__(f"{code}: {detail}")


@dataclass(frozen=True, slots=True)
class PlatformUrls:
    """Validated module roots derived by the control plane."""

    base_url: str
    assets_base_url: str
    offline_base_url: str
    portal_base_url: str


@dataclass(frozen=True, slots=True)
class PlatformTenant:
    """Non-secret tenant identity visible to automation suites."""

    name: str
    id: int | None
    user_id: int | None
    username: str | None


@dataclass(frozen=True, slots=True)
class PlatformProject:
    """One resolved platform project."""

    id: int
    name: str


@dataclass(frozen=True, slots=True)
class PlatformProjects:
    """Resolved project identities used by Web UI flows."""

    quality: PlatformProject
    offline: PlatformProject | None


@dataclass(frozen=True, slots=True)
class DataSourceEndpoint:
    """One resolved datasource identity in a platform module."""

    id: int
    name: str
    type_id: int


@dataclass(frozen=True, slots=True)
class PlatformDataSource:
    """Cross-module datasource identities and database coordinates."""

    name: str
    batch: DataSourceEndpoint | None
    metadata: DataSourceEndpoint
    assets: DataSourceEndpoint
    database: str
    schema: str
    requires_offline: bool


@dataclass(frozen=True, slots=True)
class PlatformDefaults:
    """Environment-selected non-secret suite defaults."""

    datasource: str


@dataclass(frozen=True, slots=True)
class PlatformSafety:
    """Environment safety capabilities; authorization remains in the control plane."""

    allow_write: bool


@dataclass(frozen=True, slots=True)
class PlatformContext:
    """Deeply immutable, versioned platform context for one execution."""

    schema_version: Literal[2]
    env: str
    urls: PlatformUrls
    tenant: PlatformTenant
    projects: PlatformProjects
    datasources: Mapping[str, PlatformDataSource]
    defaults: PlatformDefaults
    safety: PlatformSafety
    warnings: tuple[str, ...]
    serialized: str


@dataclass(frozen=True, slots=True)
class CookiePair:
    """One strictly parsed request Cookie pair."""

    name: str
    value: str


@dataclass(frozen=True, slots=True)
class AuthCookie:
    """Parsed ephemeral browser credential and its redaction fragments."""

    header: str
    pairs: tuple[CookiePair, ...]
    secret_fragments: tuple[str, ...]


class PlaywrightCookie(TypedDict):
    """Minimal Playwright cookie payload without inferred Set-Cookie attributes."""

    name: str
    value: str
    url: str


@dataclass(frozen=True, slots=True)
class PlatformEnvironment:
    """Validated runtime context and authentication material for one process."""

    context: PlatformContext
    auth_cookie: AuthCookie
    cookies: tuple[PlaywrightCookie, ...]
    secret_fragments: tuple[str, ...]


def parse_platform_context(text: str) -> PlatformContext:
    """Parse a strict schema-version-2 context without retaining mutable JSON."""
    if not text or len(text.encode("utf-8")) > _CONTEXT_LIMIT:
        _fail("PLATFORM_CONTEXT_INVALID", "context must be bounded non-empty JSON")
    try:
        raw_value = cast(
            "object",
            json.loads(
                text,
                object_pairs_hook=_reject_duplicate_json_keys,
                parse_constant=_reject_json_constant,
            ),
        )
        normalized = normalize_json(raw_value)
    except (json.JSONDecodeError, TypeError, ValueError) as error:
        code = "PLATFORM_CONTEXT_INVALID"
        detail = "context must be standard JSON"
        raise PlatformContextError(code, detail) from error
    if not isinstance(normalized, dict):
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "root must be an object")
    if contains_secret_material(normalized, secret_values=()):
        _fail("PLATFORM_CONTEXT_SECRET_FORBIDDEN", "context contains protected material")
    root = cast("dict[str, JsonValue]", normalized)
    _exact_keys(
        root,
        {
            "schemaVersion",
            "env",
            "urls",
            "tenant",
            "projects",
            "datasources",
            "defaults",
            "safety",
            "warnings",
        },
        required={
            "schemaVersion",
            "env",
            "urls",
            "tenant",
            "projects",
            "datasources",
            "defaults",
            "safety",
        },
        path="root",
    )
    if root["schemaVersion"] != _SCHEMA_VERSION:
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "schemaVersion must be 2")
    env = _required_string(root["env"], "env")
    if not _ENV_ID_RE.fullmatch(env):
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "env must be lowercase kebab-case")
    urls = _parse_urls(root["urls"])
    tenant = _parse_tenant(root["tenant"])
    projects = _parse_projects(root["projects"])
    datasources = _parse_datasources(root["datasources"])
    defaults = _parse_defaults(root["defaults"], datasources)
    safety = _parse_safety(root["safety"])
    warnings = _parse_warnings(root["warnings"]) if "warnings" in root else ()
    canonical = json.dumps(
        normalized,
        allow_nan=False,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return PlatformContext(
        schema_version=2,
        env=env,
        urls=urls,
        tenant=tenant,
        projects=projects,
        datasources=MappingProxyType(datasources),
        defaults=defaults,
        safety=safety,
        warnings=warnings,
        serialized=canonical,
    )


def serialize_platform_context(context: PlatformContext) -> str:
    """Return deterministic safe JSON for xdist worker transport."""
    return context.serialized


def parse_cookie_header(header: str) -> AuthCookie:
    """Parse one Cookie request-header value using a strict RFC 6265 subset."""
    if (
        not header
        or header != header.strip()
        or len(header) > _COOKIE_LIMIT
        or not header.isascii()
        or "\r" in header
        or "\n" in header
        or "\t" in header
    ):
        _fail("AUTH_COOKIE_INVALID", "cookie header must be one bounded ASCII line")
    pairs: list[CookiePair] = []
    seen: set[str] = set()
    for index, raw_segment in enumerate(header.split(";")):
        segment = raw_segment
        if index > 0 and segment.startswith(" "):
            segment = segment[1:]
        if not segment or segment[0].isspace() or segment[-1].isspace():
            _fail("AUTH_COOKIE_INVALID", "cookie segment whitespace is invalid")
        separator = segment.find("=")
        if separator <= 0:
            _fail("AUTH_COOKIE_INVALID", "cookie segment must contain name=value")
        name = segment[:separator]
        raw_value = segment[separator + 1 :]
        value = _cookie_value(raw_value)
        if not _COOKIE_NAME_RE.fullmatch(name) or value is None:
            _fail("AUTH_COOKIE_INVALID", "cookie segment syntax is invalid")
        if name in seen:
            _fail("AUTH_COOKIE_INVALID", "cookie names must be unique")
        seen.add(name)
        pairs.append(CookiePair(name=name, value=value))
    secret_fragments = _cookie_secret_values(header, pairs)
    return AuthCookie(header=header, pairs=tuple(pairs), secret_fragments=secret_fragments)


def _cookie_value(raw: str) -> str | None:
    if _COOKIE_VALUE_RE.fullmatch(raw):
        return raw
    if len(raw) >= _QUOTED_COOKIE_VALUE_MIN_LENGTH and raw.startswith('"') and raw.endswith('"'):
        inner = raw[1:-1]
        if _COOKIE_VALUE_RE.fullmatch(inner):
            return inner
    return None


def playwright_cookie_payload(
    cookie: AuthCookie,
    base_url: str,
) -> tuple[PlaywrightCookie, ...]:
    """Materialize request cookies for one validated Playwright context."""
    origin = _root_url(base_url, "base_url")
    cookie_url = f"{origin}/"
    return tuple(
        PlaywrightCookie(name=pair.name, value=pair.value, url=cookie_url) for pair in cookie.pairs
    )


def load_platform_environment(environ: Mapping[str, str]) -> PlatformEnvironment:
    """Require and parse the two ephemeral inputs for an executable attempt."""
    context_text = environ.get(PLATFORM_CONTEXT_ENV)
    if context_text is None:
        _fail("PLATFORM_CONTEXT_ENV_MISSING", f"{PLATFORM_CONTEXT_ENV} is required")
    cookie_text = environ.get(AUTH_COOKIE_ENV)
    if cookie_text is None:
        _fail("AUTH_COOKIE_ENV_MISSING", f"{AUTH_COOKIE_ENV} is required")
    context = parse_platform_context(context_text)
    auth_cookie = parse_cookie_header(cookie_text)
    cookies = playwright_cookie_payload(auth_cookie, context.urls.base_url)
    return PlatformEnvironment(
        context=context,
        auth_cookie=auth_cookie,
        cookies=cookies,
        secret_fragments=auth_cookie.secret_fragments,
    )


def _parse_urls(value: JsonValue) -> PlatformUrls:
    item = _record(value, "urls")
    fields = {"baseUrl", "assetsBaseUrl", "offlineBaseUrl", "portalBaseUrl"}
    _exact_keys(item, fields, required=fields, path="urls")
    base = _root_url(_required_string(item["baseUrl"], "urls.baseUrl"), "urls.baseUrl")
    assets = _required_string(item["assetsBaseUrl"], "urls.assetsBaseUrl")
    offline = _required_string(item["offlineBaseUrl"], "urls.offlineBaseUrl")
    portal = _required_string(item["portalBaseUrl"], "urls.portalBaseUrl")
    expected = {
        "assets": f"{base}/dataAssets",
        "offline": f"{base}/batch",
        "portal": f"{base}/portal",
    }
    if (
        assets != expected["assets"]
        or offline != expected["offline"]
        or portal != expected["portal"]
    ):
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "module URLs must derive from baseUrl")
    return PlatformUrls(base, assets, offline, portal)


def _parse_tenant(value: JsonValue) -> PlatformTenant:
    item = _record(value, "tenant")
    _exact_keys(
        item,
        {"name", "id", "userId", "username"},
        required={"name"},
        path="tenant",
    )
    return PlatformTenant(
        name=_required_string(item["name"], "tenant.name"),
        id=_positive_int(item["id"], "tenant.id") if "id" in item else None,
        user_id=(_positive_int(item["userId"], "tenant.userId") if "userId" in item else None),
        username=(
            _required_string(item["username"], "tenant.username") if "username" in item else None
        ),
    )


def _parse_projects(value: JsonValue) -> PlatformProjects:
    item = _record(value, "projects")
    _exact_keys(item, {"quality", "offline"}, required={"quality"}, path="projects")
    return PlatformProjects(
        quality=_parse_project(item["quality"], "projects.quality"),
        offline=(
            _parse_project(item["offline"], "projects.offline") if "offline" in item else None
        ),
    )


def _parse_project(value: JsonValue, path: str) -> PlatformProject:
    item = _record(value, path)
    _exact_keys(item, {"id", "name"}, required={"id", "name"}, path=path)
    return PlatformProject(
        id=_positive_int(item["id"], f"{path}.id"),
        name=_required_string(item["name"], f"{path}.name"),
    )


def _parse_datasources(value: JsonValue) -> dict[str, PlatformDataSource]:
    item = _record(value, "datasources")
    if not item:
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "datasources must not be empty")
    result: dict[str, PlatformDataSource] = {}
    for key, raw in item.items():
        if not _DATA_SOURCE_KEY_RE.fullmatch(key):
            _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "datasource key is invalid")
        path = f"datasources.{key}"
        source = _record(raw, path)
        fields = {
            "name",
            "batch",
            "metadata",
            "assets",
            "database",
            "schema",
            "requiresOffline",
        }
        required = fields - {"batch"}
        _exact_keys(source, fields, required=required, path=path)
        requires_offline = _required_bool(source["requiresOffline"], f"{path}.requiresOffline")
        parsed_batch = (
            _parse_endpoint(source["batch"], f"{path}.batch") if "batch" in source else None
        )
        if requires_offline and parsed_batch is None:
            _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "offline datasource requires batch identity")
        result[key] = PlatformDataSource(
            name=_required_string(source["name"], f"{path}.name"),
            batch=parsed_batch,
            metadata=_parse_endpoint(source["metadata"], f"{path}.metadata"),
            assets=_parse_endpoint(source["assets"], f"{path}.assets"),
            database=_required_string(source["database"], f"{path}.database"),
            schema=_required_string(source["schema"], f"{path}.schema"),
            requires_offline=requires_offline,
        )
    return result


def _parse_endpoint(value: JsonValue, path: str) -> DataSourceEndpoint:
    item = _record(value, path)
    _exact_keys(item, {"id", "name", "typeId"}, required={"id", "name", "typeId"}, path=path)
    return DataSourceEndpoint(
        id=_positive_int(item["id"], f"{path}.id"),
        name=_required_string(item["name"], f"{path}.name"),
        type_id=_positive_int(item["typeId"], f"{path}.typeId"),
    )


def _parse_defaults(
    value: JsonValue,
    datasources: dict[str, PlatformDataSource],
) -> PlatformDefaults:
    item = _record(value, "defaults")
    _exact_keys(item, {"datasource"}, required={"datasource"}, path="defaults")
    datasource = _required_string(item["datasource"], "defaults.datasource")
    if datasource not in datasources:
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "default datasource is not resolved")
    return PlatformDefaults(datasource=datasource)


def _parse_safety(value: JsonValue) -> PlatformSafety:
    item = _record(value, "safety")
    _exact_keys(item, {"allowWrite"}, required={"allowWrite"}, path="safety")
    return PlatformSafety(allow_write=_required_bool(item["allowWrite"], "safety.allowWrite"))


def _parse_warnings(value: JsonValue) -> tuple[str, ...]:
    if not isinstance(value, list):
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "warnings must be an array")
    result = tuple(_required_string(item, "warnings[]") for item in value)
    if len(set(result)) != len(result):
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", "warnings must be unique")
    return result


def _record(value: JsonValue, path: str) -> dict[str, JsonValue]:
    if not isinstance(value, dict):
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", f"{path} must be an object")
    return value


def _exact_keys(
    value: dict[str, JsonValue],
    allowed: set[str],
    *,
    required: set[str],
    path: str,
) -> None:
    if set(value) - allowed or required - set(value):
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", f"{path} fields are invalid")


def _required_string(value: JsonValue, path: str) -> str:
    if (
        not isinstance(value, str)
        or not value
        or value != value.strip()
        or len(value) > _STRING_LIMIT
        or any(
            ord(character) < _ASCII_CONTROL_END or ord(character) == _ASCII_DELETE
            for character in value
        )
    ):
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", f"{path} must be a trimmed string")
    return value


def _positive_int(value: JsonValue, path: str) -> int:
    if type(value) is not int or value < 1:
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", f"{path} must be a positive integer")
    return value


def _required_bool(value: JsonValue, path: str) -> bool:
    if type(value) is not bool:
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", f"{path} must be boolean")
    return value


def _root_url(value: str, path: str) -> str:
    try:
        parsed = urlsplit(value)
        port = parsed.port
    except ValueError as error:
        code = "PLATFORM_CONTEXT_SCHEMA_INVALID"
        detail = f"{path} must be a platform root URL"
        raise PlatformContextError(code, detail) from error
    if (
        parsed.scheme not in {"http", "https"}
        or not parsed.hostname
        or parsed.username is not None
        or parsed.password is not None
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
    ):
        _fail("PLATFORM_CONTEXT_SCHEMA_INVALID", f"{path} must be a platform root URL")
    host = parsed.hostname.lower()
    if ":" in host and not host.startswith("["):
        host = f"[{host}]"
    default_port = (parsed.scheme == "http" and port == _HTTP_PORT) or (
        parsed.scheme == "https" and port == _HTTPS_PORT
    )
    authority = host if port is None or default_port else f"{host}:{port}"
    return f"{parsed.scheme}://{authority}"


def _cookie_secret_values(header: str, pairs: list[CookiePair]) -> tuple[str, ...]:
    values: list[str] = [header]
    values.extend(f"{pair.name}={pair.value}" for pair in pairs)
    values.extend(
        pair.value
        for pair in pairs
        if len(pair.value) >= _MIN_NAKED_SECRET_LENGTH and _sensitive_cookie_name(pair.name)
    )
    return tuple(dict.fromkeys(values))


def _sensitive_cookie_name(name: str) -> bool:
    normalized = re.sub(r"([a-z0-9])([A-Z])", r"\1-\2", name).lower().replace("_", "-")
    parts = set(normalized.split("-"))
    compact = normalized.replace("-", "")
    return (
        bool(parts & _SENSITIVE_COOKIE_PARTS)
        or compact
        in {
            "jsessionid",
            "phpsessid",
            "sessionid",
        }
        or any(compact.endswith(part) for part in ("token", "ticket", "sessionid"))
    )


def _reject_json_constant(value: str) -> Never:
    del value
    message = "non-standard JSON constants are forbidden"
    raise ValueError(message)


def _reject_duplicate_json_keys(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            message = "duplicate JSON object keys are forbidden"
            raise ValueError(message)
        result[key] = value
    return result


def _fail(code: str, detail: str) -> Never:
    raise PlatformContextError(code, detail)
