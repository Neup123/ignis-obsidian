import {
  showMessageDialog,
  showConfirmDialog,
  showPromptDialog,
} from "../../../ui/bootstrap.js";

export const dialogShim = {
  async showOpenDialog(browserWindow, options) {
    // TODO: implement custom modal with server-side file listing
    console.log("[shim:dialog] showOpenDialog (stub):", options);
    return { canceled: true, filePaths: [] };
  },

  async showSaveDialog(browserWindow, options) {
    if (typeof browserWindow === "object" && !options) {
      options = browserWindow;
    }

    const defaultName =
      options?.defaultPath?.split(/[\/\\]/).pop() || "download";
    const name = await showPromptDialog(
      "Save File",
      "Save as:",
      "filename",
      defaultName,
      "Save",
    );

    if (!name) {
      return { canceled: true, filePath: undefined };
    }

    return { canceled: false, filePath: "/downloads/" + name };
  },

  async showMessageBox(browserWindow, options) {
    if (typeof browserWindow === "object" && !options) {
      options = browserWindow;
    }

    console.log("[shim:dialog] showMessageBox:", options);

    const message = options.message || "";
    const detail = options.detail || "";
    const buttons = options.buttons || ["OK"];
    const fullMessage = message + (detail ? "\n\n" + detail : "");

    if (buttons.length <= 1) {
      await showMessageDialog(options.title || "Message", fullMessage);
      return { response: 0, checkboxChecked: false };
    }

    const result = await showConfirmDialog(
      options.title || "Confirm",
      message,
      detail,
      buttons[0],
    );

    return {
      response: result ? 0 : 1,
      checkboxChecked: false,
    };
  },

  showErrorBox(title, content) {
    console.error("[shim:dialog] Error:", title, content);
    showMessageDialog(title, content);
  },
};
