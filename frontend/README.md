# F-list Profile Editor v0.5.0

A WYSIWYG profile editor that imports and exports readable F-list BBCode.

This is the standalone self-hosted release.

## Requirements

- Node.js 24 or newer
- npm

## Install and run

```bash
npm install
npm run build
npm start -- --hostname 0.0.0.0 --port 4173
```

The application will be available on port `4173`. For a public site, don't
expose that port: follow [Deploying with HTTPS](#deploying-with-https) below.

## Deploying with HTTPS

Caddy sits in front of the app, handles HTTPS with a free, auto-renewing
Let's Encrypt certificate, and passes requests to the app on `127.0.0.1:4173`.
The steps below are for Debian or Ubuntu; for other systems see
<https://caddyserver.com/docs/install>.

1. **Point the domain at the VPS.** At your registrar, add an `A` record for
   `funnyeditor.site` with the VPS's IP address, and another for
   `www.funnyeditor.site` (or remove the `www` block from `deploy/Caddyfile`).
   Add `AAAA` records too if the VPS has IPv6.

2. **Open ports 80 and 443,** which Caddy needs to get the certificate, and
   close 4173 if you opened it before:

   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw delete allow 4173/tcp
   ```

3. **Install and build the app** in `/opt/f-list-profile-editor`, run by its
   own user:

   ```bash
   sudo useradd --system --home /opt/f-list-profile-editor --shell /usr/sbin/nologin profile-editor
   # copy this folder to /opt/f-list-profile-editor (without node_modules), then:
   cd /opt/f-list-profile-editor
   sudo npm ci
   sudo npm run build
   sudo chown -R profile-editor:profile-editor /opt/f-list-profile-editor
   ```

4. **Run it as a service** so it starts on boot and restarts if it crashes:

   ```bash
   sudo cp deploy/f-list-profile-editor.service /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now f-list-profile-editor
   ```

5. **Install Caddy** (it starts as the `caddy` service automatically):

   ```bash
   sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https curl
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
   sudo chmod o+r /usr/share/keyrings/caddy-stable-archive-keyring.gpg
   sudo chmod o+r /etc/apt/sources.list.d/caddy-stable.list
   sudo apt update
   sudo apt install caddy
   ```

6. **Give Caddy the site config:**

   ```bash
   sudo cp deploy/Caddyfile /etc/caddy/Caddyfile
   sudo systemctl reload caddy
   ```

   Open <https://funnyeditor.site>. The first visit can take a few seconds
   while the certificate is issued.

**Updating:** copy in the new files, then run `sudo npm ci`, `sudo npm run build`,
`sudo chown -R profile-editor:profile-editor /opt/f-list-profile-editor` and
`sudo systemctl restart f-list-profile-editor`.

**If something's wrong:** `journalctl -u f-list-profile-editor` shows the app's
output and `journalctl -u caddy` shows certificate problems (usually DNS not
pointing at the VPS yet, or ports 80/443 closed).

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm test
npm run lint
npm run build
```

Profile imports, eicon searches, and character icon lookups use the included
server API routes. Keep the application running through `npm start`; serving
only static files will not provide those features.

## Feedback

The **Feedback** button appends each submission to `feedback.txt` in the folder
you run `npm start` from (set `FEEDBACK_FILE` to use another path). With the
service from `deploy/` it's `/var/lib/f-list-profile-editor/feedback.txt`; read it
with `sudo cat /var/lib/f-list-profile-editor/feedback.txt`. Entries are
just the text someone wrote, separated by a line of dashes. Nothing else is
recorded: no names, IP addresses, browsers or times. The file stops accepting
feedback at 10 MB until you clear it.
