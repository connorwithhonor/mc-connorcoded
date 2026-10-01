# Cloudflare control-room migration

The shell-only preview is live at `https://mc-control-room.connormacivor.workers.dev`.

## Current boundary

- Static control-room assets are served by the `mc-control-room` Worker.
- `/api/control-status` returns `401` until Cloudflare Access and private storage are configured.
- No business snapshot, credentials, or Netlify data was uploaded to Cloudflare.
- Netlify remains the rollback path while this migration is staged.

## Next migration gates

1. Configure Cloudflare Access for the chosen hostname and Connor's email.
2. Add private storage for the selected read model (KV for the current snapshot, or D1 if history/querying is needed).
3. Port the read-only status function and verify anonymous, owner, and unauthorized behavior.
4. Attach a Cloudflare-managed hostname only after DNS ownership is deliberately moved; `connorcoded.com` is currently delegated to NS1, not Cloudflare.
5. Cut over only after the Worker preview, private feed, and rollback path pass end-to-end checks.
