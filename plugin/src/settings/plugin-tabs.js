const { setIcon } = require("obsidian");
const { findGroupByTitle } = require("./settings-ui");
const { isIgnisPlugin } = require("../plugin-registry");

// Tracks our own nav items in the "Ignis Core Plugins" group, keyed by plugin ID.
const ownedNavItems = new Map();

function addPluginNavItem(pluginId, setting, corePluginsItems) {
  // Find the tab object Obsidian created for this plugin.
  const tab = setting.pluginTabs.find((t) => t.id === pluginId);

  if (!tab) {
    return;
  }

  // Don't add if we already have one for this ID.
  if (ownedNavItems.has(pluginId)) {
    return;
  }

  // Create our own nav item that delegates to Obsidian's tab.
  const nav = document.createElement("div");
  nav.className = "vertical-tab-nav-item tappable";

  if (tab.icon) {
    const iconEl = document.createElement("div");
    iconEl.className = "vertical-tab-nav-item-icon";
    setIcon(iconEl, tab.icon);
    nav.appendChild(iconEl);
  }

  const title = document.createElement("div");
  title.className = "vertical-tab-nav-item-title";
  title.textContent = tab.name;
  nav.appendChild(title);

  const chevron = document.createElement("div");
  chevron.className = "vertical-tab-nav-item-chevron";
  nav.appendChild(chevron);

  nav.addEventListener("click", () => {
    setting.openTab(tab);
  });

  corePluginsItems.appendChild(nav);
  ownedNavItems.set(pluginId, nav);
}

function removePluginNavItem(pluginId) {
  const nav = ownedNavItems.get(pluginId);

  if (nav) {
    nav.remove();
    ownedNavItems.delete(pluginId);
  }
}

function hideIgnisFromCommunityPlugins(setting) {
  const cpTab = setting.settingTabs.find((t) => t.id === "community-plugins");

  if (!cpTab || cpTab._ignisPatched) {
    return;
  }

  const origRender = cpTab.renderInstalledPlugin;

  cpTab.renderInstalledPlugin = function (manifest, ...rest) {
    if (isIgnisPlugin(manifest.id)) {
      return;
    }

    return origRender.call(this, manifest, ...rest);
  };

  cpTab._ignisPatched = true;
  cpTab._origRenderInstalledPlugin = origRender;
}

function restoreCommunityPlugins(setting) {
  const cpTab = setting.settingTabs.find(
    (t) => t.id === "community-plugins",
  );

  if (cpTab?._origRenderInstalledPlugin) {
    cpTab.renderInstalledPlugin = cpTab._origRenderInstalledPlugin;
    delete cpTab._origRenderInstalledPlugin;
    delete cpTab._ignisPatched;
  }
}

function hideIgnisNavFromCommunityGroup(setting) {
  const communityGroup = findGroupByTitle(
    setting.tabHeadersEl,
    "Community plugins",
  );

  if (!communityGroup) {
    return;
  }

  const items = communityGroup.querySelector(".vertical-tab-header-group-items");

  if (!items) {
    return;
  }

  // Hide any ignis plugin nav items that Obsidian placed here.
  for (const tab of setting.pluginTabs) {
    if (isIgnisPlugin(tab.id) && tab.navEl?.parentElement === items) {
      tab.navEl.style.display = "none";
    }
  }

  // Hide the entire group if no visible items remain.
  const hasVisible = Array.from(items.children).some(
    (el) => el.style.display !== "none",
  );

  communityGroup.style.display = hasVisible ? "" : "none";
}

function hideCorePluginsGroupIfEmpty() {
  for (const [, nav] of ownedNavItems) {
    if (nav.isConnected) {
      const group = nav.closest(".vertical-tab-header-group");

      if (group) {
        group.style.display = "";
      }

      return;
    }
  }

  // No connected items -- find and hide the group.
  const groups = document.querySelectorAll(".vertical-tab-header-group");

  for (const g of groups) {
    const title = g.querySelector(".vertical-tab-header-group-title");

    if (title?.textContent === "Ignis Core Plugins") {
      g.style.display = ownedNavItems.size > 0 ? "" : "none";
      break;
    }
  }
}

function setupPluginTabs(setting, corePluginsItems) {
  // Create our own nav items for ignis plugin tabs.
  for (const tab of setting.pluginTabs) {
    if (isIgnisPlugin(tab.id) && tab.id !== "ignis-bridge") {
      addPluginNavItem(tab.id, setting, corePluginsItems);
    }
  }

  hideIgnisNavFromCommunityGroup(setting);
  hideCorePluginsGroupIfEmpty();

  // Watch the community group for changes. When Obsidian adds new ignis
  // plugin nav items (async after enable), hide them and create our own.
  const communityGroup = findGroupByTitle(
    setting.tabHeadersEl,
    "Community plugins",
  );

  if (communityGroup) {
    const observer = new MutationObserver(() => {
      for (const tab of setting.pluginTabs) {
        if (isIgnisPlugin(tab.id) && tab.id !== "ignis-bridge") {
          addPluginNavItem(tab.id, setting, corePluginsItems);
        }
      }

      // Re-evaluate visibility since non-ignis items may have appeared.
      hideIgnisNavFromCommunityGroup(setting);
      hideCorePluginsGroupIfEmpty();
    });

    observer.observe(communityGroup, { childList: true, subtree: true });

    const cleanupObserver = new MutationObserver(() => {
      if (!setting.tabHeadersEl.isConnected) {
        observer.disconnect();
        cleanupObserver.disconnect();
      }
    });

    cleanupObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

function reconcilePluginTabs(setting) {
  const corePluginsGroup = findGroupByTitle(
    setting.tabHeadersEl,
    "Ignis Core Plugins",
  );

  if (!corePluginsGroup) {
    return;
  }

  const corePluginsItems = corePluginsGroup.querySelector(
    ".vertical-tab-header-group-items",
  );

  if (!corePluginsItems) {
    return;
  }

  // Get current set of ignis plugin IDs from pluginTabs.
  const activeIds = new Set(
    setting.pluginTabs
      .filter((t) => isIgnisPlugin(t.id) && t.id !== "ignis-bridge")
      .map((t) => t.id),
  );

  // Remove nav items for plugins that are no longer active.
  for (const [id] of ownedNavItems) {
    if (!activeIds.has(id)) {
      removePluginNavItem(id);
    }
  }

  // Add nav items for newly active plugins.
  for (const id of activeIds) {
    addPluginNavItem(id, setting, corePluginsItems);
  }

  hideIgnisNavFromCommunityGroup(setting);
  hideCorePluginsGroupIfEmpty();
}

function clearOwnedNavItems() {
  ownedNavItems.clear();
}

module.exports = {
  setupPluginTabs,
  reconcilePluginTabs,
  hideIgnisFromCommunityPlugins,
  restoreCommunityPlugins,
  clearOwnedNavItems,
};
