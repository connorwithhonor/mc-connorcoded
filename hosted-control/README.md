# Private control hub preview

Owner: MacV Mac. Existing workstream: t16 remoteAccessPreparation. This is an additive, read-only preview of the owned control rooms, not a new task ledger.

## What is implemented
- Three current focus priorities, business filter, production progress, email/calling configuration reads, recorded plans, task owners and last-observed workers.
- Source ages remain attached to their evidence. Export time never makes HE reads fresh. Missing ranking, attribution and dispatch are explicit.
- A public sign-in shell contains no business snapshot. `/api/control-status` requires a verified Identity account with the server-controlled `control-owner` role and rejects all writes. Snapshot lives in the private site-scoped `control-room-snapshots/current` Blob only after access verification.
- A selected-field exporter excludes local CSRF tokens, account location identifiers, raw provider records, source paths, raw logs and media paths. The canonical ledger is never changed by export.
- The local review server binds only 127.0.0.1 and labels its test access. It is excluded from the hosted function and static directories.

## Local review
Run from repo root:

```sh
npm ci
node --test hosted-control/tests/*.test.mjs
node hosted-control/scripts/build.mjs
mkdir -p hosted-control/private
node hosted-control/scripts/export.mjs /Users/macv/dev/macv-deck hosted-control/private/snapshot.json
node hosted-control/scripts/review-server.mjs hosted-control/private/snapshot.json --review
```

Open http://127.0.0.1:7881. Use `--locked` to inspect the signed-out shell. Local review is not proof that Netlify sign-in works.

## Verified preview deployment procedure

```sh
netlify deploy --no-build --dir hosted-control/public --functions hosted-control/functions --site 12ce5161-0aa3-4a0f-bffd-c46e9f4da7cf --message 'Private control shell, no snapshot uploaded' --json
```

Do not add `--prod`. The isolated preview intentionally excludes the existing cockpit and its broadcast function. A production merge must preserve the September14 deployment, not upload this old repository's root index.html.

## Remaining access and production steps
1. Connor confirms new private access. Enable Identity on mc-connor without a paid upgrade, set registration Invite only, keep autoconfirm off, invite only Connor, and assign `control-owner` via the administrator UI. Connor sets his own password. Do not let profile metadata confer this role.
2. Verify signed-out, owner and non-owner behavior on the deployed preview. No data upload before that check. Recovery/invite callbacks are implemented but not live-verified yet.
3. Use the existing authenticated Netlify route to upload the selected read model, then verify signed-in counts and unauthorized rejection. No credentials on the client or moved from fleet machines.
4. Design an outward-only scheduled snapshot publisher with authenticated storage and observed receipts. No schedule or publisher has been activated by this release; the preview is not continuously live.
5. Recover all existing deployed source. Nine public files were recovered and production HTML matches its immutable baseline; deployed netlify.toml, claude.md and claude-broadcast.mjs remain un-recovered. Browser archive actions produced no accessible local file. Preserve the current production deploy ID6aa81533dbe7b71ee9cd4dc2. Do not overwrite its broadcast route with the older repository version.
6. Show the exact merged production diff and obtain the existing required production go. Roll back by republishing the preserved deployment if verification fails.
7. Connect Claude's actual ranking feed and verify the existing authenticated Mesh with harmless jobs before enabling any remote recovery, scheduling or agent dispatch. These are separate from the read-only access gate. Do not claim that requests reach an open Codex conversation automatically.

No DNS, Identity, permissions, credentials, paid service, send/call, ledger action, production site or public machine exposure was changed by the preview.

## September 26 access setup and focused overview
Connor said “go for it” after the explicit invite-only proposal. Identity is now enabled, Invite only, email confirmation required; connormacivor@gmail.com is the sole invited user with the server-controlled control-owner role. No password was entered by the agent. No business data uploaded. The default email points to the preserved old cockpit; use “First visit? Set up your invitation” in the new preview to paste that same-project link locally and set a password. Tokens are never logged or fetched from arbitrary URLs. Owner login remains unverified until Connor completes it.

The local review now reads existing deck records on each refresh when launched with an additional `/Users/macv/dev/macv-deck` argument. The top row shows blocked stages, historical failed checks and open operations; working local controls are linked only after the local service responds. Recommended focus cards have expandable outcomes/proof. This is still read-only hosting; remote writes and recurring hosted uploads remain unconnected.

## Lead Inbox data contract

The Lead Inbox is a private, read-only view of an additive `leadInbox` field in the selected snapshot. It displays source-health records and normalized incoming events only after an authenticated publisher writes the snapshot. An empty or missing feed is visibly `Not connected`; it is never treated as proof that no one contacted Connor.

Each source record carries its name, type, current state, last observed time, short evidence detail and next check. Each event carries a stable event ID, source and business, timestamp, event type, supplied contact fields, relevant message, likely intent, review status and an optional HTTPS CRM contact URL. The viewer makes no changes to Gmail, HonorElevate, Formspree, Cloudflare, a contact record or an event status.

The current Cloudflare lead relay does not retain an event history. The dashboard now exposes a dedicated publisher endpoint at `POST /api/lead-inbox/ingest`. It accepts a normalized batch only when its `Authorization: Bearer` value equals the server-only `LEAD_INBOX_INGEST_KEY` environment variable. It stores source health and a deduplicated bounded event history in a separate site-scoped Blob; it returns counts only and has no CORS policy. Do not place the secret, raw webhooks, credentials, or full provider records in the browser or Git.

This is code only until a publisher receives the secret through an approved server-side configuration path, publishes one bounded normalized batch, and the signed-in owner verifies the resulting source and event in the private Control Room. The Gmail backup channel’s current health is `blocked / unverified`; do not configure it as healthy until the Apps Script failure reports and a successful check can be reconciled.
