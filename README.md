# Ignis

An Electron shim and server bridge for running Obsidian in a browser. No VNC required.

# Why

Obsidian is built on Electron but lacks browser access. Existing solutions rely on VNC/remote desktop, which provides a poor user experience. Since Electron is essentially a browser with Node.js integration, it should be possible to create a shim that routes Electron/Node APIs to a server, allowing Obsidian to run as a true web application.

Ignis is a proof of concept testing this approach.

## How it works

Ignis replaces the electron backend of Obsidian with a browser-compatible 'shim' that intercepts calls to Node.js and Electron APIs and routes them to a server.

An in-memory metadata cache is built on page load so that sync filesystem calls (`existsSync`, `statSync`, etc.) work without round-tripping to the server every time. Async reads and writes go over HTTP. IPC channels like `ipcRenderer.sendSync("vault")` are faked with a dispatcher that returns what Obsidian expects. Native stuff like clipboard, menus, and dialogs have minimal stubs.

## Status

Ignis is in an experimental state. Basic functionality works but no guarantee of stability or feature completeness. See [ARCHITECTURE.md](ARCHITECTURE.md) for details.
