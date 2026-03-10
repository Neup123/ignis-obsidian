// shim-loader.js
// Loaded before app.js. Defines window.require() and window.process
// to intercept all Electron/Node API calls from Obsidian's renderer code.

import { electronShim } from "./electron/index.js";
import { remoteShim } from "./electron/remote/index.js";
import { fsShim } from "./fs/index.js";
import { pathShim } from "./path.js";
import { urlShim } from "./url.js";
import { cryptoShim } from "./crypto/index.js";
import { btimeShim } from "./btime.js";
import { processShim } from "./process.js";

// Debug mode: wrap shims in Proxy to log all property accesses
const DEBUG = true;
const _accessLog = new Map(); // "module.property" -> count

function wrapWithProxy(obj, name) {
  if (!DEBUG || !obj || typeof obj !== "object") return obj;
  return new Proxy(obj, {
    get(target, prop) {
      if (
        typeof prop === "string" &&
        prop !== "then" &&
        prop !== "toJSON" &&
        !prop.startsWith("_")
      ) {
        const key = `${name}.${prop}`;
        _accessLog.set(key, (_accessLog.get(key) || 0) + 1);
        if (!(prop in target)) {
          console.warn(`[shim:MISS] ${key}  -  property not found on shim`);
        }
      }
      return target[prop];
    },
  });
}

// Expose access log for debugging in console: window.__shimLog()
window.__shimLog = function () {
  const sorted = [..._accessLog.entries()].sort((a, b) => b[1] - a[1]);
  console.table(sorted.map(([k, v]) => ({ api: k, calls: v })));
};
window.__shimMisses = function () {
  const sorted = [..._accessLog.entries()]
    .filter(([k]) => {
      const [mod, prop] = k.split(".");
      const shim = rawRegistry[mod];
      return shim && !(prop in shim);
    })
    .sort((a, b) => b[1] - a[1]);
  console.table(sorted.map(([k, v]) => ({ api: k, calls: v })));
};

const rawRegistry = {
  electron: electronShim,
  "@electron/remote": remoteShim,
  "original-fs": fsShim,
  fs: fsShim,
  path: pathShim,
  url: urlShim,
  crypto: cryptoShim,
  btime: btimeShim,
};

const shimRegistry = {};
for (const [name, shim] of Object.entries(rawRegistry)) {
  shimRegistry[name] = wrapWithProxy(shim, name);
}

// Modules that should throw on require (native modules that don't exist in browser)
const throwOnRequire = new Set(["btime", "get-fonts", "vibrancy-win"]);

window.require = function (moduleName) {
  if (throwOnRequire.has(moduleName)) {
    throw new Error(`Cannot find module '${moduleName}'`);
  }
  if (shimRegistry[moduleName]) {
    return shimRegistry[moduleName];
  }
  console.warn("[obsidian-bridge] Unshimmed require:", moduleName);
  return wrapWithProxy({}, `UNKNOWN(${moduleName})`);
};

window.process = processShim;

// Provide a global Buffer if needed
if (typeof window.Buffer === "undefined") {
  // TODO: evaluate if a full Buffer polyfill is needed or if Uint8Array suffices
  window.Buffer = {
    from: function (data, encoding) {
      if (typeof data === "string") {
        return new TextEncoder().encode(data);
      }
      if (data instanceof ArrayBuffer) {
        return new Uint8Array(data);
      }
      return new Uint8Array(data);
    },
    concat: function (arrays) {
      const total = arrays.reduce((sum, a) => sum + a.length, 0);
      const result = new Uint8Array(total);
      let offset = 0;
      for (const arr of arrays) {
        result.set(arr, offset);
        offset += arr.length;
      }
      return result;
    },
    isBuffer: function (obj) {
      return obj instanceof Uint8Array;
    },
  };
}

// Prevent app.js from closing the window (browser blocks this anyway, but suppress the error)
// In an iframe (starter modal), close the modal overlay instead.
const _origClose = window.close;
window.close = function () {
  if (window.parent !== window) {
    const modal = window.parent.document.getElementById("ignis-starter-modal");
    if (modal) modal.remove();
    return;
  }
  console.log("[obsidian-bridge] window.close() blocked");
};

// Suppress the browser's native context menu without breaking Obsidian's.
// Problem: preventDefault() blocks the browser menu but also sets
// event.defaultPrevented=true, which Obsidian checks to bail out.
// Solution: call preventDefault() then shadow defaultPrevented to return false.
window.addEventListener(
  "contextmenu",
  (e) => {
    e.preventDefault();
    Object.defineProperty(e, "defaultPrevented", { get: () => false });
  },
  true,
);

// Read vault ID from URL query param (?vault=my-notes)
const _urlParams = new URLSearchParams(window.location.search);
window.__currentVaultId = _urlParams.get("vault") || "";

// Fetch vault config from server synchronously (before metadata cache)
(function initVaultConfig() {
  try {
    const vaultParam = window.__currentVaultId
      ? "?vault=" + encodeURIComponent(window.__currentVaultId)
      : "";
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/vault/info" + vaultParam, false);
    xhr.send();
    if (xhr.status === 200) {
      const info = JSON.parse(xhr.responseText);
      window.__currentVaultId = info.id;
      window.__vaultConfig = {
        id: info.id,
        path: "/",
      };
      console.log("[obsidian-bridge] Vault:", window.__vaultConfig);
    }
  } catch (e) {
    console.error("[obsidian-bridge] Failed to fetch vault config:", e);
  }
})();

// Fetch vault list for IPC handlers
(function initVaultList() {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/vault/list", false);
    xhr.send();
    if (xhr.status === 200) {
      window.__vaultList = JSON.parse(xhr.responseText);
    }
  } catch (e) {
    window.__vaultList = [];
  }
})();

// Pre-populate fs metadata cache synchronously before app.js runs.
// This ensures existsSync() works for the vault path during startup.
(function initMetadataCache() {
  try {
    const vaultParam = window.__currentVaultId
      ? "?vault=" + encodeURIComponent(window.__currentVaultId)
      : "";
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "/api/fs/tree" + vaultParam, false);
    xhr.send();
    if (xhr.status === 200) {
      const tree = JSON.parse(xhr.responseText);
      fsShim._metadataCache.populate(tree);
      fsShim._metadataCache.set("", { type: "directory" });
      fsShim._metadataCache.set("/", { type: "directory" });
      console.log(
        "[obsidian-bridge] Metadata cache populated:",
        fsShim._metadataCache.size,
        "entries",
      );
    } else {
      console.error(
        "[obsidian-bridge] Failed to fetch metadata tree:",
        xhr.status,
      );
    }
  } catch (e) {
    console.error("[obsidian-bridge] Failed to init metadata cache:", e);
  }
})();

console.log("[obsidian-bridge] Shim loader initialized");
