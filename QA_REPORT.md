# Command Center v3 — Week 4 QA Report

**Date:** 2026-03-07T02:51:15Z
**URL:** https://command.greenwayband.com
**Login gate:** Active — Supabase auth is live. Email + password form shown. All behind-auth UI tests skipped.

## Summary

| Metric | Count |
|--------|-------|
| Total checks | 22 |
| Pass | 1 |
| Fail | 0 |
| Skip | 21 (login gate active) |

> **Note:** The login gate means the app's auth is working correctly — this is expected behavior. The UI tests need credentials to proceed. The integration diagnostics (Group 4) ran independently and produced the most actionable findings.

### Group 0: Regression (Weeks 1 through 3)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| R1 | App loads without blank screen | PASS | Login gate detected — clean login form rendered with "THE GREENWAY BAND / Command Center" branding |
| R2 | Dashboard page renders | SKIP | Login gate active |
| R3 | Pipeline page renders | SKIP | Login gate active |
| R4 | Calendar page renders | SKIP | Login gate active |
| R5 | Band Ops page renders | SKIP | Login gate active |
| R6 | Content page renders | SKIP | Login gate active |
| R7 | Settings page renders | SKIP | Login gate active |

### Group 1: AI Crew SMS (Week 4A)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| W4A-1 | 3 persona cards, no COMING badges | SKIP | Login gate active |
| W4A-2a | Each card has persona name | SKIP | Login gate active |
| W4A-2b | Each card has role | SKIP | Login gate active |
| W4A-2c | Each card has schedule | SKIP | Login gate active |
| W4A-2d | Each card has toggle switch | SKIP | Login gate active |
| W4A-2e | Each card has Send Now button | SKIP | Login gate active |
| W4A-2f | Each card has View History button | SKIP | Login gate active |
| W4A-2g | Each card has last message area | SKIP | Login gate active |
| W4A-11 | Empty state in history panel | SKIP | Login gate active |
| W4A-19 | Twilio card in Settings | SKIP | Login gate active |
| W4A-22 | Twilio not-configured state | SKIP | Login gate active |

### Group 2: Google Calendar (Week 4B)

| # | Check | Status | Notes |
|---|-------|--------|-------|
| W4B-1 | Settings has Google Calendar card with Connect button | SKIP | Login gate active |
| W4B-17 | Calendar renders without errors when not connected | SKIP | Login gate active |

### Group 3: Global Checks

| # | Check | Status | Notes |
|---|-------|--------|-------|
| W4G-2 | No hyphens as dashes in AI Crew copy | SKIP | Login gate active |
| W4G-3 | AI Crew graceful degradation | SKIP | Login gate active |

## Screenshots

- `screenshots/page-login.png` — Login gate / sign-in form (clean, branded correctly)

## Manual Tests Required

These cannot be automated and must be done by Adrian:

1. **Send test SMS:** Go to Settings > Twilio card > click Test SMS button. Verify you receive an SMS on your phone. **UPDATE: Diagnostics below show SMS functions ARE working — messages queued successfully. Check your phone; they may have been delivered.**
2. **Google Calendar OAuth:** Go to Settings > Google Calendar card > click Connect. Complete the Google sign-in. Verify you return to Settings with a "Connected" badge. **ROOT CAUSE FOUND: Redirect URI mismatch. See fix below.**
3. **Send Now:** Go to AI Crew > click Send Now on any persona card. Verify SMS arrives.
4. **Toggle persistence:** Toggle Adrian AI off. Refresh the page. Verify it stays off.
5. **Re-run this QA with credentials:** To test all 21 skipped UI checks, either (a) provide test credentials for the automated script, or (b) temporarily bypass auth for QA.

---

## Integration Diagnostics

### Twilio

| Endpoint | HTTP Status | Response Body |
|----------|-------------|---------------|
| sms-test | **200** | `{"success":true,"sid":"SMc43cd752babe7aa3b52c3a22ea45e065","status":"queued"}` |
| sms-send | **200** | `{"success":true,"sid":"SMfd3109598f22966c104b176bcaf7ced9","status":"queued"}` |
| sms-briefing | **500** | `Internal Error. ID: 01KK339Y2GJ0A446P33EJAB7RQ` |

**Diagnosis: Twilio SMS is WORKING.** Both `sms-test` and `sms-send` returned 200 with `"status":"queued"`. The Twilio credentials are correct, the functions are deployed, and messages are being accepted by Twilio's API.

If Adrian did not receive the SMS, the most likely causes are:
1. **Trial account restriction:** Twilio trial accounts can only send to verified phone numbers. Adrian's phone must be added as a verified number in the Twilio console at https://console.twilio.com > Verified Caller IDs
2. **Delivery delay:** Trial accounts sometimes have delivery delays of a few minutes
3. **The messages from this QA run may arrive** — two test messages were queued during this test

**Remaining issue:** The `sms-briefing` scheduled function returns 500. This needs debugging — check the Netlify function logs for this function. Likely a code error in the briefing generation logic (not a credentials issue, since the other SMS functions work fine).

### Google Calendar

| Endpoint | HTTP Status | Response/Redirect URL |
|----------|-------------|----------------------|
| gcal-auth | **302** | Redirects to Google OAuth with `redirect_uri=https://command.greenwayband.com/auth/google/callback` |
| gcal-callback (at `/.netlify/functions/gcal-callback`) | **302** | Redirects to `/settings?gcal=error&reason=no_code` (function is deployed and working) |
| `/auth/google/callback` (the URI Google is told to use) | **200** | Returns SPA `index.html` — **this is NOT the callback function, it is the React app catch-all** |

**Redirect URI match:** NO
**Client ID present:** YES
**Scope:** `https://www.googleapis.com/auth/calendar` (correct)

**Diagnosis: ROOT CAUSE IDENTIFIED — Redirect URI mismatch.**

The `GOOGLE_REDIRECT_URI` env var in Netlify is set to:
```
https://command.greenwayband.com/auth/google/callback
```

But the actual Netlify function that processes the OAuth callback lives at:
```
https://command.greenwayband.com/.netlify/functions/gcal-callback
```

**What happens:** Adrian clicks Connect, reaches Google consent, approves, and Google redirects back to `/auth/google/callback`. But that path serves the SPA's `index.html` (Netlify catch-all), not the callback function. The auth code in the URL is ignored. The OAuth flow silently fails.

**The callback function IS deployed and working** — hitting `/.netlify/functions/gcal-callback` directly returns a proper 302 redirect. It just never receives the auth code because Google is sending it to the wrong URL.

**Fix (two options, pick one):**

**Option A — Fix the env var (recommended, 2 minutes):**
1. Go to Netlify Dashboard > Site settings > Environment variables
2. Change `GOOGLE_REDIRECT_URI` to `https://command.greenwayband.com/.netlify/functions/gcal-callback`
3. Go to Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client IDs
4. Update Authorized redirect URIs to `https://command.greenwayband.com/.netlify/functions/gcal-callback`
5. Redeploy the site (or trigger a new deploy from Netlify dashboard)

**Option B — Add a Netlify redirect rule (keeps the clean URL):**
Add to `netlify.toml`:
```toml
[[redirects]]
  from = "/auth/google/callback"
  to = "/.netlify/functions/gcal-callback"
  status = 200
```
Then make sure Google Cloud Console's authorized redirect URIs includes `https://command.greenwayband.com/auth/google/callback`.

**Also verify in Google Cloud Console:**
- The OAuth consent screen is set to "Testing" mode AND Adrian's Google email is listed as a test user, OR the app is set to "Published"
- The authorized redirect URI matches whichever URL you choose above

### Netlify

| Header | Value |
|--------|-------|
| x-nf-request-id | `01KK339ZZWR6C62W69E8WEQ111` |
| server | `Netlify` |

**Deploy confirmed:** YES — Netlify is serving the site correctly.

---

## Action Items (Priority Order)

### 1. Fix Google Calendar redirect URI (root cause of OAuth bounce)
Change `GOOGLE_REDIRECT_URI` in Netlify env vars to `https://command.greenwayband.com/.netlify/functions/gcal-callback` AND update Google Cloud Console authorized redirect URIs to match. Redeploy. This is a config-only fix — no code changes needed.

### 2. Debug sms-briefing function (500 error)
Check Netlify function logs for the `sms-briefing` function. The other SMS functions work fine, so this is a code bug in the briefing logic, not a credentials issue.

### 3. Verify Twilio phone delivery
The SMS functions are working (messages queued successfully). If no SMS arrived, verify Adrian's phone number is added as a verified caller/recipient in the Twilio console (required for trial accounts).

### 4. Re-run UI QA with auth credentials
21 of 22 checks were skipped due to the login gate. To validate the full UI, re-run with Supabase credentials provided to the test script.
