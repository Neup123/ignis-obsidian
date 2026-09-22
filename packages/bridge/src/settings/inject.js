import { Platform } from "obsidian";
import * as generalTab from "./general-tab.js";
import * as vaultTab from "./vault-tab.js";
import * as serverPluginsTab from "./server-plugins-tab.js";
import { createNavEl, createTab, createGroup } from "./settings-ui.js";
import {
  allIgnisNavEls,
  setupPluginTabs,
  reconcilePluginTabs,
  hideIgnisFromCommunityPlugins,
  restoreCommunityPlugins,
  clearOwnedPluginIds,
  disconnectCommunityObserver,
} from "./plugin-tabs.js";

function removeExistingIgnisGroups(setting) {
  const sections = setting.tabHeadersEl.querySelectorAll(
    '[data-section="ignis"], [data-section="ignis-core-plugins"]',
  );

  for (const items of sections) {
    items.closest(".vertical-tab-header-group")?.remove();
  }
}

function writeVersionRow(versionSetting, ignisVersion) {
  const desc = versionSetting.descEl;

  desc.empty();
  desc.createEl("strong", { text: `Running in Ignis v${ignisVersion}` });
  desc.createEl("br");
  desc.appendText(
    "Obsidian is served through Ignis. There's no installer to update.",
  );
}

// Replace the installer version with the Ignis version.
function patchVersionRow(setting, ignisVersion) {
  const aboutTab = setting.settingTabs.find((t) => t.id === "about");

  if (!aboutTab || aboutTab._ignisOriginalUpdateVersionSetting) {
    return;
  }

  const original = aboutTab.updateVersionSetting;
  aboutTab._ignisOriginalUpdateVersionSetting = original;

  aboutTab.updateVersionSetting = function () {
    original.call(this);

    if (this.currentVersionSetting) {
      writeVersionRow(this.currentVersionSetting, ignisVersion);
    }
  };

  if (aboutTab.currentVersionSetting) {
    writeVersionRow(aboutTab.currentVersionSetting, ignisVersion);
  }
}

function unpatchVersionRow(setting) {
  const aboutTab = setting.settingTabs.find((t) => t.id === "about");

  if (aboutTab?._ignisOriginalUpdateVersionSetting) {
    aboutTab.updateVersionSetting = aboutTab._ignisOriginalUpdateVersionSetting;
    delete aboutTab._ignisOriginalUpdateVersionSetting;
  }
}

function patchOpenTab(setting) {
  if (setting._ignisOpenTabPatched) {
    return;
  }

  const original = setting.openTab.bind(setting);
  setting._ignisOriginalOpenTab = original;

  setting.openTab = function (tab) {
    // Clear is-active from all ignis nav items.
    for (const [, el] of allIgnisNavEls) {
      el.removeClass("is-active");
    }

    original(tab);

    // If the opened tab is one of ours, highlight it.
    const navEl = allIgnisNavEls.get(tab.id);

    if (navEl) {
      navEl.addClass("is-active");
    }
  };

  setting._ignisOpenTabPatched = true;
}

function injectIgnisSettings(setting, app, plugin) {
  removeExistingIgnisGroups(setting);
  clearOwnedPluginIds();
  allIgnisNavEls.clear();

  patchOpenTab(setting);
  patchVersionRow(setting, plugin.manifest.version);

  const ignis = createGroup("Ignis", "ignis");

  const tabs = [
    createTab("ignis-general", "General", generalTab.display, app, "flame"),
    createTab("ignis-vault", "Vault", vaultTab.display, app, "vault"),
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
    allIgnisNavEls.set(tab.id, tab.navEl);
  }

  setting.tabGroupContainerEl.appendChild(ignis.group);

  const corePlugins = createGroup("Ignis Core Plugins", "ignis-core-plugins");
  setting.tabGroupContainerEl.appendChild(corePlugins.group);

  hideIgnisFromCommunityPlugins(setting);
  setupPluginTabs(setting, corePlugins.items);

  return tabs;
}

function patchSettingsModal(plugin) {
  const original = plugin.app.setting.onOpen;
  const app = plugin.app;
  plugin._originalOnOpen = original;

  plugin.app.setting.onOpen = function () {
    // read before obsidian overwrites it.
    const lastTabId = this.lastTabId;

    original.call(this);

    const tabs = injectIgnisSettings(this, app, plugin);
    const lastTab = tabs.find((tab) => tab.id === lastTabId);

    if (lastTab && !Platform.isPhone) {
      this.openTab(lastTab);
    }
  };
}

function unpatchSettingsModal(plugin) {
  if (plugin._originalOnOpen) {
    plugin.app.setting.onOpen = plugin._originalOnOpen;
  }

  const setting = plugin.app.setting;

  if (setting._ignisOriginalOpenTab) {
    setting.openTab = setting._ignisOriginalOpenTab;
    delete setting._ignisOriginalOpenTab;
  }

  delete setting._ignisOpenTabPatched;

  unpatchVersionRow(setting);
  restoreCommunityPlugins(setting);
  disconnectCommunityObserver();
  clearOwnedPluginIds();
}

export { patchSettingsModal, unpatchSettingsModal, reconcilePluginTabs };
