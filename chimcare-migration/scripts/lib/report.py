"""Markdown writers for the reports the plan names by hand.

Every stage writes JSON first and Markdown second. The JSON is the contract the next stage reads;
the Markdown is for a person, and nothing in the pipeline parses it back.
"""

from __future__ import annotations

from collections import Counter
from pathlib import Path


def cell(value) -> str:
    return str("" if value is None else value).replace("|", "\\|").replace("\n", " ")


def table(headers, rows) -> str:
    out = ["| " + " | ".join(headers) + " |", "| " + " | ".join("---" for _ in headers) + " |"]
    out += ["| " + " | ".join(cell(c) for c in row) + " |" for row in rows]
    return "\n".join(out)


def header(title: str, meta: dict) -> str:
    lines = [f"# {title}", ""]
    lines += [f"- **{k}:** {v}" for k, v in meta.items()]
    lines.append("")
    return "\n".join(lines)


def write(path: Path, body: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body if body.endswith("\n") else body + "\n", encoding="utf-8")


def counts(items, key) -> list:
    return Counter(item[key] for item in items).most_common()


def truncate(text: str, limit: int) -> str:
    text = " ".join(str(text or "").split())
    return text if len(text) <= limit else text[: limit - 1].rstrip() + "…"
