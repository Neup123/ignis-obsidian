<section>
  <p align="center">
      <img src="images/ignis.png" alt="Ignis logo" width="200" height="200">
  </p>

  <h3 align="center">Ignis</h3>

  <p align="center">
    Run Obsidian in the browser. No VNC required.
  </p>
</section>

## What is this

Ignis is a javascript shim that replaces the Electron APIs used by Obsidian and allows Obsidian to be run in the browser while keeping your vault on the server. As an alternative to sync based solutions, this lets you access your notes without installing an app on your device. Obsidian is not included in this repository, the Docker container downloads Obsidian directly from its official source on first run.

## Why

Obsidian's local first approach may not be the preference of some users, and while synchroniztion between devices is a perfectly good way to access your notes on multiple devices, options for accessing Obsidian remotely has been limited to VNC based solutions that have rather poor user experience. Ignis is an alternative for people who want to self-host a copy of Obsidian for easy access, in a (close-to) native format.

## Project Status

Ignis is **experimental**. Core functionality works, and some browser specific enhancements have been added, like file upload and download. Plugin support is an ongoing process of trying out plugins and finding what gaps in the shim still need to be plugged, but if a plugin uses primarily Obsidian's plugin API chances are it will work just fine.

## What works

- Creating, opening, and switching between multiple vaults
- Editing notes (markdown, canvas, bases, all core editor features)
- Community plugins to some degree (anything that doesn't need native Node modules, hopefully).
- File upload and download from the browser
- Live sync of external file changes via WebSocket
- Obsidian Sync has been tested and seems to be working fine, as long as the tab remains open obviously.
- Obsidian Headless has been integrated and can be used for continous synchronization. Can't be used alongside Obsidian Sycn in the browser, you can only pick one sync solution in order to avoid conflicts.

## Plugin Compatibility

Plugin support depends on what APIs a plugin uses. Anything built on Obsidian's plugin API generally works. Plugins that depend on Node.js modules might work depending on which are used.

Compatibility is currently tracked in [Issue #9](https://github.com/Nystik-gh/ignis/issues/9).

## Caveats

_This section will be expanded as issues are documented._

- Community plugins that rely on `child_process` or native Node addons will not work at the moment.
- Mobile browser support is not a priority. It works, but the UX is not great. But I have ideas.
- File picker has a workaround to deal with synchronous file selection issues. Usable, a bit hacky.

## Authentication

Ignis has **no built-in authentication**. The server is completely open by default.

If you are exposing Ignis to the internet, **you should really** put an authentication layer in front of it. Options include:

- A reverse proxy with basic auth (nginx, Caddy, Traefik)
- An SSO proxy like Authelia, Authentik, or OAuth2 Proxy
- A VPN (Tailscale, WireGuard)
- Cloudflare Application Tunnel

> [!CAUTION]
> Do not run Ignis on a public network without auth. Anyone with the url can read and write your vault files.



## Setup with Docker Compose

Ignis is not published to a registry yet. You need to build the image locally.

```bash
git clone https://github.com/user/obsidian-bridge.git
cd obsidian-bridge
docker compose up -d
```

On first start, the container will download Obsidian from the official servers and set everything up, and also install Obsidian Headless CLI. This takes a minute or two.

Example `docker-compose.yml`:

```yaml
services:
  ignis:
    build: .
    ports:
      - "8080:8080"
    environment:
      - OBSIDIAN_VERSION=1.12.4
      - PUID=1000
      - PGID=1000
    volumes:
      - ./vaults:/vaults
      - ./data:/app/data
      - obsidian-app:/app/obsidian-app
    restart: unless-stopped

volumes:
  obsidian-app:
```

### Volumes

| Mount | Description |
| ----- | ----------- |
| `/vaults` | Vault storage. Each subdirectory is a vault. |
| `/data` | state persistence for various ignis specific functionality, plugin management, headless sync config, etc |
| `/app/obsidian-app` | Cached Obsidian assets. Persisting this avoids re-downloading on container recreate. |

### Environment Variables

| Variable | Description | Default |
| -------- | ----------- | ------- |
| `PORT` | Server listen port | `8080` |
| `VAULT_ROOT` | Path to vault storage inside the container | `/vaults` |
| `DATA_ROOT` | Path to persistent data (plugin config, sync state, auth tokens) | `/app/data` |
| `OBSIDIAN_VERSION` | Obsidian version to download | `1.12.4` |
| `PUID` | User ID for file ownership | `1000` |
| `PGID` | Group ID for file ownership | `1000` |

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines, especially on how to report plugin compatibility issues. Check the [open issues](https://github.com/Nystik-gh/ignis/issues) for things to work on.

## Architecture

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for details on the shim layer, plugin system, and server internals.

## License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
