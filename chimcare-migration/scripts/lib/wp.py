"""Read-only access to the local WordPress database (``chimcare_local``).

SELECT only. Nothing in this pipeline writes to WordPress: it is the source of truth for both the
URL list and the page bodies, and a migration that edits its own source cannot be re-run.

Rows come back as JSON via ``JSON_ARRAYAGG`` rather than as TSV, because ``post_content`` contains
tabs, newlines and quotes that no delimiter-splitting parser survives. Shelling out to the ``mysql``
client means the pipeline needs no database driver installed.
"""

from __future__ import annotations

import json
import shutil
import subprocess
from dataclasses import dataclass

# WordPress holds every location page as a published `job_listing`.
POST_TYPE = "job_listing"
LOCATION_PREFIX = "/location/"


@dataclass(frozen=True)
class WpConfig:
    host: str = "127.0.0.1"
    user: str = "root"
    database: str = "chimcare_local"


def add_db_args(parser) -> None:
    parser.add_argument("--host", default="127.0.0.1", help="MySQL host (default: 127.0.0.1)")
    parser.add_argument("--user", default="root", help="MySQL user (default: root)")
    parser.add_argument("--db", default="chimcare_local", help="WordPress database (default: chimcare_local)")


def config_from(args) -> WpConfig:
    return WpConfig(host=args.host, user=args.user, database=args.db)


def assert_mysql() -> None:
    if shutil.which("mysql") is None:
        raise SystemExit("the `mysql` client is not on PATH — this pipeline reads the local WordPress dump directly")


def _run(cfg: WpConfig, sql: str, raw: bool) -> str:
    cmd = ["mysql", "-h", cfg.host, "-u", cfg.user, f"--database={cfg.database}", "-N", "-B"]
    if raw:
        cmd.append("--raw")
    cmd += ["-e", sql]
    done = subprocess.run(cmd, capture_output=True, text=True)
    if done.returncode != 0:
        raise SystemExit(f"MySQL query failed:\n{done.stderr.strip()}")
    return done.stdout


def query_json(cfg: WpConfig, sql: str):
    """Run one SELECT whose single column is JSON, and parse it."""
    out = _run(cfg, sql, raw=True).strip()
    if not out or out == "NULL":
        return []
    return json.loads(out)


def lit(value) -> str:
    """A MySQL string literal. Patterns reach SQL from the command line, so they are escaped."""
    return "'" + str(value).replace("\\", "\\\\").replace("'", "''") + "'"


def url_for(slug: str) -> str:
    """The public URL WordPress serves a listing at."""
    return f"{LOCATION_PREFIX}{slug}/"
