var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// plugin/src/file-actions.js
var require_file_actions = __commonJS({
  "plugin/src/file-actions.js"(exports2, module2) {
    var { Notice, TFile: TFile2, TFolder: TFolder2 } = require("obsidian");
    function getVaultId() {
      return window.__currentVaultId || "";
    }
    function triggerDownload(endpoint, filePath, downloadName) {
      const vaultId = getVaultId();
      const url = `/api/fs/${endpoint}?vault=${encodeURIComponent(vaultId)}&path=${encodeURIComponent(filePath)}`;
      const a = document.createElement("a");
      a.href = url;
      a.download = downloadName;
      a.click();
    }
    function showFilePicker2(app, targetFolder = null) {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.style.display = "none";
      input.addEventListener("change", async () => {
        const files = Array.from(input.files || []);
        if (files.length === 0)
          return;
        const folder = targetFolder || app.vault.getRoot();
        const folderPath = folder.path;
        new Notice(`Uploading ${files.length} file(s)...`);
        let successCount = 0;
        let errorCount = 0;
        for (const file of files) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const targetPath = folderPath ? `${folderPath}/${file.name}` : file.name;
            await app.vault.createBinary(targetPath, arrayBuffer);
            successCount++;
          } catch (e) {
            console.error("[ignis-bridge] Upload failed:", file.name, e);
            errorCount++;
          }
        }
        if (successCount > 0) {
          new Notice(`Uploaded ${successCount} file(s) successfully`);
        }
        if (errorCount > 0) {
          new Notice(`Failed to upload ${errorCount} file(s)`, 5e3);
        }
        input.remove();
      });
      document.body.appendChild(input);
      input.click();
    }
    function addFileMenuItems2(menu, file) {
      menu.addItem((item) => {
        item.setTitle("Download").setIcon("download").onClick(() => triggerDownload("download", file.path, file.name));
      });
    }
    function addFolderMenuItems2(menu, folder, app) {
      menu.addItem((item) => {
        item.setTitle("Download as ZIP").setIcon("download").onClick(
          () => triggerDownload("download-zip", folder.path, `${folder.name}.zip`)
        );
      });
      menu.addItem((item) => {
        item.setTitle("Upload file").setIcon("upload").onClick(() => showFilePicker2(app, folder));
      });
    }
    module2.exports = { showFilePicker: showFilePicker2, addFileMenuItems: addFileMenuItems2, addFolderMenuItems: addFolderMenuItems2 };
  }
});

// plugin/src/settings/general-tab.js
var require_general_tab = __commonJS({
  "plugin/src/settings/general-tab.js"(exports2, module2) {
    var { Setting } = require("obsidian");
    function display(containerEl) {
      containerEl.createEl("h2", { text: "Ignis General Settings" });
      new Setting(containerEl).setName("Example toggle").setDesc("This is a test toggle to prove the Setting API works.").addToggle((toggle) => {
        toggle.setValue(false);
        toggle.onChange((value) => {
          console.log("[ignis] Toggle:", value);
        });
      });
    }
    module2.exports = { display };
  }
});

// plugin/src/settings/server-plugins-tab.js
var require_server_plugins_tab = __commonJS({
  "plugin/src/settings/server-plugins-tab.js"(exports2, module2) {
    var { Setting } = require("obsidian");
    function display(containerEl) {
      containerEl.createEl("h2", { text: "Server Plugins" });
      new Setting(containerEl).setName("Example text input").setDesc("This is a test input to prove a second tab works.").addText((text) => {
        text.setPlaceholder("Type something...");
      });
    }
    module2.exports = { display };
  }
});

// plugin/src/settings/inject.js
var require_inject = __commonJS({
  "plugin/src/settings/inject.js"(exports2, module2) {
    var generalTab = require_general_tab();
    var serverPluginsTab = require_server_plugins_tab();
    function createNavEl(tab, setting) {
      const nav = document.createElement("div");
      nav.className = "vertical-tab-nav-item tappable";
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
      return nav;
    }
    function createTab(id, name, displayFn) {
      const tab = {
        id,
        name,
        containerEl: createDiv("vertical-tab-content"),
        navEl: null,
        display() {
          this.containerEl.empty();
          displayFn(this.containerEl);
        },
        hide() {
          this.containerEl.empty();
        }
      };
      return tab;
    }
    function injectIgnisSettings(setting) {
      const group = document.createElement("div");
      group.className = "vertical-tab-header-group";
      const title = document.createElement("div");
      title.className = "vertical-tab-header-group-title";
      title.textContent = "Ignis";
      group.appendChild(title);
      const items = document.createElement("div");
      items.className = "vertical-tab-header-group-items";
      group.appendChild(items);
      const tabs = [
        createTab("ignis-general", "General", generalTab.display),
        createTab("ignis-server-plugins", "Server Plugins", serverPluginsTab.display)
      ];
      for (const tab of tabs) {
        tab.navEl = createNavEl(tab, setting);
        items.appendChild(tab.navEl);
      }
      setting.tabHeadersEl.appendChild(group);
    }
    function patchSettingsModal2(plugin) {
      const original = plugin.app.setting.onOpen;
      plugin._originalOnOpen = original;
      plugin.app.setting.onOpen = function() {
        original.call(this);
        injectIgnisSettings(this);
      };
    }
    function unpatchSettingsModal2(plugin) {
      if (plugin._originalOnOpen) {
        plugin.app.setting.onOpen = plugin._originalOnOpen;
      }
    }
    module2.exports = { patchSettingsModal: patchSettingsModal2, unpatchSettingsModal: unpatchSettingsModal2 };
  }
});

// plugin/src/main.js
var { Plugin, TFile, TFolder } = require("obsidian");
var { showFilePicker, addFileMenuItems, addFolderMenuItems } = require_file_actions();
var { patchSettingsModal, unpatchSettingsModal } = require_inject();
window.__obsidianAPI = require("obsidian");
var IgnisBridgePlugin = class extends Plugin {
  async onload() {
    console.log("[ignis-bridge] Plugin loaded");
    patchSettingsModal(this);
    this.addRibbonIcon("upload", "Upload file", () => {
      showFilePicker(this.app);
    });
    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (file instanceof TFile) {
          addFileMenuItems(menu, file);
        } else if (file instanceof TFolder) {
          addFolderMenuItems(menu, file, this.app);
        }
      })
    );
  }
  onunload() {
    unpatchSettingsModal(this);
    console.log("[ignis-bridge] Plugin unloaded");
  }
};
module.exports = IgnisBridgePlugin;
