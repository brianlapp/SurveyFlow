#!/usr/bin/env bash
set -uo pipefail
cd /home/runner/workspace/mmm-pipeline-package
# Load [userenv.shared] secrets from .replit into the environment
eval "$(python3 - <<'PY'
import shlex
inblk=False
for ln in open('/home/runner/workspace/.replit').read().splitlines():
    s=ln.strip()
    if s.startswith('['):
        inblk = (s=='[userenv.shared]'); continue
    if inblk and '=' in s and not s.startswith('#'):
        k,v=s.split('=',1)
        v=v.strip().strip('"').strip("'")
        print(f'export {k.strip()}={shlex.quote(v)}')
PY
)"
# Two-DB trap fix: force the report's Neon, not the workspace helium DB
export DATABASE_URL="$NEON_DATABASE_URL"
export PYTHONPATH="$(pwd)"
echo "DB target host: $(python3 -c 'import os;print(os.environ["DATABASE_URL"].split("@")[-1].split("/")[0])')"
echo "Creds loaded: IMS=${IMS_USERNAME:+yes} AO=${AFTEROFFERS_USERNAME:+yes} IO=${INTERACTIVE_OFFERS_USERNAME:+yes} ZEN=${ZENECT_USERNAME:+yes}"
for D in 2026-07-04 2026-07-05 2026-07-07; do
  echo "===================== BACKFILL $D  $(date -u) ====================="
  python3 pipeline/run_daily.py "$D"
  echo "===================== END $D rc=$? ====================="
  sleep 15
done
echo "ALL DONE $(date -u)"
