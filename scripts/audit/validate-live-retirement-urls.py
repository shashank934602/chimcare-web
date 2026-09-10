#!/usr/bin/env python3
"""
Live validation of Chimcare 404 / retirement candidate URLs against PRODUCTION.

READ ONLY. This script issues HTTP GET requests and records what came back.
It never writes to WordPress, Cloudflare, the database, the migration map or any
audit file other than its own output. It applies no redirect and retires no URL.

Source of truth for the candidate set:
    data/audits/url-universe/url-master-migration-map.csv
Candidates are the UNION of
    primary_map_type == 'RETIRE'   and   http_status starting '404'
which is what the audit calls "404 / retirement candidates".

Outputs (none of them overwrite an existing audit file):
    live-retirement-validation.csv          one row per URL, newly measured
    live-retirement-validation-summary.csv  counts by classification
    live-retirement-validation-report.md    the written summary
    .live-validation-checkpoint.json        resume state

Usage:
    python3 validate-live-retirement-urls.py --limit 20            # smoke test
    python3 validate-live-retirement-urls.py                       # full run
    python3 validate-live-retirement-urls.py --resume              # continue
    python3 validate-live-retirement-urls.py --report-only         # rebuild summary
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import os
import random
import ssl
import sys
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

try:
    import aiohttp
except ImportError:
    sys.exit("aiohttp is required:  python3 -m pip install --user aiohttp")

# --------------------------------------------------------------------------------------------
# paths
# --------------------------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
AUDIT_DIR = os.path.join(REPO, "data", "audits", "url-universe")
SOURCE_CSV = os.path.join(AUDIT_DIR, "url-master-migration-map.csv")
OUT_CSV = os.path.join(AUDIT_DIR, "live-retirement-validation.csv")
SUMMARY_CSV = os.path.join(AUDIT_DIR, "live-retirement-validation-summary.csv")
REPORT_MD = os.path.join(AUDIT_DIR, "live-retirement-validation-report.md")
CHECKPOINT = os.path.join(AUDIT_DIR, ".live-validation-checkpoint.json")

BASE = "https://www.chimcare.com"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
      "ChimcareMigrationAudit/1.0 (read-only URL validation; contact site owner)")

# --------------------------------------------------------------------------------------------
# classification
# --------------------------------------------------------------------------------------------
# Documented meanings. A transient failure is NEVER converted into a 404.
CLASSIFICATIONS = {
    "LIVE_200":         "served 200 directly, no redirect",
    "REDIRECT_TO_200":  "redirected and the final response was 200",
    "REDIRECT_TO_3XX":  "redirect chain ended on a 3xx (hop limit or loop)",
    "REDIRECT_TO_404":  "redirected and the final response was 404/410",
    "DIRECT_404":       "returned 404 or 410 with no redirect",
    "403":              "forbidden",
    "429":              "rate limited after all retries",
    "SERVER_ERROR":     "5xx after all retries",
    "TIMEOUT":          "timed out after all retries",
    "CONNECTION_ERROR": "connection failed after all retries",
    "DNS_ERROR":        "hostname could not be resolved",
    "OTHER":            "a status that fits none of the above",
}
GONE_STATUSES = {404, 410}
RETRY_STATUSES = {429, 500, 502, 503, 504}


def classify(first_status: Optional[int], final_status: Optional[int],
             redirect_count: int, error: str) -> str:
    if error == "timeout":
        return "TIMEOUT"
    if error == "dns":
        return "DNS_ERROR"
    if error:
        return "CONNECTION_ERROR"
    if final_status is None:
        return "OTHER"
    if final_status == 403:
        return "403"
    if final_status == 429:
        return "429"
    if 500 <= final_status <= 599:
        return "SERVER_ERROR"
    if redirect_count > 0:
        if final_status == 200:
            return "REDIRECT_TO_200"
        if final_status in GONE_STATUSES:
            return "REDIRECT_TO_404"
        if 300 <= final_status <= 399:
            return "REDIRECT_TO_3XX"
        return "OTHER"
    if final_status == 200:
        return "LIVE_200"
    if final_status in GONE_STATUSES:
        return "DIRECT_404"
    return "OTHER"


# --------------------------------------------------------------------------------------------
# candidate loading
# --------------------------------------------------------------------------------------------
def load_candidates(limit: Optional[int]) -> List[Dict[str, str]]:
    """Read the CURRENT audit map. Columns are read by name, never by position."""
    if not os.path.exists(SOURCE_CSV):
        sys.exit(f"source not found: {SOURCE_CSV}")
    csv.field_size_limit(10 ** 9)
    rows: List[Dict[str, str]] = []
    with open(SOURCE_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        need = {"source_url", "primary_map_type", "http_status"}
        missing = need - set(reader.fieldnames or [])
        if missing:
            sys.exit(f"source CSV is missing expected columns: {sorted(missing)}")
        for r in reader:
            is_retire = r["primary_map_type"] == "RETIRE"
            is_404 = r["http_status"].startswith("404")
            if not (is_retire or is_404):
                continue
            rows.append({
                "url": r["source_url"],
                "source_classification": r["primary_map_type"],
                "previous_status": r["http_status"],
                "recommended_action": r.get("recommended_action", ""),
                "priority": r.get("priority", ""),
                "traffic_clicks": r.get("traffic_clicks", "0"),
                "traffic_impressions": r.get("traffic_impressions", "0"),
                "wp_post_id": r.get("wp_post_id", ""),
                "wp_title": r.get("wp_title", ""),
                "reason": r.get("reason", ""),
            })
    rows.sort(key=lambda x: (-int(x["traffic_clicks"] or 0), x["url"]))
    if limit:
        rows = rows[:limit]
    return rows


# --------------------------------------------------------------------------------------------
# fetching
# --------------------------------------------------------------------------------------------
OUT_FIELDS = [
    "url", "source_classification", "previous_status", "live_status", "classification",
    "first_status", "final_status", "final_url", "redirect_count", "redirect_chain",
    "response_time_ms", "attempts", "error", "validated_at", "batch_number",
    "content_length", "content_type", "server", "location_header",
    "traffic_clicks", "traffic_impressions", "priority", "wp_post_id", "wp_title",
    "audit_reason", "status_changed",
]


async def fetch_one(session: aiohttp.ClientSession, sem: asyncio.Semaphore,
                    rec: Dict[str, str], batch: int, max_attempts: int,
                    timeout_s: int) -> Dict[str, Any]:
    url = BASE + rec["url"]
    attempts = 0
    error = ""
    first_status: Optional[int] = None
    final_status: Optional[int] = None
    chain: List[str] = []
    final_url = ""
    headers_out = {"content_length": "", "content_type": "", "server": "", "location_header": ""}
    # Timed INSIDE the semaphore so this measures the HTTP round trip only. Timing the wait for a
    # concurrency slot as well would report queue depth, not server latency.
    elapsed_ms = 0

    while attempts < max_attempts:
        attempts += 1
        error = ""
        try:
            async with sem:
                started = time.perf_counter()
                # GET, not HEAD: CDNs and WAFs routinely answer the two differently.
                async with session.get(
                    url, allow_redirects=True, timeout=aiohttp.ClientTimeout(total=timeout_s),
                ) as resp:
                    hist = list(resp.history)
                    first_status = hist[0].status if hist else resp.status
                    final_status = resp.status
                    final_url = str(resp.url)
                    chain = [str(h.url) for h in hist] + [final_url]
                    headers_out["content_length"] = resp.headers.get("Content-Length", "")
                    headers_out["content_type"] = (resp.headers.get("Content-Type", "") or "").split(";")[0]
                    headers_out["server"] = resp.headers.get("Server", "")
                    headers_out["location_header"] = (hist[0].headers.get("Location", "") if hist else "")
                    # read and discard the body so the connection is released cleanly.
                    # we never store page HTML - only HTTP metadata.
                    await resp.read()
                    elapsed_ms = int((time.perf_counter() - started) * 1000)

            if final_status in RETRY_STATUSES and attempts < max_attempts:
                await asyncio.sleep(min(2 ** attempts, 8) + random.uniform(0, 1))
                continue
            break

        except asyncio.TimeoutError:
            error = "timeout"
            elapsed_ms = timeout_s * 1000
        except aiohttp.ClientConnectorDNSError:
            error = "dns"
        except aiohttp.ClientConnectorError as e:
            error = f"connect: {str(e)[:80]}"
        except aiohttp.ClientError as e:
            error = f"client: {type(e).__name__}: {str(e)[:60]}"
        except Exception as e:  # noqa: BLE001 - recorded, never silently dropped
            error = f"{type(e).__name__}: {str(e)[:60]}"

        if attempts < max_attempts:
            await asyncio.sleep(min(2 ** attempts, 8) + random.uniform(0, 1))

    redirect_count = max(0, len(chain) - 1) if chain else 0
    cls = classify(first_status, final_status, redirect_count, error)

    prev = rec["previous_status"]
    prev_is_404 = prev.startswith("404")
    if cls in ("TIMEOUT", "CONNECTION_ERROR", "DNS_ERROR", "429", "SERVER_ERROR", "403"):
        changed = "unknown - not verified"
    elif prev_is_404 and cls != "DIRECT_404":
        changed = "yes - audit said 404, production says otherwise"
    elif (not prev_is_404) and cls == "DIRECT_404":
        changed = "yes - audit said 200, production says 404"
    else:
        changed = "no"

    return {
        "url": rec["url"],
        "source_classification": rec["source_classification"],
        "previous_status": prev,
        "live_status": final_status if final_status is not None else (error or "error"),
        "classification": cls,
        "first_status": first_status if first_status is not None else "",
        "final_status": final_status if final_status is not None else "",
        "final_url": final_url,
        "redirect_count": redirect_count,
        "redirect_chain": " -> ".join(chain) if redirect_count else "",
        "response_time_ms": elapsed_ms,
        "attempts": attempts,
        "error": error,
        "validated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "batch_number": batch,
        **headers_out,
        "traffic_clicks": rec["traffic_clicks"],
        "traffic_impressions": rec["traffic_impressions"],
        "priority": rec["priority"],
        "wp_post_id": rec["wp_post_id"],
        "wp_title": rec["wp_title"],
        "audit_reason": rec["reason"],
        "status_changed": changed,
    }


# --------------------------------------------------------------------------------------------
# checkpoint / resume
# --------------------------------------------------------------------------------------------
def load_done() -> set:
    """URLs already validated successfully. A transient failure is NOT counted as done."""
    if not os.path.exists(OUT_CSV):
        return set()
    done = set()
    unresolved = {"TIMEOUT", "CONNECTION_ERROR", "DNS_ERROR", "429", "SERVER_ERROR"}
    csv.field_size_limit(10 ** 9)
    with open(OUT_CSV, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r.get("classification") not in unresolved:
                done.add(r["url"])
    return done


def append_rows(rows: List[Dict[str, Any]], write_header: bool) -> None:
    mode = "w" if write_header else "a"
    with open(OUT_CSV, mode, newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=OUT_FIELDS, extrasaction="ignore")
        if write_header:
            w.writeheader()
        w.writerows(rows)


# --------------------------------------------------------------------------------------------
# reporting
# --------------------------------------------------------------------------------------------
def build_report() -> None:
    if not os.path.exists(OUT_CSV):
        sys.exit("no results to summarise")
    csv.field_size_limit(10 ** 9)
    rows = list(csv.DictReader(open(OUT_CSV, newline="", encoding="utf-8")))
    n = len(rows)
    cls = Counter(r["classification"] for r in rows)
    by_source = Counter((r["source_classification"], r["classification"]) for r in rows)

    with open(SUMMARY_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["source_classification", "live_classification", "urls", "pct_of_total",
                    "clicks", "impressions", "meaning"])
        agg: Dict[tuple, Dict[str, int]] = {}
        for r in rows:
            k = (r["source_classification"], r["classification"])
            a = agg.setdefault(k, {"n": 0, "c": 0, "i": 0})
            a["n"] += 1
            a["c"] += int(r["traffic_clicks"] or 0)
            a["i"] += int(r["traffic_impressions"] or 0)
        for k, a in sorted(agg.items(), key=lambda x: -x[1]["n"]):
            w.writerow([k[0], k[1], a["n"], f"{a['n']/n*100:.2f}%", a["c"], a["i"],
                        CLASSIFICATIONS.get(k[1], "")])

    retire = [r for r in rows if r["source_classification"] == "RETIRE"]
    r_live = [r for r in retire if r["classification"] == "LIVE_200"]
    r_r200 = [r for r in retire if r["classification"] == "REDIRECT_TO_200"]
    r_r404 = [r for r in retire if r["classification"] == "REDIRECT_TO_404"]
    r_404 = [r for r in retire if r["classification"] == "DIRECT_404"]
    was404_now_live = [r for r in rows if r["previous_status"].startswith("404")
                       and r["classification"] in ("LIVE_200", "REDIRECT_TO_200")]
    errors = [r for r in rows if r["classification"] in
              ("TIMEOUT", "CONNECTION_ERROR", "DNS_ERROR", "429", "SERVER_ERROR", "403", "OTHER")]

    def clicks(rs): return sum(int(r["traffic_clicks"] or 0) for r in rs)

    def table(rs, limit=20):
        rs = sorted(rs, key=lambda r: -int(r["traffic_clicks"] or 0))[:limit]
        if not rs:
            return "_none_\n"
        out = ["| URL | clicks | live | final |", "|---|---:|---|---|"]
        for r in rs:
            out.append(f"| `{r['url']}` | {r['traffic_clicks']} | {r['classification']} | "
                       f"{r['final_url'].replace(BASE, '') or '-'} |")
        return "\n".join(out) + "\n"

    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    md = f"""# Live Validation of 404 / Retirement URLs

**Generated:** {ts}
**Method:** real HTTP GET against `{BASE}`, redirects followed, full chain recorded.
**Read-only.** No page, redirect, DNS, CDN, database or audit file was modified.

Every row in `live-retirement-validation.csv` carries a newly obtained live status and its own
timestamp. Nothing here is copied from the earlier audit's stored status.

---

## Totals

| Measure | URLs |
|---|---:|
| **Validated** | **{n:,}** |
| Live 200 (direct) | {cls['LIVE_200']:,} |
| Redirect ending 200 | {cls['REDIRECT_TO_200']:,} |
| Redirect ending 404 | {cls['REDIRECT_TO_404']:,} |
| Redirect ending 3xx | {cls['REDIRECT_TO_3XX']:,} |
| Direct 404 | {cls['DIRECT_404']:,} |
| 403 | {cls['403']:,} |
| 429 | {cls['429']:,} |
| 5xx | {cls['SERVER_ERROR']:,} |
| Timeout | {cls['TIMEOUT']:,} |
| Connection error | {cls['CONNECTION_ERROR']:,} |
| DNS error | {cls['DNS_ERROR']:,} |
| Other | {cls['OTHER']:,} |

Total redirects observed: **{cls['REDIRECT_TO_200'] + cls['REDIRECT_TO_404'] + cls['REDIRECT_TO_3XX']:,}**

---

## The retirement question

{len(retire):,} URLs carried `RETIRE` in the audit. Production says:

| Live result | URLs | Clicks | What it means |
|---|---:|---:|---|
| **LIVE_200** | **{len(r_live):,}** | {clicks(r_live):,} | **Working page. Must not be retired automatically.** |
| REDIRECT_TO_200 | {len(r_r200):,} | {clicks(r_r200):,} | Already forwards to a live page |
| REDIRECT_TO_404 | {len(r_r404):,} | {clicks(r_r404):,} | Forwards to a dead end |
| DIRECT_404 | {len(r_404):,} | {clicks(r_404):,} | Already gone; retiring changes 404 to 410 |

---

## Where the audit and production disagree

**{len(was404_now_live):,} URLs the audit recorded as 404 are reachable today** (200 or a redirect ending 200).

{table(was404_now_live)}

---

## Highest-priority exceptions: retirement candidates that are live and earn clicks

{table([r for r in r_live if int(r['traffic_clicks'] or 0) > 0], 25)}

---

## Unverified

{len(errors):,} URLs could not be resolved to a definitive status after all retries. They are recorded
with their error and are **not** counted as 404.

{table(errors, 15)}

---

## Manual verification

```bash
curl -I -L "{BASE}/location/example-url/"                 # headers, follow redirects
curl -sS -o /dev/null -w '%{{http_code}} %{{url_effective}}\\n' -L "{BASE}/location/example-url/"
```

---

## Files

| File | Contents |
|---|---|
| `live-retirement-validation.csv` | one row per URL, live result |
| `live-retirement-validation-summary.csv` | counts by source and live classification |
| `live-retirement-validation-report.md` | this report |

**Classifications used**

""" + "\n".join(f"- `{k}` — {v}" for k, v in CLASSIFICATIONS.items()) + "\n"

    with open(REPORT_MD, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"\nwrote {SUMMARY_CSV}\nwrote {REPORT_MD}")
    print(f"\n{'classification':<20} {'urls':>8}")
    for k, v in cls.most_common():
        print(f"{k:<20} {v:>8,}")


# --------------------------------------------------------------------------------------------
# main
# --------------------------------------------------------------------------------------------
async def run(args) -> None:
    candidates = load_candidates(args.limit)
    done = load_done() if args.resume else set()
    if args.resume and done:
        print(f"resuming: {len(done):,} already validated")
    todo = [c for c in candidates if c["url"] not in done]
    print(f"candidates: {len(candidates):,}   to validate now: {len(todo):,}")
    if not todo:
        print("nothing to do")
        return

    write_header = not (args.resume and os.path.exists(OUT_CSV))
    sem = asyncio.Semaphore(args.concurrency)
    connector = aiohttp.TCPConnector(limit=args.concurrency, limit_per_host=args.concurrency,
                                     ttl_dns_cache=600, ssl=ssl.create_default_context())
    totals: Counter = Counter()
    started = time.time()

    async with aiohttp.ClientSession(connector=connector, headers={"User-Agent": UA}) as session:
        for bi in range(0, len(todo), args.batch):
            batch = todo[bi:bi + args.batch]
            bnum = bi // args.batch + 1
            results = await asyncio.gather(*[
                fetch_one(session, sem, rec, bnum, args.retries, args.timeout) for rec in batch
            ])
            append_rows(results, write_header)
            write_header = False
            for r in results:
                totals[r["classification"]] += 1
            json.dump({"validated": bi + len(batch), "of": len(todo),
                       "at": datetime.now(timezone.utc).isoformat(timespec="seconds")},
                      open(CHECKPOINT, "w"))
            done_n = bi + len(batch)
            rate = done_n / max(1e-9, time.time() - started)
            eta = (len(todo) - done_n) / rate if rate else 0
            print(f"batch {bnum:>3}  {done_n:>6,}/{len(todo):,}  "
                  f"200:{totals['LIVE_200']:,} r200:{totals['REDIRECT_TO_200']:,} "
                  f"404:{totals['DIRECT_404']:,} r404:{totals['REDIRECT_TO_404']:,} "
                  f"err:{sum(totals[k] for k in ('TIMEOUT','CONNECTION_ERROR','DNS_ERROR','SERVER_ERROR','429')):,}  "
                  f"{rate:.1f}/s  eta {eta/60:.1f}m", flush=True)
            if bi + args.batch < len(todo):
                await asyncio.sleep(args.batch_pause)

    print(f"\ndone in {(time.time()-started)/60:.1f} min")
    build_report()


def main() -> None:
    p = argparse.ArgumentParser(description="Live-validate Chimcare 404/retirement URLs (read-only)")
    p.add_argument("--limit", type=int, default=0, help="validate only the first N candidates")
    p.add_argument("--concurrency", type=int, default=25)
    p.add_argument("--batch", type=int, default=500)
    p.add_argument("--timeout", type=int, default=15)
    p.add_argument("--retries", type=int, default=3)
    p.add_argument("--batch-pause", type=float, default=1.0, help="seconds between batches")
    p.add_argument("--resume", action="store_true")
    p.add_argument("--report-only", action="store_true")
    args = p.parse_args()
    args.limit = args.limit or None

    if args.report_only:
        build_report()
        return
    asyncio.run(run(args))


if __name__ == "__main__":
    main()
