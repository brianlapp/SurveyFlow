# Memory Index

- [MMM Ad Revenue pipeline](mmm-pipeline.md) — day-total spend must use raw mmm_ad_spend (not summed allocated perf rows) + mmm_daily_spend; adjusted_revenue already includes gross sources, never add mmm_source_daily twice.
- [IMS/TMG credential separation](ims-tmg-credentials.md) — portal login (IMS_USERNAME) vs Basic-auth API creds (TMG_REVENUE_*) are different systems; ex=Y means wrong creds, not bot blocking.
