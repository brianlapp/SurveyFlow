"""
debug_orphans.py
Check what compound keys exist in meta_spend vs IMS/AO for the problem keys.
Run from: python pipeline\debug_orphans.py
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from pipeline.database import get_connection

conn = get_connection()
c = conn.cursor()

print("=== meta_spend: metav2 and Tab keys (last 7 days) ===")
c.execute("""
    SELECT date, compound_key, SUM(spend) as spend
    FROM meta_spend
    WHERE (compound_key LIKE 'metav2%' OR compound_key LIKE 'meta-Tab%')
    AND date >= date('now', '-7 days')
    GROUP BY date, compound_key
    ORDER BY date DESC, spend DESC
""")
rows = c.fetchall()
if rows:
    for r in rows:
        print(f"  {r['date']}  {r['compound_key']:<40}  spend=${r['spend']:.2f}")
else:
    print("  NONE FOUND — these ads are not in meta_spend at all")

print("\n=== ims_revenue: metav2 and Tab keys (last 7 days) ===")
c.execute("""
    SELECT date, compound_key, SUM(revenue) as revenue, SUM(impressions) as imps
    FROM ims_revenue
    WHERE (compound_key LIKE 'metav2%' OR compound_key LIKE 'meta-Tab%')
    AND date >= date('now', '-7 days')
    GROUP BY date, compound_key
    ORDER BY date DESC, revenue DESC
""")
rows = c.fetchall()
for r in rows:
    print(f"  {r['date']}  {r['compound_key']:<40}  rev=${r['revenue']:.2f}  imps={r['imps']}")

print("\n=== ao_revenue: any remaining -0429 keys (last 7 days) ===")
c.execute("""
    SELECT date, compound_key, SUM(revenue) as revenue
    FROM ao_revenue
    WHERE compound_key LIKE '%-0429'
    AND date >= date('now', '-7 days')
    GROUP BY date, compound_key
    ORDER BY date DESC
""")
rows = c.fetchall()
if rows:
    for r in rows:
        print(f"  {r['date']}  {r['compound_key']:<40}  rev=${r['revenue']:.2f}")
else:
    print("  NONE — no -0429 keys in ao_revenue")

print("\n=== All distinct compound keys in meta_spend (last 3 days) ===")
c.execute("""
    SELECT DISTINCT compound_key
    FROM meta_spend
    WHERE date >= date('now', '-3 days')
    ORDER BY compound_key
""")
for r in c.fetchall():
    print(f"  {r['compound_key']}")

conn.close()
