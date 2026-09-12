# SEO impact · changing `{service}-in-{city}-{st}` to `{service}-{city}-{st}`

An assessment of moving the site's dominant URL pattern, written before any of it is built.
Every figure here is measured from this project's own data: the WordPress database, and a Search
Console export covering 139,063 URLs.

**Short version.** The mechanism is sound and Google is explicit that permanent redirects do not cost
PageRank. The risk is not the redirect. It is the scale, the fact that the destination pattern is
already in use, and that the sample chosen for the experiment happens to be the most valuable URLs on
the site.

---

## 1. What is actually at stake

| | URLs | Clicks | Impressions |
| --- | --- | --- | --- |
| Family A, `{service}-in-{city}-{st}` | 123,129 in Search Console | 42,687 | 9,068,355 |
| Family C, `{service}-{city}-{st}` | 8,193 | 6,790 | 1,141,290 |
| Everything else under `/location/` | 2,346 | 8,857 | 1,821,042 |

Family A is 213,766 published URLs and carries **73% of all `/location/` search clicks**. This is not
a tidy-up of a minor pattern; it is the main body of the site.

### The traffic is extremely concentrated

| Top N family-A URLs | Share of family-A clicks |
| --- | --- |
| 100 | 38.2% |
| 500 | 47.8% |
| 1,000 | 54.2% |
| 5,000 | 75.8% |

Only **15,325 of 123,129** family-A URLs (12.4%) earn a single click. **107,804 have impressions but
no clicks at all**, and the median position among those that do rank is **13.4** — the bottom of page
two.

This cuts both ways, and it is the most useful fact in this document:

- **The downside is concentrated.** Mishandling a hundred URLs can cost nearly 40% of the traffic.
- **The upside is that most of the pattern is dead weight.** 88% of these URLs earn nothing. Moving
  them risks little, because there is little to lose.

---

## 2. The destination pattern is not empty

`{service}-{city}-{st}` is not a new namespace. **11,491 published URLs already use it** — the family
this project calls C, carrying 6,790 clicks of its own.

Rewriting family A into that shape produces:

- **231 direct collisions**, where the rewritten URL already exists as a published page.
- **4 self-collisions**, where two different family-A URLs rewrite to the same target.

235 URLs cannot simply be renamed. Each needs a decision: merge the content, keep one and redirect the
other, or leave it alone. Done carelessly, a collision means one page silently overwrites another and
the loser's rankings go to a page that no longer says what it used to.

---

## 3. What Google actually says

From the current documentation, not folklore:

- **Permanent redirects do not cost PageRank.** 301 and 308 are explicitly safe on that count.
- **A move is only complete when Googlebot has crawled every old and new URL at least once.** There is
  no fixed crawl rate; it scales with site size and crawl capacity.
- **Keep redirects for at least 180 days**, longer while they still receive Search traffic.
- **Avoid chains.** Googlebot follows up to 10 hops, but the guidance is to redirect straight to the
  final destination and keep any chain under 3 to 5.

The second point is the one that matters at this size. **213,766 URLs must each be recrawled twice**,
once at the old address and once at the new. On a site this large that is a months-long process, not a
weekend. During it, Search Console will show both patterns, impressions will move unpredictably
between them, and any conclusion drawn in the first weeks will be noise.

---

## 4. Risks specific to this site

**Redirects already exist and are inconsistent.** WordPress holds 757 Yoast Premium redirect rules and
763 posts carrying `_wp_old_slug` history. None of the 757 currently target a family-A URL, so a new
layer would not immediately create chains — but the existing rules are already known to disagree with
production, and adding 213,766 more rules on top of a map nobody trusts compounds a problem rather
than fixing one.

**Redirect storage.** 213,766 rules is not a `.htaccess` file or a WordPress plugin table. That volume
belongs in an edge key-value store, evaluated before the application. A plugin-based lookup at this
size will cost time on every request, including the ones that do not redirect.

**Nothing is gained in ranking terms.** Google does not reward `-in-` being absent from a slug. The
honest justification for this change is consistency and readability, not ranking. Any SEO case for it
is a case about not losing, never about gaining.

---

## 5. The 500-URL experiment, as proposed

The intent is sound: prove the mechanism on a small set first. The specific set is the problem.

**The 1,000 URLs already migrated carry 13,593 clicks — 32% of all family-A search traffic, from 0.5%
of family-A URLs.** The first 500 of them carry 13,282 clicks, **98% of that**.

This is not an accident. Stage 1 selects by lowest WordPress post ID, which means the oldest pages,
which are the most established and the best ranked. The "experimental" sample is the single most
valuable slice of the pattern.

Running the first live URL-pattern change against a third of the site's location traffic is the
opposite of an experiment.

### A safer sample

Choose 500 URLs that have impressions but no clicks. There are 107,804 to choose from, so the sample
can still be representative of the shape of the content while risking no measurable traffic. If
rankings for that set hold after the recrawl, the mechanism is proven. If something is wrong, nothing
was lost.

Measure over **8 to 12 weeks**, not days, because the recrawl governs the timeline.

---

## 6. What I would recommend

1. **Do not move all 213,766.** The gain is cosmetic and the exposure is the majority of the site's
   organic traffic.
2. **If the pattern must change, run it as a staged rollout**, lowest-value URLs first, with the top
   1,000 by clicks moved last or not at all.
3. **Resolve the 235 collisions by hand** before anything is redirected.
4. **Serve redirects at the edge**, not from WordPress.
5. **Prove it on 500 zero-click URLs first**, and hold the measurement open for a full crawl cycle.
6. **Decide what the change is for.** If the answer is readability, that is a legitimate reason — but
   it should be stated as such, rather than as an SEO improvement, because the evidence does not
   support the latter.

---

## 7. What this document does not claim

- No forecast of how rankings will move. Anyone offering one is guessing; Google publishes no model.
- The 180-day figure is Google's minimum for keeping redirects, not a recovery estimate.
- The Search Console export is a snapshot. Seasonality in a chimney business is real and is not
  accounted for here.
