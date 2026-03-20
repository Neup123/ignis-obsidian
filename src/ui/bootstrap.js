import { vaultService } from "../services/vault-service.js";

export function showVaultManager() {
  if (!document.querySelector(".workspace")) return;
  if (document.querySelector(".vault-manager-overlay")) return;

  new window.IgnisUI.VaultManager({
    target: document.body,
    props: { vaultService },
  });
}

export function showMessageDialog(title, message) {
  return new Promise((resolve) => {
    const dialog = new window.IgnisUI.MessageDialog({
      target: document.body,
      props: { title, message },
    });

    dialog.$on("confirm", () => {
      dialog.$destroy();
      resolve();
    });
  });
}

export function showConfirmDialog(
  title,
  message,
  description,
  confirmText = "OK",
) {
  return new Promise((resolve) => {
    const dialog = new window.IgnisUI.ConfirmDialog({
      target: document.body,
      props: { title, message, description, confirmText },
    });

    dialog.$on("confirm", () => {
      dialog.$destroy();
      resolve(true);
    });

    dialog.$on("cancel", () => {
      dialog.$destroy();
      resolve(false);
    });
  });
}

export function showPromptDialog(
  title,
  label,
  placeholder = "",
  value = "",
  confirmText = "OK",
) {
  return new Promise((resolve) => {
    const dialog = new window.IgnisUI.PromptDialog({
      target: document.body,
      props: { title, label, placeholder, value, confirmText },
    });

    dialog.$on("confirm", (event) => {
      dialog.$destroy();
      resolve(event.detail);
    });

    dialog.$on("cancel", () => {
      dialog.$destroy();
      resolve(null);
    });
  });
}
