import sys
sys.path.insert(0, '.')
from pipeline.database import get_connection

conn = get_connection()
c = conn.cursor()

print('=== meta_spend June 15 ===')
c.execute("SELECT compound_key, spend FROM meta_spend WHERE date='2026-06-15' ORDER BY spend DESC")
for r in c.fetchall():
    print(f'  {r[0]:<40} ${r[1]:.2f}')

print('\n=== ims_revenue June 15 ===')
c.execute("SELECT compound_key, revenue, impressions FROM ims_revenue WHERE date='2026-06-15' ORDER BY revenue DESC")
for r in c.fetchall():
    print(f'  {r[0]:<40} ${r[1]:.2f}  imps={r[2]}')

print('\n=== ao_revenue June 15 ===')
c.execute("SELECT compound_key, revenue FROM ao_revenue WHERE date='2026-06-15' ORDER BY revenue DESC")
for r in c.fetchall():
    print(f'  {r[0]:<40} ${r[1]:.2f}')

conn.close()
