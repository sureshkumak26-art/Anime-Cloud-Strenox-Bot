# Panel-side SSHX bridge contract

The Discord bot expects POST /api/v1/integrations/discord/vps/{id}/sshx (configurable with SSHX_API_PATH_TEMPLATE). It sends JSON containing discord_user_id and expects JSON containing success:true and ssh_url with an HTTPS sshx.io URL.

This route is not assumed to exist in the current Flask panel. Add it to the panel only after adapting it to the existing database and LXC execution helpers.

Required safeguards:
- Require the panel API key via server-side middleware and compare secrets in constant time.
- Check the Discord user against a server-side user-to-VPS allowlist or actual ownership/shared-user records; never trust discord_user_id alone.
- Reject unknown, suspended, stopped, or unauthorized VPSes.
- Use only the panel's existing LXC helpers and fixed SSHX commands. Do not accept arbitrary commands, container names, or URLs from Discord.
- Return only the HTTPS SSHX session URL; do not log it or return credentials/environment output.
- Rate-limit session creation and return 403 for unauthorized requests.

The browser route POST /vps/{id}/ssh uses a Flask login session, which the Discord bot does not possess. The bot cannot call it directly. The bridge must be added and tested before the SSHX button will create sessions.


# Automatic VPS creation bridge contract

The Discord bot also expects `POST /api/v1/integrations/discord/vps/create` (configurable with `VPS_CREATE_API_PATH`). Request body:
```json
{
  "discord_user_id": "Discord snowflake",
  "discord_username": "display name",
  "plan": "starter",
  "os": "ubuntu-24.04",
  "request_id": "Discord interaction ID"
}
```

The panel must not trust the plan or Discord username supplied by the bot as proof of eligibility. Authenticate `X-API-Key`, map the Discord user ID to a panel customer account, and validate account status, payment/subscription entitlement, quotas, rate limits, and free node/IP/storage capacity using server-side data. Enforce idempotency on `request_id` so a retry cannot create duplicate instances. Create the VM/container only through the existing trusted provisioning queue/agent; never execute arbitrary commands supplied by Discord.

On success return HTTP 201 and:
```json
{
  "success": true,
  "vps": {
    "id": "vm-123",
    "name": "ac-user-123",
    "ip": "203.0.113.10",
    "ssh_port": 22,
    "username": "acuser",
    "initial_password": "ONE_TIME_SECRET",
    "os": "ubuntu-24.04",
    "plan": "starter",
    "ram_mb": 2048,
    "vcpus": 2,
    "disk_gb": 50,
    "status": "running",
    "password_change_required": true
  }
}
```

Return `initial_password` only once over authenticated HTTPS after provisioning has actually succeeded. Generate a cryptographically random password, store only a verifier/hash where feasible, expire it, and force rotation on first login. Never write passwords, API keys, private SSH keys, or the full response to logs. If the panel cannot deliver one-time credentials safely, use an SSH public-key workflow instead and do not return a private key. Return a structured non-2xx error if provisioning fails; never return `success:true` for a queued/failed creation unless the bot is explicitly updated to describe the queued state.

The current panel's actual Flask route, customer mapping, payment model, and provisioning helpers must be inspected and adapted before this bridge is considered live. This document defines the contract only; it does not itself install a route into the running panel.
