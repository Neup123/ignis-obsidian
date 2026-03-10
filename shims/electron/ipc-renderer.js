// Shim for electron.ipcRenderer
// Obsidian uses: .send(), .sendSync(), .on(), .once()
//
// sendSync channels discovered in app.js:
//   vault        → {id, path}      -  critical for startup
//   version      → string          -  app version
//   is-dev       → boolean         -  dev mode flag
//   file-url     → string          -  base URL prefix for vault assets
//   disable-update → boolean       -  whether updates are disabled
//   update       → string          -  update status
//   disable-gpu  → boolean         -  GPU acceleration toggle
//   frame        → void            -  window frame style
//   set-icon     → void            -  custom vault icon
//   get-icon     → null|object     -  get custom vault icon
//   relaunch     → void            -  restart app
//   starter      → void            -  open vault chooser
//   help         → void            -  open help
//   sandbox      → void            -  open sandbox vault
//   copy-asar    → boolean         -  install update

import { showVaultManager } from "../ui/vault-manager.js";

const listeners = new Map();

// Sync channel handlers  -  must return values synchronously
const syncHandlers = {
  vault: () => window.__vaultConfig || { id: "default-vault", path: "/" },
  version: () => "1.8.9",
  "is-dev": () => false,
  "file-url": () =>
    "/vault-files/" + encodeURIComponent(window.__currentVaultId || "") + "/",
  "disable-update": () => true,
  update: () => "",
  "disable-gpu": () => false,
  frame: () => null,
  "set-icon": () => null,
  "get-icon": () => null,
  relaunch: () => {
    window.location.reload();
    return null;
  },
  starter: () => {
    showVaultManager();
    return null;
  },
  help: () => {
    window.open("https://help.obsidian.md/", "_blank");
    return null;
  },
  sandbox: () => null,
  "copy-asar": () => false,
  "check-update": () => null,
  "vault-list": () => {
    // Starter expects an object keyed by ID: {id: {path, ts, name}}
    const result = {};
    for (const v of window.__vaultList || []) {
      result[v.id] = {
        path: "/" + v.id,
        ts: Date.now(),
        open: v.id === (window.__currentVaultId || ""),
      };
    }
    return result;
  },
  "vault-open": (vaultPath, newWindow) => {
    const id = (vaultPath || "").replace(/^\/+/, "");
    const vault = (window.__vaultList || []).find((v) => v.id === id);
    if (!vault && id) {
      // New vault created by starter  -  create it on the server
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "/api/vault/create", false);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ name: id }));
      if (xhr.status >= 400) return "Failed to create vault";
    }
    // Navigate  -  use parent if in iframe, otherwise current window
    const target = window.parent !== window ? window.parent : window;
    target.location.href = "/?vault=" + encodeURIComponent(id);
    return true;
  },
  "vault-remove": (vaultPath) => {
    const id = (vaultPath || "").replace(/^\/+/, "");
    const xhr = new XMLHttpRequest();
    xhr.open(
      "DELETE",
      "/api/vault/remove?vault=" + encodeURIComponent(id),
      false,
    );
    xhr.send();
    return xhr.status < 400;
  },
  "vault-move": (oldPath, newPath) => {
    // Not supported in web context
    return "Moving vaults is not supported in the web version";
  },
  "vault-message": () => null,
  "get-default-vault-path": () => "/My Vault",
  "get-documents-path": () => "/",
  "desktop-dir": () => "/desktop",
  "documents-dir": () => "/documents",
  resources: () => "",
};

export const ipcRenderer = {
  send(channel, ...args) {
    console.log("[shim:ipcRenderer] send:", channel, args);

    // context-menu: Obsidian sends this and waits (up to 1s) for a response.
    // In Electron, the main process returns spell-check info + edit flags.
    // We reply immediately with a response object so Obsidian proceeds to
    // build and show its HTML context menu without delay.
    if (channel === "context-menu") {
      queueMicrotask(() =>
        ipcRenderer._emit("context-menu", {
          webContentsId: 1,
          editFlags: { canCut: true, canCopy: true, canPaste: true },
        }),
      );
      return;
    }
  },

  sendSync(channel, ...args) {
    console.log("[shim:ipcRenderer] sendSync:", channel, args);
    if (syncHandlers[channel]) {
      return syncHandlers[channel](...args);
    }
    console.warn("[shim:ipcRenderer] Unhandled sendSync channel:", channel);
    return null;
  },

  on(channel, listener) {
    if (!listeners.has(channel)) {
      listeners.set(channel, []);
    }
    listeners.get(channel).push(listener);
    return ipcRenderer;
  },

  once(channel, listener) {
    const wrapped = (...args) => {
      ipcRenderer.removeListener(channel, wrapped);
      listener(...args);
    };
    return ipcRenderer.on(channel, wrapped);
  },

  removeListener(channel, listener) {
    const arr = listeners.get(channel);
    if (arr) {
      const idx = arr.indexOf(listener);
      if (idx >= 0) arr.splice(idx, 1);
    }
    return ipcRenderer;
  },

  removeAllListeners(channel) {
    if (channel) {
      listeners.delete(channel);
    } else {
      listeners.clear();
    }
    return ipcRenderer;
  },

  // Internal: emit an event to registered listeners (used by ws bridge)
  _emit(channel, ...args) {
    const arr = listeners.get(channel);
    if (arr) {
      for (const fn of arr) {
        fn({}, ...args);
      }
    }
  },
};
