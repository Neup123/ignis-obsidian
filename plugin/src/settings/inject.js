const generalTab = require("./general-tab");
const serverPluginsTab = require("./server-plugins-tab");
const { createNavEl, createTab, createGroup } = require("./settings-ui");
const {
  setupPluginTabs,
  reconcilePluginTabs,
  hideIgnisFromCommunityPlugins,
  restoreCommunityPlugins,
  clearOwnedNavItems,
} = require("./plugin-tabs");

function removeExistingIgnisGroups(tabHeadersEl) {
  const groups = tabHeadersEl.querySelectorAll(".vertical-tab-header-group");

  for (const g of groups) {
    const title = g.querySelector(".vertical-tab-header-group-title");

    if (
      title?.textContent === "Ignis" ||
      title?.textContent === "Ignis Core Plugins"
    ) {
      g.remove();
    }
  }
}

function injectIgnisSettings(setting, app) {
  removeExistingIgnisGroups(setting.tabHeadersEl);
  clearOwnedNavItems();

  const ignis = createGroup("Ignis");

  const tabs = [
    createTab("ignis-general", "General", generalTab.display, app, "flame"),
    createTab(
      "ignis-core-plugins",
      "Core plugins",
      serverPluginsTab.display,
      app,
      "blocks",
    ),
  ];

  for (const tab of tabs) {
    tab.navEl = createNavEl(tab, setting);
    ignis.items.appendChild(tab.navEl);
  }

  setting.tabHeadersEl.appendChild(ignis.group);

  const corePlugins = createGroup("Ignis Core Plugins");
  setting.tabHeadersEl.appendChild(corePlugins.group);

  hideIgnisFromCommunityPlugins(setting);
  setupPluginTabs(setting, corePlugins.items);
}

function patchSettingsModal(plugin) {
  const original = plugin.app.setting.onOpen;
  const app = plugin.app;
  plugin._originalOnOpen = original;

  plugin.app.setting.onOpen = function () {
    original.call(this);
    injectIgnisSettings(this, app);
  };
}

function unpatchSettingsModal(plugin) {
  if (plugin._originalOnOpen) {
    plugin.app.setting.onOpen = plugin._originalOnOpen;
  }

  restoreCommunityPlugins(plugin.app.setting);
  clearOwnedNavItems();
}

window.__ignisReconcilePluginTabs = reconcilePluginTabs;

module.exports = { patchSettingsModal, unpatchSettingsModal, reconcilePluginTabs };
