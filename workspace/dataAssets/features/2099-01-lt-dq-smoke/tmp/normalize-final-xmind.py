#!/usr/bin/env python3
"""Normalize generated LTQC XMind workbooks."""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZIP_DEFLATED, ZipFile

FEATURE = Path(__file__).resolve().parent.parent
A_XMIND = FEATURE / "岚图主流程用例整理.xmind"
B_XMIND = FEATURE / "岚图已上线需求主流程用例.xmind"


def transform_topic(topic: dict) -> None:
    if isinstance(topic.get("title"), str):
        topic["title"] = topic["title"].replace("<br>", "\n")
    normalize_priority_markers(topic)
    children = topic.get("children", {})
    for kind in ("attached", "detached", "summary"):
        for child in children.get(kind, []) or []:
            transform_topic(child)


def normalize_priority_markers(topic: dict) -> None:
    for marker in topic.get("markers", []) or []:
        marker_id = marker.get("markerId")
        if isinstance(marker_id, str) and marker_id.startswith("priority-"):
            marker["markerId"] = "priority-1"


def flatten_root(sheet: dict) -> None:
    root = sheet.get("rootTopic", {})
    children = root.get("children", {}).get("attached", []) or []
    if len(children) != 1:
        return
    suite = children[0]
    suite_children = suite.get("children", {}).get("attached", []) or []
    if not suite_children:
        return
    root["title"] = suite.get("title", root.get("title", ""))
    root["children"] = {"attached": suite_children}
    sheet["title"] = root["title"]


def normalize_xmind(path: Path) -> None:
    with ZipFile(path, "r") as zin:
        content = json.loads(zin.read("content.json").decode("utf-8"))
        for sheet in content:
            flatten_root(sheet)
            root = sheet.get("rootTopic")
            if root:
                transform_topic(root)

        with NamedTemporaryFile(delete=False) as tmp:
            tmp_path = Path(tmp.name)

        with ZipFile(tmp_path, "w", ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "content.json":
                    zout.writestr(
                        item,
                        json.dumps(content, ensure_ascii=False, separators=(",", ":")),
                    )
                else:
                    zout.writestr(item, zin.read(item.filename))

    shutil.move(tmp_path, path)
    print(f"normalized: {path}")


def main(argv: list[str]) -> int:
    targets = [Path(arg) for arg in argv[1:]] or [A_XMIND, B_XMIND]
    for target in targets:
        if not target.exists():
            print(f"skip (missing): {target}", file=sys.stderr)
            continue
        normalize_xmind(target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
