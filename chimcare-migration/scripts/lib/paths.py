"""Every path the pipeline touches, resolved from this file so the scripts run from any directory."""

from __future__ import annotations

import json
from pathlib import Path

# chimcare-migration/
MIGRATION_ROOT = Path(__file__).resolve().parents[2]
# chimcare-web/ — the Next.js application this pipeline feeds.
APP_ROOT = MIGRATION_ROOT.parent

# Machine-readable stage output: the contract between stages. Regenerable, so gitignored.
OUT_DIR = MIGRATION_ROOT / "out"
# Human-readable reports, including the two files the plan names by hand.
URLS_DIR = MIGRATION_ROOT / "URLS"

SELECTED = OUT_DIR / "01-selected.json"
STATUS = OUT_DIR / "02-status.json"
CONTENT = OUT_DIR / "03-content.json"
ROUTES = OUT_DIR / "04-routes.json"
RENDER = OUT_DIR / "05-render.json"

URLS_MD = URLS_DIR / "fetched-URLS.md"
CONTENT_MD = URLS_DIR / "fetched-URLS-content.md"
RENDER_MD = URLS_DIR / "render-report.md"

# Where stage 4 writes the source shard the application's page-source index reads.
def source_shard(tag: str) -> Path:
    return APP_ROOT / "data" / "seed" / f"{tag}.page-source.jsonl"


def ensure_dirs() -> None:
    for d in (OUT_DIR, URLS_DIR):
        d.mkdir(parents=True, exist_ok=True)


def rel(p: Path) -> str:
    """A path as written in this pipeline's own documentation."""
    try:
        return str(Path(p).resolve().relative_to(MIGRATION_ROOT))
    except ValueError:
        return str(p)


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def read_stage(path: Path, produced_by: str):
    """Read a prior stage's output, naming the command that would produce it."""
    if not path.exists():
        raise SystemExit(f"missing {rel(path)} — run `{produced_by}` first")
    return json.loads(path.read_text(encoding="utf-8"))
