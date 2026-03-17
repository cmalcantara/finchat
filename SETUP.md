# FinChat Setup Guide

## Quick Start

```bash
npm install
npm run dev          # development
# OR
npm run build && npm start   # production
```

## Home Server Setup

### Systemd service (Linux)

Create `/etc/systemd/system/finchat.service`:

```ini
[Unit]
Description=FinChat Finance Tracker
After=network.target

[Service]
Type=simple
User=YOUR_USERNAME
WorkingDirectory=/path/to/finchat
ExecStart=/usr/bin/npm start -- -p 3000
Restart=on-failure
Environment=PORT=3000
Environment=DATABASE_FILE=./data/finchat.db

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable finchat
sudo systemctl start finchat
```

### macOS launchd (optional)
Use `pm2` instead:
```bash
npm install -g pm2
npm run build
pm2 start "npm start" --name finchat
pm2 save
pm2 startup   # follow the printed command
```

## Cloudflare Tunnel

1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/
2. Authenticate: `cloudflared tunnel login`
3. Create tunnel: `cloudflared tunnel create finchat`
4. Create config at `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: YOUR_TUNNEL_ID
   credentials-file: /Users/YOUR_USER/.cloudflared/YOUR_TUNNEL_ID.json
   ingress:
     - hostname: finchat.yourdomain.com
       service: http://localhost:3000
     - service: http_status:404
   ```
5. Add DNS record: `cloudflared tunnel route dns finchat finchat.yourdomain.com`
6. Run: `cloudflared tunnel run finchat`

For permanent background running, create a launchd or systemd service for cloudflared as well.

## GSheet Sync via Cron

The sync script checks the pending count first and skips the POST entirely if there are no unsynced transactions.

Make the script executable, then add it to crontab:
```bash
chmod +x /path/to/finchat/sync-gsheet.sh
crontab -e
```

Add this line (adjust path):
```
0 */2 * * * /path/to/finchat/sync-gsheet.sh
```

If your app runs on a non-default port, set it in the crontab environment:
```
PORT=3000
0 */2 * * * /path/to/finchat/sync-gsheet.sh
```

Sync activity is logged to `/tmp/finchat-sync.log` only when a sync actually runs.

## Google Apps Script Setup

See `gsheet-apps-script.js` in the project root for the script and inline instructions.
