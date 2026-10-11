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
