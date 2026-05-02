#!/usr/bin/env python3
"""Normalize the online main-flow XMind to use the suite title as the root node.

kata xmind-gen emits project -> suite -> versions. The LTQC mainflow XMind uses a
flatter business-facing shape, so this post-processes the generated workbook to
suite -> versions while preserving all requirement/case children and notes.
"""

from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile, ZIP_DEFLATED
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
XMIND = ROOT / "岚图已上线需求主流程用例.xmind"


def main() -> None:
    with ZipFile(XMIND, "r") as zin:
        content = json.loads(zin.read("content.json").decode("utf-8"))
        sheet = content[0]
        root = sheet["rootTopic"]
        children = root.get("children", {}).get("attached", [])

        if len(children) == 1:
            suite = children[0]
            suite_children = suite.get("children", {}).get("attached", [])
            if not suite_children:
                raise SystemExit("Suite node has no version children")

            root["title"] = suite.get("title", root.get("title", "岚图已上线需求主流程用例"))
            root["children"] = {"attached": suite_children}
            sheet["title"] = root["title"]
        normalize_priority_markers(root)

        with NamedTemporaryFile(delete=False) as tmp:
            tmp_path = Path(tmp.name)

        with ZipFile(tmp_path, "w", ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                if item.filename == "content.json":
                    zout.writestr(item, json.dumps(content, ensure_ascii=False, separators=(",", ":")))
                else:
                    zout.writestr(item, zin.read(item.filename))

    shutil.move(tmp_path, XMIND)
    print(f"Normalized {XMIND}")


def normalize_priority_markers(topic: dict) -> None:
    """Set every priority marker in the workbook to XMind priority level 1."""
    for marker in topic.get("markers", []) or []:
        marker_id = marker.get("markerId")
        if isinstance(marker_id, str) and marker_id.startswith("priority-"):
            marker["markerId"] = "priority-1"
    for child in topic.get("children", {}).get("attached", []) or []:
        normalize_priority_markers(child)


if __name__ == "__main__":
    main()
