"""
sheets_reader.py
Reads spend and revenue data from the tracking Google Sheet.
Used for:
  - Daily: Google+Agency and Taboola spend
  - Backfill: IO CTO, IO Co-Reg, Zenect (since scrapers can't pull historical dates)

Sheet columns (May 2026 tab):
  A=Date, D=Cost Google, E=Cost+Agency, G=Cost(Taboola)
  I=Cost(Meta), K=Rev(Interactive CTO), L=Rev(TMG/IMS),
  M=Rev(AfterOffers), N=Rev(Zenect/Betwext), O=Rev(Interactive/Co-Reg)
"""

import csv
import io
from datetime import datetime, timedelta


def parse_currency(val):
    if not val:
        return 0.0
    try:
        return float(str(val).replace("$","").replace(",","").strip())
    except ValueError:
        return 0.0


def pull_sheet_data(target_date=None, sheet_content=None):
    """
    Pull all relevant columns from the sheet for target_date.
    Returns dict with spend and revenue fields.
    """
    if not target_date:
        target_date = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")

    result = {
        "date":          target_date,
        "total_leads":   0,
        "leads_google":  0,
        "leads_taboola": 0,
        "leads_meta":    0,
        "google_spend":  0.0,
        "taboola_spend": 0.0,
        "io_cto":        0.0,
        "io_coreg":      0.0,
        "zenect":        0.0,
        "ims":           0.0,
        "afteroffers":   0.0,
        "rpl":           0.0,
        "cpl":           0.0,
        "status":        "not_found",
    }

    if not sheet_content:
        print("  Sheets: No content provided")
        return result

    dt = datetime.strptime(target_date, "%Y-%m-%d")
    m, d, y = dt.month, dt.day, dt.year
    date_patterns = [
        f"{m}/{d}/{y}",
        f"{m:02d}/{d:02d}/{y}",
        f"{m}/{d}/{str(y)[2:]}",
    ]

    try:
        reader = csv.reader(io.StringIO(sheet_content))
        rows = list(reader)

        # Find header row and map columns
        col = {
            "total_leads": 1, "leads_google": 2, "leads_taboola": 5, "leads_meta": 7,
            "google": 4, "taboola": 6,
            "io_cto": 10, "ims": 11, "afteroffers": 12,
            "zenect": 13, "io_coreg": 14,
            "rpl": 17, "cpl": 18,
        }

        for i, row in enumerate(rows):
            rl = [c.lower().strip() for c in row]
            if any("cost + agency" in c for c in rl):
                for j, h in enumerate(rl):
                    if "total leads" in h:                             col["total_leads"] = j
                    elif "leads google" in h or h == "leads google":   col["leads_google"]  = j
                    elif "leads (taboola)" in h or "leads taboola" in h: col["leads_taboola"] = j
                    elif "leads meta" in h or h == "leads meta":       col["leads_meta"]    = j
                    elif "cost + agency" in h:                          col["google"]      = j
                    elif "cost (taboola)" in h:                         col["taboola"]     = j
                    elif "interactive cto" in h:                        col["io_cto"]      = j
                    elif "tmg" in h or (("ims" in h or "rev (t" in h) and "interactive" not in h): col["ims"] = j
                    elif "afteroffers" in h or "after offers" in h:     col["afteroffers"] = j
                    elif "betwext" in h or "zenect" in h:               col["zenect"]      = j
                    elif "rev (interactive)" in h and "cto" not in h:   col["io_coreg"]    = j
                    elif h == "rpl":                                     col["rpl"]         = j
                    elif h == "cpl":                                     col["cpl"]         = j
                print(f"  Sheets: Headers mapped: {col}")
                break

        # Find yesterday's row
        for row in rows:
            if not row or not row[0]:
                continue
            date_cell = row[0].strip().strip('"')
            if any(p in date_cell for p in date_patterns):
                print(f"  Sheets: Found row → {row[:11]}")
                def get(key):
                    i = col.get(key, -1)
                    return parse_currency(row[i]) if 0 <= i < len(row) else 0.0

                result.update({
                    "total_leads":   int(parse_currency(row[col["total_leads"]])) if col["total_leads"] < len(row) else 0,
                    "leads_google":  int(parse_currency(row[col["leads_google"]])) if col.get("leads_google", -1) < len(row) and col.get("leads_google", -1) >= 0 else 0,
                    "leads_taboola": int(parse_currency(row[col["leads_taboola"]])) if col.get("leads_taboola", -1) < len(row) and col.get("leads_taboola", -1) >= 0 else 0,
                    "leads_meta":    int(parse_currency(row[col["leads_meta"]])) if col.get("leads_meta", -1) < len(row) and col.get("leads_meta", -1) >= 0 else 0,
                    "google_spend":  get("google"),
                    "taboola_spend": get("taboola"),
                    "io_cto":        get("io_cto"),
                    "io_coreg":      get("io_coreg"),
                    "zenect":        get("zenect"),
                    "ims":           get("ims"),
                    "afteroffers":   get("afteroffers"),
                    "rpl":           get("rpl"),
                    "cpl":           get("cpl"),
                    "status":        "ok",
                })
                break

    except Exception as e:
        print(f"  Sheets: Parse error: {e}")
        import traceback; traceback.print_exc()

    print(f"  Sheets: Google+Agency=${result['google_spend']:.2f} Taboola=${result['taboola_spend']:.2f} "
          f"IO_CTO=${result['io_cto']:.2f} CoReg=${result['io_coreg']:.2f} Zenect=${result['zenect']:.2f}")
    return result


# Backwards-compatible alias
def pull_google_taboola_spend(target_date=None, sheet_content=None):
    return pull_sheet_data(target_date=target_date, sheet_content=sheet_content)
