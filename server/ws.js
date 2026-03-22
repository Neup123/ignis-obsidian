const { WebSocketServer } = require("ws");
const url = require("url");
const config = require("./config");
const watcher = require("./watcher");

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const params = new url.URL(req.url, "http://localhost").searchParams;
    const vaultId = params.get("vault");

    if (!vaultId || !config.getVaultPath(vaultId)) {
      ws.close(4001, "Invalid or missing vault ID");
      return;
    }

    const vaultPath = config.getVaultPath(vaultId);
    console.log(`[ws] Client connected to vault: ${vaultId}`);

    // Start watching this vault (no-op if already watching)
    watcher.startWatching(vaultId, vaultPath);

    // Per-client listener that forwards events over WebSocket
    const listener = (event) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(event));
      }
    };

    watcher.addListener(vaultId, listener);

    ws.on("close", () => {
      console.log(`[ws] Client disconnected from vault: ${vaultId}`);
      watcher.removeListener(vaultId, listener);
    });
  });

  return wss;
}

module.exports = { setupWebSocket };
