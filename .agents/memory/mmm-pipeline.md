---
name: MMM Ad Revenue pipeline
description: Non-obvious spend/revenue double-count trap and data-flow contract between the Python pipeline and the Node dashboard reads.
---

# MMM Ad Revenue pipeline — spend/revenue aggregation contract

The Python pipeline (`mmm-pipeline-package`) writes several Postgres tables; the
Node dashboard (`server/storage.ts` `getMmm*`) only reads them. The join is on
`compound_key` (affId-subId) with impression-based fallback allocation.

## The double-count trap (day-level totals)
`export_data` in `pipeline/database.py` ALLOCATES sheet Google/Taboola spend into
per-creative rows (`assign_platform_spend_to_rows`) AND also stores that same
sheet spend in `mmm_daily_spend`. It similarly bakes allocated gross source
revenue (Interactive Offers + Zenect) into each row's `adjusted_revenue`, while
the same gross also lives in `mmm_source_daily`.

**Rule (spend):** when computing DAY TOTALS in Node, do NOT sum
`mmm_performance_daily.spend` and then add `mmm_daily_spend` — that double-counts
allocated dollars. Instead base ad spend on the RAW `mmm_ad_spend` table (Meta +
creative-level Google only; never contains allocated sheet spend) plus the
precedence-adjusted `mmm_daily_spend`.

**Rule (revenue):** `combined_revenue` = `SUM(total_revenue)` (attributed,
excludes gross) + `mmm_source_daily` (added exactly once). At the DAY level,
`adjusted_revenue` equals `combined_revenue` by construction, so DERIVE it from
combined_revenue — do NOT sum `mmm_performance_daily.adjusted_revenue`. Summing
the per-row allocated values silently DROPS the whole gross_total on any day the
allocation didn't fire (allocation divides gross by total IMS impressions, so if
IMS impressions are zero — IMS creds/scrape absent, a supported state — no gross
gets baked into any row). And never ALSO add `mmm_source_daily` on top of a
perf-row sum, or gross is double-counted.

**Why:** allocation is all-or-nothing per platform and only happens when matching
zero-spend creative rows exist, so the overlap is data-dependent and silent until
real Taboola/IO/Zenect data flows.

**Why not fix it in Python (zero out mmm_daily_spend):** `export_data` reads
`mmm_daily_spend` back via `get_daily_spend` on intraday runs (sheets_result is
None), so zeroing allocated amounts there loses the spend on the next intraday
rebuild (Taboola has no ad-spend puller, so it exists ONLY in mmm_daily_spend).

## Other durable facts
- Per-creative table (`getMmmCreativePerformance`) SHOULD use
  `mmm_performance_daily.spend` (with allocation) so Taboola/Google creatives show
  ROAS — the double-count only matters when summing across creatives for a day.
- All pipeline dates are America/New_York; align any Node date-window cutoffs to
  that TZ, not UTC, or day boundaries drift by one during evening EST hours.
- Scrapers skip with 0 rows when their credentials are missing — empty dashboard
  is expected, not a bug.
