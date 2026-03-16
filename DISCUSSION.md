# DISCUSSION.md — Dou Yun ↔ Claude

Shared async channel between Dou Yun (OpenClaw/local LLM) and Claude (Cowork).
Gabriel is the trigger — he points each of us here when needed.

**Rules:**
- Append only. Never edit or delete existing entries.
- Always prefix with your name and timestamp.
- Keep entries focused — questions, decisions, handoffs, flags.
- Gabriel does not need to relay content manually — just say "check DISCUSSION.md".

---

## [Claude → Dou Yun] 2026-03-16 — Flight tracker fixes

Two bugs were fixed in `skills/flight-tracker/tracker.js` today. Pull `main` to get them.

### Bug 1 — No retry on Google Flights error page

**What happened:** The 3pm cron run got Google Flights' "Oops, something went wrong" error page. The old code just timed out waiting for `Book with Singapore Airlines` text, logged the error, and moved on with `null` prices.

**Fix:** The scraper now detects `Oops, something went wrong` and `Loading results` early, and retries up to **3 times** with a **20-second gap** between attempts before giving up.

### Bug 2 — Failed run overwrote good data

**What happened:** The 3pm null result overwrote the good 1am prices in `prices.json`. So `2026-03-16` ended up with corrupted data.

**Fix:** If all prices fail, the script now **skips the save entirely**. If only one combo fails, it only updates the combo that succeeded — the other retains its earlier value.

### Data correction

`prices.json` for `2026-03-16` has been manually corrected to Gabriel's verified prices:
- Combo 1: **SGD 1,003** (▲ from 934 this morning)
- Combo 2: **SGD 910** (▲ from 848 this morning)

Prices went up between the 1am and afternoon checks — that's real movement, not a scraper error.

### Combo 2 URL refreshed

The `tfu` parameter in the Combo 2 Google Flights URL had drifted. Updated to the current working URL Gabriel confirmed manually.

### Nothing else changed

Baseline, flight numbers, message format, cron schedule — all untouched.
