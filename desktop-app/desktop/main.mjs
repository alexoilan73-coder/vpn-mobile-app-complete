import { app, BrowserWindow, dialog } from "electron";
import { createServer } from "node:net";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Could not reserve a local app port.");
  }
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  return address.port;
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The local server may still be starting.
    }
    await delay(250);
  }
  throw new Error("The local app server did not become ready.");
}

async function startDesktopApp() {
  const port = await getAvailablePort();
  const origin = `http://127.0.0.1:${port}`;
  process.env.NODE_ENV = "production";
  process.env.NITRO_HOST = "127.0.0.1";
  process.env.NITRO_PORT = String(port);
  process.env.PORT = String(port);

  const serverEntry = join(app.getAppPath(), ".output", "server", "index.mjs");
  await import(pathToFileURL(serverEntry).href);
  await waitForServer(origin);

  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  await window.loadURL(origin);
}

app.whenReady().then(startDesktopApp).catch((error) => {
  dialog.showErrorBox("Автоэфир не удалось запустить", error.message);
  app.quit();
});

app.on("window-all-closed", () => app.quit());
