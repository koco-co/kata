"""Small, no-overwrite primitives for immutable attempt artifacts."""

from __future__ import annotations

import json
import os
import re
import stat
import uuid
import zlib
from contextlib import suppress
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Self, cast

if TYPE_CHECKING:
    from pathlib import Path

type JsonValue = str | int | float | bool | list[JsonValue] | dict[str, JsonValue] | None

_SENSITIVE_KEY_PARTS = {
    "api-key",
    "apikey",
    "authorization",
    "cookie",
    "credential",
    "password",
    "secret",
    "session",
    "token",
}
_SENSITIVE_COMPACT_KEYS = {
    "accesstoken",
    "apikey",
    "authtoken",
    "refreshtoken",
    "sessionid",
    "sessiontoken",
}
_CAMEL_CASE_BOUNDARY_RE = re.compile(r"([a-z0-9])([A-Z])")
_BEARER_RE = re.compile(r"(?i)\bbearer\s+[^\s,;]+")
_SECRET_HEADER_RE = re.compile(
    r"(?im)\b(?P<key>(?:proxy-)?authorization|(?:set-)?cookie)"
    r"(?P<separator>\s*:\s*)(?P<value>[^\r\n]+)"
)
_ASSIGNMENT_RE = re.compile(
    r"(?P<prefix>(?P<key_quote>[\"']?)(?P<key>[A-Za-z][A-Za-z0-9_-]{0,127})"
    r"(?P=key_quote)(?P<separator>\s*[:=]\s*))"
    r"(?P<value>\[REDACTED\]|\"(?:\\.|[^\"\\])*\"|'(?:\\.|[^'\\])*'|[^\s,&}\]]+)"
)
_QUOTED_VALUE_MIN_LENGTH = 2
_PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"
_PNG_IHDR_LENGTH = 13
_PNG_CHUNK_TYPE_LENGTH = 4
_PNG_PALETTE_COLOR_TYPE = 3
_PNG_MAX_FILTER = 4
_PNG_CHANNELS = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}
_PNG_BIT_DEPTHS = {
    0: {1, 2, 4, 8, 16},
    2: {8, 16},
    3: {1, 2, 4, 8},
    4: {8, 16},
    6: {8, 16},
}
_PNG_DECODED_LIMIT = 200 * 1024 * 1024

type PngHeader = tuple[int, int, int, int]


def _empty_bytes_list() -> list[bytes]:
    return []


@dataclass(slots=True)
class _PngState:
    header: PngHeader | None = None
    idat_parts: list[bytes] = field(default_factory=_empty_bytes_list)
    seen_palette: bool = False
    idat_ended: bool = False


class ArtifactPathError(RuntimeError):
    """Raised when an artifact target could escape its preallocated real root."""

    @classmethod
    def outside_root(cls, path: Path) -> Self:
        """Build an error for a target outside the declared artifact root."""
        return cls(f"target is outside artifact root: {path}")

    @classmethod
    def unsafe_segments(cls, path: Path) -> Self:
        """Build an error for lexical traversal or empty target parts."""
        return cls(f"target has unsafe path segments: {path}")

    @classmethod
    def publish_failed(cls, root: Path, error: OSError) -> Self:
        """Build an error for a descriptor-relative atomic write failure."""
        return cls(f"cannot safely publish artifact below {root}: {error}")

    @classmethod
    def root_not_absolute(cls, root: Path) -> Self:
        """Build an error for a relative artifact root."""
        return cls(f"artifact root must be absolute: {root}")

    @classmethod
    def root_missing(cls, root: Path) -> Self:
        """Build an error for a missing artifact root."""
        return cls(f"artifact root does not exist: {root}")

    @classmethod
    def root_not_real(cls, root: Path) -> Self:
        """Build an error for a symlinked or non-directory artifact root."""
        return cls(f"artifact root must be a real directory: {root}")

    @classmethod
    def parent_not_directory(cls, part: str) -> Self:
        """Build an error for an invalid parent component."""
        return cls(f"artifact parent is not a directory: {part}")

    @classmethod
    def parent_unsafe(cls, error: OSError) -> Self:
        """Build an error for a symlinked or otherwise unsafe parent component."""
        return cls(f"artifact parent path is unsafe: {error}")


def encode_json(value: JsonValue) -> bytes:
    """Encode deterministic UTF-8 JSON and reject non-standard numeric values."""
    rendered = json.dumps(
        value,
        allow_nan=False,
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    )
    return f"{rendered}\n".encode()


def normalize_json(value: object) -> JsonValue:
    """Return a detached JSON value or raise ``TypeError``/``ValueError``."""
    rendered = json.dumps(value, allow_nan=False, ensure_ascii=False)
    return cast("JsonValue", json.loads(rendered))


def write_new_atomic(path: Path, content: bytes, *, root: Path) -> None:
    """Atomically publish a new file without ever replacing an existing target."""
    root = _validate_real_root(root)
    try:
        relative = path.relative_to(root)
    except ValueError as error:
        raise ArtifactPathError.outside_root(path) from error
    if not relative.parts or any(part in {"", ".", ".."} for part in relative.parts):
        raise ArtifactPathError.unsafe_segments(path)

    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    root_descriptor = os.open(root, directory_flags)
    try:
        parent_descriptor = _open_parent_directory(root_descriptor, relative.parts[:-1])
    except Exception:
        os.close(root_descriptor)
        raise
    temporary_name = f".{relative.name}.{uuid.uuid4().hex}.tmp"
    descriptor: int | None = None
    try:
        descriptor = os.open(
            temporary_name,
            os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
            0o600,
            dir_fd=parent_descriptor,
        )
        with os.fdopen(descriptor, "wb") as stream:
            descriptor = None
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.link(
            temporary_name,
            relative.name,
            src_dir_fd=parent_descriptor,
            dst_dir_fd=parent_descriptor,
            follow_symlinks=False,
        )
        os.fsync(parent_descriptor)
    except FileExistsError:
        raise
    except OSError as error:
        raise ArtifactPathError.publish_failed(root, error) from error
    finally:
        if descriptor is not None:
            os.close(descriptor)
        with suppress(FileNotFoundError):
            os.unlink(temporary_name, dir_fd=parent_descriptor)
        os.close(parent_descriptor)
        os.close(root_descriptor)


def contains_secret_material(value: JsonValue, *, secret_values: tuple[str, ...]) -> bool:
    """Detect sensitive keys, bearer values, or injected known secret values recursively."""
    if isinstance(value, str):
        return (
            redact_secret_text(
                value,
                secret_values=secret_values,
                limit=len(value) + 1,
            )
            != value
        )
    if isinstance(value, list):
        return any(contains_secret_material(item, secret_values=secret_values) for item in value)
    if isinstance(value, dict):
        for key, item in value.items():
            if is_sensitive_key(key):
                return True
            if contains_secret_material(item, secret_values=secret_values):
                return True
    return False


def is_sensitive_key(key: str) -> bool:
    """Return whether a snake, kebab, camel, or prefixed key denotes secret material."""
    with_boundaries = _CAMEL_CASE_BOUNDARY_RE.sub(r"\1-\2", key)
    normalized = with_boundaries.lower().replace("_", "-")
    compact = normalized.replace("-", "")
    parts = set(normalized.split("-"))
    return (
        normalized in _SENSITIVE_KEY_PARTS
        or compact in _SENSITIVE_COMPACT_KEYS
        or any(compact.endswith(suffix) for suffix in _SENSITIVE_COMPACT_KEYS)
        or bool(parts & _SENSITIVE_KEY_PARTS)
    )


def redact_secret_text(value: str, *, secret_values: tuple[str, ...], limit: int) -> str:
    """Redact known and common secret forms, then apply a hard character limit."""
    sanitized = _ASSIGNMENT_RE.sub(_redact_assignment, value)
    sanitized = _BEARER_RE.sub("Bearer [REDACTED]", sanitized)
    sanitized = _SECRET_HEADER_RE.sub(r"\g<key>\g<separator>[REDACTED]", sanitized)
    for secret in secret_values:
        if secret:
            sanitized = sanitized.replace(secret, "[REDACTED]")
    if len(sanitized) <= limit:
        return sanitized
    suffix = "... [truncated]"
    return f"{sanitized[: limit - len(suffix)]}{suffix}"


def _redact_assignment(match: re.Match[str]) -> str:
    if not is_sensitive_key(match.group("key")):
        return match.group(0)
    value = match.group("value")
    if value == "[REDACTED]":
        return match.group(0)
    if len(value) >= _QUOTED_VALUE_MIN_LENGTH and value[0] == value[-1] and value[0] in {'"', "'"}:
        replacement = f"{value[0]}[REDACTED]{value[-1]}"
    else:
        replacement = "[REDACTED]"
    return f"{match.group('prefix')}{replacement}"


def is_valid_png(data: bytes) -> bool:
    """Validate PNG chunks, CRCs, header semantics, and bounded scanline decoding."""
    if not data.startswith(_PNG_SIGNATURE):
        return False
    offset = len(_PNG_SIGNATURE)
    state = _PngState()
    while offset < len(data):
        chunk = _read_png_chunk(data, offset)
        if chunk is None:
            return False
        chunk_type, payload, offset = chunk
        outcome = _consume_png_chunk(
            state,
            chunk_type,
            payload,
            final=offset == len(data),
        )
        if outcome is not None:
            return outcome
    return False


def _consume_png_chunk(
    state: _PngState,
    chunk_type: bytes,
    payload: bytes,
    *,
    final: bool,
) -> bool | None:
    outcome: bool | None = None
    if state.header is None:
        state.header = _parse_png_header(payload) if chunk_type == b"IHDR" else None
        outcome = None if state.header is not None else False
    elif chunk_type == b"IHDR":
        outcome = False
    elif chunk_type == b"PLTE":
        valid = not state.idat_parts and bool(payload) and len(payload) % 3 == 0
        state.seen_palette = valid
        outcome = None if valid else False
    elif chunk_type == b"IDAT":
        if state.idat_ended:
            outcome = False
        else:
            state.idat_parts.append(payload)
    elif chunk_type == b"IEND":
        outcome = _valid_png_end(state, payload, final=final)
    else:
        state.idat_ended = bool(state.idat_parts)
        outcome = False if chunk_type[0] & 0x20 == 0 else None
    return outcome


def _valid_png_end(state: _PngState, payload: bytes, *, final: bool) -> bool:
    header = state.header
    return (
        header is not None
        and not payload
        and final
        and bool(state.idat_parts)
        and (header[3] != _PNG_PALETTE_COLOR_TYPE or state.seen_palette)
        and _valid_png_scanlines(header, b"".join(state.idat_parts))
    )


def _read_png_chunk(data: bytes, offset: int) -> tuple[bytes, bytes, int] | None:
    if offset + 12 > len(data):
        return None
    length = int.from_bytes(data[offset : offset + 4], "big")
    chunk_type = data[offset + 4 : offset + 8]
    end = offset + 12 + length
    if end > len(data) or len(chunk_type) != _PNG_CHUNK_TYPE_LENGTH:
        return None
    payload = data[offset + 8 : offset + 8 + length]
    expected_crc = int.from_bytes(data[offset + 8 + length : end], "big")
    actual_crc = zlib.crc32(chunk_type + payload) & 0xFFFFFFFF
    if expected_crc != actual_crc:
        return None
    return chunk_type, payload, end


def _parse_png_header(payload: bytes) -> PngHeader | None:
    if len(payload) != _PNG_IHDR_LENGTH:
        return None
    width = int.from_bytes(payload[0:4], "big")
    height = int.from_bytes(payload[4:8], "big")
    bit_depth, color_type, compression, filtering, interlace = payload[8:13]
    if (
        width < 1
        or height < 1
        or bit_depth not in _PNG_BIT_DEPTHS.get(color_type, set())
        or compression != 0
        or filtering != 0
        or interlace != 0
    ):
        return None
    return width, height, bit_depth, color_type


def _valid_png_scanlines(header: PngHeader, compressed: bytes) -> bool:
    width, height, bit_depth, color_type = header
    channels = _PNG_CHANNELS[color_type]
    row_bytes = (width * channels * bit_depth + 7) // 8
    expected_size = height * (row_bytes + 1)
    if expected_size > _PNG_DECODED_LIMIT:
        return False
    try:
        decoder = zlib.decompressobj()
        decoded = decoder.decompress(compressed, expected_size + 1)
        if decoder.unconsumed_tail or len(decoded) > expected_size:
            return False
        decoded += decoder.flush(expected_size + 1 - len(decoded))
    except zlib.error:
        return False
    if len(decoded) != expected_size or not decoder.eof or decoder.unused_data:
        return False
    return all(
        decoded[offset] <= _PNG_MAX_FILTER for offset in range(0, expected_size, row_bytes + 1)
    )


def _validate_real_root(root: Path) -> Path:
    if not root.is_absolute():
        raise ArtifactPathError.root_not_absolute(root)
    try:
        resolved = root.resolve(strict=True)
    except OSError as error:
        raise ArtifactPathError.root_missing(root) from error
    if resolved != root or root.is_symlink() or not root.is_dir():
        raise ArtifactPathError.root_not_real(root)
    return resolved


def _open_parent_directory(root_descriptor: int, parts: tuple[str, ...]) -> int:
    current = os.dup(root_descriptor)
    for part in parts:
        try:
            next_descriptor = _open_child_directory(current, part)
        except Exception:
            os.close(current)
            raise
        os.close(current)
        current = next_descriptor
    return current


def _open_child_directory(parent_descriptor: int, part: str) -> int:
    with suppress(FileExistsError):
        os.mkdir(part, mode=0o700, dir_fd=parent_descriptor)
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    try:
        descriptor = os.open(part, directory_flags, dir_fd=parent_descriptor)
    except OSError as error:
        raise ArtifactPathError.parent_unsafe(error) from error
    if not stat.S_ISDIR(os.fstat(descriptor).st_mode):
        os.close(descriptor)
        raise ArtifactPathError.parent_not_directory(part)
    return descriptor
