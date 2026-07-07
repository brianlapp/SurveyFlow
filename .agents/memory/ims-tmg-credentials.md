---
name: IMS/TMG credential separation
description: Which credentials work for which TMG system, and the login-debugging lesson from the MMM pipeline
---

# Two different TMG systems, two different credentials

- `TMG_REVENUE_USER` / `TMG_REVENUE_PASSWORD` are **Basic-auth API credentials** for `services.tmginteractive.com/amsrevapi` (used by an existing Express route). They are NOT valid logins for the admin portal.
- The IMS scraper logs into the **admin portal** `admin.tmginteractive.com/syslogin.aspx` and must use `IMS_USERNAME` / `IMS_PASSWORD` (portal login from Mike's credentials file).

**Why:** The pipeline config originally fell back IMS_USERNAME→TMG_REVENUE_USER. That fallback silently sent API creds to the portal login, producing `syslogin.aspx?ex=Y` ("Login Failed") on every automated run. Days were lost chasing bot-detection/IP-block/lockout theories that were all wrong.

**How to apply:**
- Never treat the two credential sets as interchangeable. If IMS login fails with `ex=Y`, it means wrong username/password — not bot blocking, not IP blocking, not session lockout.
- Portal enforces one active session per account; always log out explicitly in a finally block.
- Scraper "Logged in" messages must be verified (check post-login URL), never printed unconditionally — the original code's unconditional print masked total auth failure across multiple runs.
