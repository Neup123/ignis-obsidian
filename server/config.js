const path = require("path");
const fs = require("fs");

// VAULT_ROOT: a directory that contains vault folders.
// Each subdirectory is a vault. New vaults are created as new subdirs.
// Falls back to parent of VAULT_PATH (single-vault compat) or ./vaults.
const vaultRoot =
  process.env.VAULT_ROOT ||
  (process.env.VAULT_PATH
    ? path.dirname(process.env.VAULT_PATH)
    : path.join(__dirname, "..", "vaults"));

function discoverVaults() {
  const vaults = {};
  try {
    const entries = fs.readdirSync(vaultRoot, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        vaults[entry.name] = path.join(vaultRoot, entry.name);
      }
    }
  } catch (e) {
    console.error("[config] Failed to read VAULT_ROOT:", vaultRoot, e.message);
  }
  return vaults;
}

let vaults = discoverVaults();

module.exports = {
  port: process.env.PORT || 8080,
  vaultRoot,
  get vaults() {
    return vaults;
  },
  get defaultVaultId() {
    return Object.keys(vaults)[0] || null;
  },
  getVaultPath(id) {
    return vaults[id] || null;
  },
  refreshVaults() {
    vaults = discoverVaults();
    return vaults;
  },
  obsidianAssetsPath:
    process.env.OBSIDIAN_ASSETS_PATH ||
    path.join(__dirname, "..", "investigation", "obsidian.asar.unpacked"),
};
