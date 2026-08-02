#!/usr/bin/env python3
"""
Bridge script: imports LanhuExtractor from lanhu-mcp submodule,
fetches PRD page content, and outputs structured JSON to stdout.

Usage (from cli/vendor/lanhu-mcp directory):
    uv run python ../bridge.py --url <lanhu_url> [--page-id <id>]

Environment:
    KATA_LANHU_CONFIG must point at config/private/integrations/lanhu.yaml;
    the cookie is read from that YAML (secrets never travel via env values).
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path
from typing import List

import yaml


def _emit_error(message: str, code: str) -> None:
    """Write structured error JSON to stderr and exit."""
    payload = {"error": message, "code": code}
    sys.stderr.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.exit(1)


def _load_lanhu_config() -> dict:
    """Read config/private/integrations/lanhu.yaml via KATA_LANHU_CONFIG."""
    config_path = os.getenv("KATA_LANHU_CONFIG", "")
    if not config_path:
        _emit_error(
            "KATA_LANHU_CONFIG is not set. Run via kata so the lanhu config path is provided.",
            "MISSING_COOKIE",
        )
    try:
        with open(config_path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
    except OSError as e:
        _emit_error(f"Failed to read lanhu config {config_path}: {e}", "MISSING_COOKIE")
    if not isinstance(data, dict):
        _emit_error(f"lanhu config is not an object: {config_path}", "MISSING_COOKIE")
    return data


def _validate_env() -> None:
    """Ensure a usable Lanhu cookie is available from the config YAML, then mirror it
    for the vendored server (which reads LANHU_COOKIE / DDS_COOKIE at import time)."""
    data = _load_lanhu_config()
    cookie = (data.get("cookie") or "").strip()
    if not cookie or cookie == "your_lanhu_cookie_here":
        _emit_error(
            f"lanhu cookie not configured in {os.getenv('KATA_LANHU_CONFIG', '')}.",
            "MISSING_COOKIE",
        )
    os.environ["LANHU_COOKIE"] = cookie
    os.environ["DDS_COOKIE"] = cookie


def _setup_sys_path() -> None:
    """Add lanhu-mcp directory to sys.path so we can import the server module."""
    bridge_dir = Path(__file__).resolve().parent
    repo_root = Path(__file__).resolve().parent.parent.parent.parent.parent
    lanhu_mcp_dir = repo_root / "cli" / "vendor" / "lanhu-mcp"
    if not lanhu_mcp_dir.is_dir():
        _emit_error(
            f"lanhu-mcp submodule not found at {lanhu_mcp_dir}",
            "SUBMODULE_MISSING",
        )
    if str(lanhu_mcp_dir) not in sys.path:
        sys.path.insert(0, str(lanhu_mcp_dir))


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Fetch Lanhu PRD page content as structured JSON.",
    )
    parser.add_argument(
        "--url",
        required=True,
        help="Full Lanhu URL (e.g. https://lanhuapp.com/web/#/item/project/product?tid=...&pid=...&docId=...)",
    )
    parser.add_argument(
        "--page-id",
        default=None,
        help="Optional page ID to fetch a single page. Omit to fetch all pages.",
    )
    parser.add_argument(
        "--page-names",
        default=None,
        help="Comma-separated substrings to filter pages by name (e.g. '15525,15529').",
    )
    parser.add_argument(
        "--list-pages",
        action="store_true",
        default=False,
        help="Only list pages without analysis. Outputs lightweight page list JSON.",
    )
    return parser.parse_args()


def _extract_requirement_id(name: str) -> str | None:
    """Extract leading number from page name as requirement ID."""
    match = re.match(r"^(\d+)", name)
    return match.group(1) if match else None


def _find_screenshots_for_pages(pages: list[dict]) -> dict[str, list[str]]:
    """Find screenshot files that match page names in the data directory."""
    data_dir = Path.cwd() / "data"
    if not data_dir.exists():
        return {}

    screenshot_dirs = list(data_dir.glob("axure_extract_*_screenshots"))
    if not screenshot_dirs:
        return {}

    screenshots_dir = screenshot_dirs[0]
    result: dict[str, list[str]] = {}

    for page in pages:
        page_name = page.get("name", "")
        safe_name = re.sub(r'[^\w\s-]', '_', page_name)
        matches = [
            m for m in screenshots_dir.iterdir()
            if m.is_file() and m.stem.startswith(safe_name[:20])
        ]
        # Also try matching by original page name substring in filename
        if not matches:
            matches = [
                m for m in screenshots_dir.iterdir()
                if m.is_file() and page_name[:15] in m.stem
            ]
        if matches:
            result[page_name] = [str(m.resolve()) for m in matches]

    return result


def _extract_static_page(resource_dir: str, html_filename: str) -> tuple[str, list[str]]:
    """Extract readable text and local image assets without launching Chromium."""
    from bs4 import BeautifulSoup

    html_path = Path(resource_dir) / html_filename
    if not html_path.exists():
        return "", []
    soup = BeautifulSoup(html_path.read_text(encoding="utf-8"), "html.parser")
    for node in soup(["script", "style", "noscript"]):
        node.decompose()
    lines: list[str] = []
    seen: set[str] = set()
    for raw in soup.get_text("\n").splitlines():
        line = re.sub(r"\s+", " ", raw).strip()
        if line and line not in seen:
            seen.add(line)
            lines.append(line)

    assets: list[str] = []
    asset_seen: set[str] = set()
    refs: list[str] = []
    for image in soup.find_all("img"):
        src = image.get("src")
        if isinstance(src, str):
            refs.append(src)
    for node in soup.find_all(style=True):
        refs.extend(re.findall(r"url\(['\"]?([^)'\"\s]+)", node.get("style", "")))
    for ref in refs:
        if ref.startswith(("data:", "http://", "https://", "//")):
            continue
        candidate = (html_path.parent / ref).resolve()
        try:
            candidate.relative_to(Path(resource_dir).resolve())
        except ValueError:
            continue
        if candidate.is_file() and str(candidate) not in asset_seen:
            asset_seen.add(str(candidate))
            assets.append(str(candidate))
    return "\n".join(lines), assets


async def _list_pages(url: str) -> dict:
    """Fetch page list only, without analysis."""
    from lanhu_mcp_server import LanhuExtractor

    extractor = LanhuExtractor()
    pages_info = await extractor.get_pages_list(url)
    all_pages: List[dict] = pages_info.get("pages", [])

    return {
        "title": pages_info.get("document_name", ""),
        "doc_type": pages_info.get("document_type", "axure"),
        "total_pages": len(all_pages),
        "pages": [
            {
                "name": p.get("name", ""),
                "path": p.get("path", p.get("name", "")),
                "id": p.get("id", ""),
                "requirement_id": _extract_requirement_id(p.get("name", "")),
            }
            for p in all_pages
        ],
    }


async def _run(url: str, page_id: str | None, page_names_filter: str | None = None) -> dict:
    """
    Fetch raw Axure extraction results without invoking the MCP agent prompt wrapper.

    Returns the structured output dict.
    """
    # Import after sys.path and env are configured (module-level COOKIE read).
    from lanhu_mcp_server import DATA_DIR, LanhuExtractor, fix_html_files

    extractor = LanhuExtractor()
    try:
        params = extractor.parse_url(url)
        doc_id = params["doc_id"]
        version_id = params.get("version_id") or "latest"
        cache_key = f"{doc_id[:8]}_{version_id[:8]}"
        resource_dir = str(DATA_DIR / f"axure_extract_{cache_key}")
        output_dir = str(DATA_DIR / f"axure_extract_{cache_key}_screenshots")
        pages_info = await extractor.get_pages_list(url)
        all_pages: List[dict] = pages_info.get("pages", [])
        if page_id is not None:
            selected = [p for p in all_pages if p.get("id") == page_id]
        elif page_names_filter is not None:
            terms = [term.strip() for term in page_names_filter.split(",") if term.strip()]
            selected = [
                p for p in all_pages
                if any(term in p.get("name", "") for term in terms)
            ]
        else:
            selected = all_pages
        if not selected:
            _emit_error("No matching Lanhu pages", "PAGE_NOT_FOUND")

        filenames = [p["filename"].replace(".html", "") for p in selected]
        html_filenames = [p["filename"] for p in selected]
        download_result = await extractor.download_resources(
            url,
            resource_dir,
            force_update=True,
            page_filenames=html_filenames,
        )
        if download_result["status"] in ["downloaded", "updated"]:
            fix_html_files(resource_dir)

        page_entries = []
        for page in selected:
            filename = page["filename"].replace(".html", "")
            text, images = _extract_static_page(resource_dir, page["filename"])
            page_entries.append({
                "id": page.get("id", ""),
                "name": page.get("name", ""),
                "path": page.get("path", page.get("name", "")),
                "content": text,
                "images": images,
            })
        return {
            "title": pages_info.get("document_name", ""),
            "doc_type": pages_info.get("document_type", "axure"),
            "version_id": download_result.get("version_id", ""),
            "total_pages": len(page_entries),
            "pages": page_entries,
        }
    finally:
        await extractor.close()


def _split_content_by_pages(
    combined_text: str,
    all_pages: List[dict],
    page_id: str | None,
    page_names_filter: str | None = None,
) -> List[dict]:
    """
    Best-effort split of combined analysis text into per-page entries.

    The server inserts page-name markers like "=== Page: 页面名 ===" or
    "📄 Page X: 页面名". We try to split on those boundaries.
    If splitting fails, we return a single entry with all content.
    """
    if page_id is not None:
        target_pages = [p for p in all_pages if p.get("id") == page_id]
    elif page_names_filter is not None:
        filter_terms = [t.strip() for t in page_names_filter.split(",") if t.strip()]
        target_pages = [
            p for p in all_pages
            if any(term in p.get("name", "") for term in filter_terms)
        ]
    else:
        target_pages = all_pages

    # Try splitting by common page header patterns emitted by the server
    # Pattern examples: "📄 Page 1/N: 页面名" or "--- Page: 页面名 ---"
    page_sections = re.split(
        r"(?:📄\s*Page\s*\d+[/\d]*\s*[:：]\s*|[-=]{3,}\s*Page\s*[:：]?\s*)",
        combined_text,
    )

    # If we got meaningful splits that roughly match page count, zip them
    # Filter out empty sections
    page_sections = [s.strip() for s in page_sections if s.strip()]

    if len(page_sections) >= len(target_pages) and len(target_pages) > 0:
        entries = []
        for i, page in enumerate(target_pages):
            section_text = page_sections[i] if i < len(page_sections) else ""
            entries.append({
                "name": page.get("name", ""),
                "path": page.get("path", page.get("name", "")),
                "content": section_text,
                "images": [],
            })
        return entries

    # Fallback: one entry per page, all content in the first entry
    if len(target_pages) == 1:
        page = target_pages[0]
        return [{
            "name": page.get("name", ""),
            "path": page.get("path", page.get("name", "")),
            "content": combined_text,
            "images": [],
        }]

    # Multiple pages but couldn't split — return all pages with shared content
    entries = []
    for i, page in enumerate(target_pages):
        entries.append({
            "name": page.get("name", ""),
            "path": page.get("path", page.get("name", "")),
            "content": combined_text if i == 0 else "",
            "images": [],
        })
    return entries


def main() -> None:
    args = _parse_args()

    _validate_env()
    _setup_sys_path()

    result: dict
    try:
        if args.list_pages:
            result = asyncio.run(_list_pages(args.url))
        else:
            result = asyncio.run(
                _run(args.url, args.page_id, args.page_names)
            )
    except ValueError as exc:
        _emit_error(str(exc), "INVALID_URL")
        return
    except Exception as exc:
        _emit_error(str(exc), "FETCH_FAILED")
        return

    # Output structured JSON to stdout
    sys.stdout.write(json.dumps(result, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    main()
