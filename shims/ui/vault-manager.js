export function showVaultManager() {
  if (!document.querySelector(".workspace")) return;
  if (document.querySelector(".vault-manager-overlay")) return;

  new window.IgnisUI.VaultManager({
    target: document.body,
  });
}
