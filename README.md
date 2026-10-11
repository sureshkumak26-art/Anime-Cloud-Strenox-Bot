# Anime Cloud / StrenoxCloud Discord Bot

Discord.js v14 • Node.js 20+ • REST API • Ubuntu + PM2

A Discord slash-command bot for the StrenoxCloud VPS panel API at `https://vm.animecloudpanel.indevs.in/api/v1`.

## Important API note

The provided overview lists 94 endpoints and their categories, but does not show each route's exact HTTP method, parameters, or JSON schema. This project does not guess VPS start/stop/restart/reset methods or payloads: `/vps action` is intentionally guarded until you verify the live route map. The list/show commands use `GET /vps` and `GET /vps/{id}` based on the supplied overview; confirm these paths in the live docs before production use.

## Features

- `/ping`, `/help`, `/panel`
- `/vps create plan:<plan> os:<os>` — requests panel-side provisioning and sends connection details by DM only after confirmed success\n- `/vps list` and `/vps show`
- `/apiinfo` to probe metadata/docs paths
- `/adminapi` for admin-only calls to documented routes
- API key sent through `X-API-Key`
- API request timeout and JSON/error handling
- Admin permission check and optional audit log
- `.env` excluded from Git

## Setup on Ubuntu VPS

Install Node.js 20+ and npm, then upload/clone the repository:

```bash
sudo apt update
sudo apt install -y nodejs npm git
node --version
npm --version
```

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/Anime-Cloud-Strenox-Bot.git
cd Anime-Cloud-Strenox-Bot
npm install
cp .env.example .env
nano .env
npm run check
npm run deploy
npm start
```

Configure `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `API_KEY`, and `ADMIN_USER_IDS` in `.env`. Set `DISCORD_GUILD_ID` while testing for quicker command registration. Invite the bot with `bot` and `applications.commands` scopes and grant only required permissions such as Send Messages and Embed Links.

## Run 24/7 with PM2

```bash
sudo npm install -g pm2
pm2 start src/index.js --name anime-cloud-bot
pm2 save
pm2 startup
```

Run the additional command printed by `pm2 startup`, then use:

```bash
pm2 status
pm2 logs anime-cloud-bot
pm2 restart anime-cloud-bot
```

## Commands

- `/ping` — gateway latency
- `/help` — command help
- `/panel` — requests `GET /health`
- `/vps list` — requests `GET /vps`
- `/vps show id:<id>` — requests `GET /vps/{id}`
- `/vps action` — guarded until exact action routes and payloads are verified
- `/apiinfo` — admin-only docs/metadata probe
- `/adminapi method:<method> path:<path> json:<optional>` — admin-only API request. This can modify or delete data, so only trusted admins should have access.

## Verify endpoint schemas before production

1. Open the panel's API docs/route map while authenticated.
2. Confirm `/health`, `/vps`, and `/vps/{id}` exactly.
3. For every state-changing endpoint, record HTTP method, path, required body, and success/error responses.
4. Test with a non-production VPS before enabling destructive actions.
5. Use a least-privilege API key if supported by the panel.

## Security

- Never commit `.env`, API keys, or Discord tokens.
- `.env.example` contains placeholders only.
- Do not paste credentials into Discord or public issue trackers.
- Restrict `/adminapi` to trusted administrators.


## SSHX Terminal integration

The bot now includes the `/vps sshx id:<id>` command. It checks the VPS allowlist, requests a fresh session from the panel's SSHX bridge, validates that the returned URL uses HTTPS and an allowed SSHX host, and sends an ephemeral Open SSHX Terminal button. Session URLs are not logged.

**The panel-side bridge must be installed before this command can work end-to-end.** See `panel-integration/README.md`. The bot deliberately does not call the browser-login route directly because a Discord interaction does not have the user's Flask session cookie.

Configure `SSHX_API_PATH_TEMPLATE`, `SSHX_ALLOWED_HOSTS`, and `VPS_ACCESS_MAP` in `.env`. Access is denied to non-admin Discord users unless their ID is explicitly mapped to VPS IDs.


## Automatic VPS creation + private DM

The bot command `/vps create plan:<plan> os:<os>` calls the panel bridge `POST /integrations/discord/vps/create`. The bridge is **required**; this bot does not run privileged VM commands on its own. The panel must authenticate the API key, verify the Discord identity against its own customer/payment/plan entitlement records, enforce quotas and node capacity, and provision through the existing trusted LXC/KVM agent. Never trust the selected plan alone as proof of payment.

Expected successful response:
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

The bridge should create a unique Linux account, generate a one-time password, require password rotation at first login, return the secret only once over HTTPS, and never log it. If your panel uses SSH keys instead, change the response contract to return key-installation instructions and never generate or DM a private key. The bot sends the credentials only in DM; it does not log them or show them in the public channel. If the endpoint is not installed, provisioning fails safely and no success is claimed.
