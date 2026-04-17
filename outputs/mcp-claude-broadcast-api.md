# MCP Claude Broadcast API

Programmatic write path for the BROADCAST FROM CLAUDE feed on mc.connorcoded.com.
Paste this entire file into your Cowork Claude session. It has everything needed to post directly.

---

## Endpoint URL

```
https://mc.connorcoded.com/api/claude-broadcast
```

The same URL serves both reads and writes. Method determines behavior:

- `GET`  → returns the full message feed (public, no auth)
- `POST` → appends a new broadcast (requires bearer token)

---

## HTTP Method

- **POST** to write a new broadcast
- **GET** to read the current feed
- **OPTIONS** handled for CORS preflight (browser-initiated requests only)

---

## Auth header (name + format)

- Header name: `Authorization`
- Format:      `Bearer <CLAUDE_BROADCAST_TOKEN>`
- Token lives in Netlify env var `CLAUDE_BROADCAST_TOKEN` (project: mc-connor, site_id 12ce5161-0aa3-4a0f-bffd-c46e9f4da7cf)
- GET requests are unauthenticated (the dashboard polls this from the browser every 60 seconds)

---

## Payload schema (JSON)

POST body:

```json
{
  "body":      "string, required, the message content (markdown-style newlines \\n supported)",
  "lane":      "string | null, optional, default null",
  "timestamp": "ISO 8601 string, optional, default = server time at write"
}
```

### Field rules

| field     | type             | required | notes |
|-----------|------------------|----------|-------|
| body      | string           | yes      | Trimmed. Empty string rejected with 400. Use `\n` for newlines (these render correctly in the modal). |
| lane      | string OR null   | no       | `null` (or omitted) → posts to the top-level BROADCAST FROM CLAUDE feed → **red light blinks**. A lane key → posts as a lane-specific Claude note inside that lane's modal. Known lane keys: `honorelevate`, `scv123`, `tla`, `soa-seventeenk`, `delvin-saas`, `content`, `sync`, `zoneshift`, `shosafe`, `withheart`, `daily-download`, `opp-delvin-saas`. |
| timestamp | ISO 8601 string  | no       | Must be unique across the whole feed (used as the read-state key in localStorage). If omitted, server generates `new Date().toISOString()`. Duplicates return 409. |

### Response shape

On success (HTTP 201):

```json
{
  "ok":      true,
  "message": { "timestamp": "...", "lane": null, "body": "..." },
  "count":   10,
  "updated": "2026-04-17T17:12:04.221Z"
}
```

Errors:

- `400` — invalid JSON body, or `body` missing/empty
- `401` — missing or wrong bearer token
- `405` — method other than GET/POST/OPTIONS
- `409` — duplicate timestamp
- `500` — `CLAUDE_BROADCAST_TOKEN` env var not set on Netlify

---

## Working cURL example

Broadcast (red light blinks):

```bash
curl -X POST https://mc.connorcoded.com/api/claude-broadcast \
  -H "Authorization: Bearer $CLAUDE_BROADCAST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Session summary:\n\nShipped the Claude Broadcast API. Cowork Claude can now post directly.\n\nCompleted: endpoint live, token set, dashboard wired.\n\nRisks: none.\n\nNext move: have Cowork paste this doc into its system prompt."
  }'
```

Lane-scoped note (no red light, shows in the lane's Claude tab):

```bash
curl -X POST https://mc.connorcoded.com/api/claude-broadcast \
  -H "Authorization: Bearer $CLAUDE_BROADCAST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "lane": "honorelevate",
    "body": "First 20 HVAC prospects scraped. Trojan horse template staged. Ready to send."
  }'
```

Read the feed (no auth):

```bash
curl https://mc.connorcoded.com/api/claude-broadcast
```

---

## Working fetch() example for browser use

```js
async function broadcastToMC({ body, lane = null, timestamp }) {
  const res = await fetch('https://mc.connorcoded.com/api/claude-broadcast', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLAUDE_BROADCAST_TOKEN}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ body, lane, timestamp }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`broadcast failed ${res.status}: ${err.error || res.statusText}`);
  }
  return res.json();
}

await broadcastToMC({
  body: [
    'Daily Download 105 shipped.',
    '',
    'Teleprompter ~2,900 words.',
    'Full social package staged.',
    'Memory tile preview rendered.',
    '',
    'Next move: record, cut, publish.'
  ].join('\n'),
});
```

---

## Storage location (where the message lands)

**Netlify Blobs**, store name `claude-broadcast`, key `messages`.

- The state object is `{ updated: ISO, messages: [...] }` — same shape as the legacy `/claude-messages.json`.
- On first read, if the Blobs store is empty, the function seeds itself from the repo's static `claude-messages.json`. After that, Blobs is the source of truth and the static file is ignored.
- Blobs survives deploys. No git commits are triggered by posts.
- Frontend (`index.html` → `loadClaudeMessages`) now fetches from `/api/claude-broadcast` every 60 seconds, with a fallback to `/claude-messages.json` if the function is unreachable.

### How it triggers the red light

The frontend filters `messages` where `lane === null` into the broadcast feed. New broadcasts that haven't been checked in the UI are flagged against `localStorage[mcp_broadcast_read_v4]`. When `unread.length > 0`, the CLAUDE pill turns red and pulses. So: **post with `lane: null` (or omit it) to make the red light blink.**

---

## What is already built and committed locally

Everything below is staged in the `mc-dashboard` repo working tree. Nothing is deployed. Nothing is pushed.

| File                                            | Change                                                |
|-------------------------------------------------|-------------------------------------------------------|
| `netlify/functions/claude-broadcast.mjs`        | **New.** The function itself.                         |
| `package.json`                                  | **New.** Adds `@netlify/blobs` dep.                   |
| `netlify.toml`                                  | Adds `functions = "netlify/functions"`.               |
| `index.html` (line ~1366)                       | `loadClaudeMessages` now hits `/api/claude-broadcast` with fallback to static file. |
| `outputs/mcp-claude-broadcast-api.md`           | This document.                                        |

---

## Deploy steps (Connor does these — manual deploy only per standing order)

1. **Set the token in Netlify:**
   - Netlify dashboard → site `mc-connor` → Site configuration → Environment variables → Add
   - Key: `CLAUDE_BROADCAST_TOKEN`
   - Value: a long random string (generate with `openssl rand -hex 32`)
   - Scope: Functions (at minimum)
   - Save the value somewhere safe — you'll paste it into Cowork Claude as the bearer token.

2. **Install the dep locally so the function bundles correctly:**
   ```bash
   cd /Users/budumacbudu/Projects/mc-dashboard
   npm install
   ```

3. **Manual deploy to Netlify (your preferred method):**
   - Option A, CLI:
     ```bash
     cd /Users/budumacbudu/Projects/mc-dashboard
     netlify deploy --prod --site 12ce5161-0aa3-4a0f-bffd-c46e9f4da7cf
     ```
   - Option B, drag-and-drop: zip the repo contents, drop on the Netlify site's Deploys page.

4. **Smoke test:**
   ```bash
   curl https://mc.connorcoded.com/api/claude-broadcast
   # expect: { "updated": "...", "messages": [...] } — the seeded 6 messages

   curl -X POST https://mc.connorcoded.com/api/claude-broadcast \
     -H "Authorization: Bearer <your token>" \
     -H "Content-Type: application/json" \
     -d '{"body":"API test from Connor. If you see this on the MCP, the feed is live."}'
   ```
   Open mc.connorcoded.com. CLAUDE light should go red within 60 seconds.

5. **Commit and push to GitHub** (backup only, per your rule):
   ```bash
   cd /Users/budumacbudu/Projects/mc-dashboard
   git add netlify/functions/claude-broadcast.mjs package.json netlify.toml index.html outputs/
   git commit -m "Add Claude broadcast API: Netlify function + Blobs storage"
   git push
   ```

---

## Paste into Cowork Claude system prompt

Here's a minimal system-prompt block you can drop into Cowork. After it, Cowork Claude has everything needed to post directly.

```
You can post updates to Connor's Master Control Program dashboard (mc.connorcoded.com).

To broadcast (red light blinks on Connor's MCP):
POST https://mc.connorcoded.com/api/claude-broadcast
Headers:
  Authorization: Bearer <CLAUDE_BROADCAST_TOKEN from secret store>
  Content-Type:  application/json
Body:
  { "body": "your message", "lane": null }

To post to a specific lane (no red light, shows in that lane's Claude tab):
Same endpoint, same auth. Body: { "body": "...", "lane": "honorelevate" }
Lane keys: honorelevate, scv123, tla, soa-seventeenk, delvin-saas, content, sync, zoneshift, shosafe, withheart, daily-download, opp-delvin-saas.

At the end of every session, broadcast:
- 1-2 sentence summary
- Completed tasks (bulleted with \n)
- Flagged risks (if any)
- Next move (the ONE thing)
- New opportunities (if any, route to lane = "opp-delvin-saas" or similar)

Keep messages under ~2000 chars. Use \n for newlines. No em dashes.
```

---

## Troubleshooting

- **401 unauthorized**: Check `CLAUDE_BROADCAST_TOKEN` matches in both Netlify env and the Authorization header. Regenerate if you suspect leak.
- **500 misconfigured**: The env var isn't set on the deployed site. Re-check step 1 above.
- **Message posts but red light doesn't blink**: You posted with a `lane` value. Remove `lane` or set it to `null` to hit the top-level broadcast feed.
- **Red light blinks but message doesn't appear**: Browser cache. Hard refresh the dashboard (Cmd+Shift+R). The fetch already uses `cache: no-store` so this shouldn't happen, but it's the first thing to check.
- **Function 404 after deploy**: Confirm `functions = "netlify/functions"` in `netlify.toml` and that `netlify deploy --prod` output shows the function was uploaded.
- **Want to see raw state**: `curl https://mc.connorcoded.com/api/claude-broadcast` — full JSON dump, no auth needed.
