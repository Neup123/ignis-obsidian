const { Notice } = require("obsidian");
const fs = require("fs"); // Using fs shim

function isCoreSyncEnabled() {
  try {
    const data = fs.readFileSync(".obsidian/core-plugins.json", "utf-8");
    const config = JSON.parse(data);
    return config.sync === true;
  } catch {
    return false;
  }
}

function showConflictWarning(title, message) {
  if (!window.IgnisUI?.MessageDialog) {
    new Notice(`${title}: ${message}`, 10000);
    return;
  }

  const dialog = new window.IgnisUI.MessageDialog({
    target: document.body,
    props: { title, message },
  });

  dialog.$on("confirm", () => {
    dialog.$destroy();
  });
}

function startCoreSyncWatcher(plugin, api, wsListener) {
  let wasEnabled = isCoreSyncEnabled();

  const rawHandler = (msg) => {
    if (msg.type === "modified" && msg.path === ".obsidian/core-plugins.json") {
      handleCoreSyncChange();
    }
  };

  wsListener.onRaw(rawHandler);

  function handleCoreSyncChange() {
    const enabled = isCoreSyncEnabled();

    if (enabled && !wasEnabled) {
      const vaultId = plugin.app.vault.getName();

      api.stopSync(vaultId).catch(() => {});
      showConflictWarning(
        "Headless Sync Stopped",
        "Obsidian Sync has been enabled. Headless Sync has been automatically " +
          "stopped to avoid conflicts between the two sync methods.\n\n" +
          "To use Headless Sync again, disable Obsidian Sync in Core Plugins.",
      );
    }

    wasEnabled = enabled;
  }

  return {
    cleanup() {
      wsListener.offRaw();
    },
  };
}

module.exports = {
  isCoreSyncEnabled,
  startCoreSyncWatcher,
};
