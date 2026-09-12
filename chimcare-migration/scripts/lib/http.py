"""Polite, bounded HTTP against the live WordPress site.

Production is the only authority on what a URL does today. The fate maps in this repo are an
unapplied plan, and on every URL probed so far production and the map disagree in production's
favour, so status comes from a real request and never from a lookup table.

Redirects are followed one hop at a time so the chain is observed rather than inferred: a 301 that
lands on a 404 is a different fact from a clean 301. Standard library only — no driver, no install.
"""

from __future__ import annotations

import gzip
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from threading import Lock
from time import sleep

DEFAULT_ORIGIN = "https://www.chimcare.com"
USER_AGENT = "chimcare-migration-pipeline/1.0 (+URL migration trial; contact harold@chimcare.com)"
REDIRECT_CODES = {301, 302, 303, 307, 308}


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    """Stops urllib following redirects, so each hop can be recorded."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


_opener = urllib.request.build_opener(_NoRedirect)


@dataclass
class Probe:
    url: str
    first_status: int | None = None
    final_status: int | None = None
    final_url: str | None = None
    chain: list = field(default_factory=list)
    body: str | None = None
    error: str | None = None

    def as_dict(self) -> dict:
        return {
            "url": self.url,
            "firstStatus": self.first_status,
            "finalStatus": self.final_status,
            "finalUrl": self.final_url,
            "chain": self.chain,
            "error": self.error,
        }


def probe(url: str, *, max_hops: int = 5, timeout: float = 20.0, want_body: bool = False) -> Probe:
    """Fetch one URL, following up to ``max_hops`` redirects by hand."""
    result = Probe(url=url)
    current = url

    for _ in range(max_hops + 1):
        request = urllib.request.Request(
            current,
            method="GET",
            headers={"User-Agent": USER_AGENT, "Accept": "text/html,*/*", "Accept-Encoding": "gzip"},
        )
        try:
            with _opener.open(request, timeout=timeout) as response:
                status = response.status
                location = response.headers.get("Location")
                payload = response.read() if (want_body and status == 200) else b""
                if payload[:2] == b"\x1f\x8b":
                    payload = gzip.decompress(payload)
        except urllib.error.HTTPError as exc:  # 4xx/5xx and, with the handler above, 3xx
            status = exc.code
            location = exc.headers.get("Location")
            payload = b""
        except Exception as exc:  # timeouts, DNS, TLS
            result.error = f"{type(exc).__name__}: {exc}"
            break

        if result.first_status is None:
            result.first_status = status
        result.final_status = status
        result.final_url = current

        if status in REDIRECT_CODES and location:
            nxt = urllib.parse.urljoin(current, location)
            result.chain.append({"status": status, "from": current, "to": nxt})
            current = nxt
            continue

        if want_body and status == 200:
            result.body = payload.decode("utf-8", errors="replace")
        break

    return result


def map_pool(items, worker, *, concurrency: int = 4, delay: float = 0.0, on_progress=None):
    """Run ``worker`` over ``items`` with bounded concurrency and a pause between starts.

    The pause is what keeps a 200-URL run from reading as a burst of traffic to the origin.
    """
    results: list = [None] * len(items)
    lock = Lock()
    state = {"done": 0}

    def run(pair):
        index, item = pair
        if delay:
            sleep(delay)
        results[index] = worker(item)
        if on_progress:
            with lock:
                state["done"] += 1
                on_progress(state["done"], len(items))

    with ThreadPoolExecutor(max_workers=max(1, min(concurrency, len(items) or 1))) as pool:
        list(pool.map(run, enumerate(items)))
    return results


def fate_of(result: Probe) -> dict:
    """What the pipeline should do with a URL, given what production answered.

    The plan's "filter out 404" is widened here on purpose. A redirect is not a 404, but it is also
    not a page to migrate — it is a redirect to carry over, and collapsing both into "drop it" would
    throw away the destination.
    """
    if result.error:
        return {"fate": "error", "reason": result.error}
    first, final = result.first_status, result.final_status
    if first == 200:
        return {"fate": "migrate", "reason": "serves 200 on the source URL"}
    if first in REDIRECT_CODES:
        target = result.chain[-1]["to"] if result.chain else None
        if final == 200:
            return {"fate": "redirect", "reason": f"{first} to a live page", "redirectTo": target}
        return {"fate": "drop", "reason": f"{first} chain ends in {final}", "redirectTo": target}
    # 410 is dropped like a 404. The two mean different things to a crawler — 410 says the page was
    # removed deliberately — but they mean the same thing here: there is nothing to migrate. The
    # reason keeps the distinction visible in the report without giving it a fate of its own.
    if first == 410:
        return {"fate": "drop", "reason": "410 Gone — removed deliberately"}
    if first == 404:
        return {"fate": "drop", "reason": "404 Not Found"}
    return {"fate": "drop", "reason": f"unexpected status {first}"}
