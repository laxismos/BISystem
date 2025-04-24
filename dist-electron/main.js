import { ipcMain, dialog, app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as fs from "fs";
createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
ipcMain.handle("select-directory", () => {
  const result = dialog.showOpenDialogSync({ properties: ["openDirectory"] });
  if (!result) return null;
  const base_path = result[0];
  const dir = fs.readdirSync(base_path);
  var files = [];
  dir.forEach((name) => {
    files.push(path.join(base_path, name));
  });
  return files;
});
ipcMain.handle("read-file", (_, file) => {
  try {
    const buffer = fs.readFileSync(file);
    const fileName = path.basename(file);
    const suffix = file.split(".").at(-1);
    if (suffix == "jpeg" || suffix == "png") {
      var fileType = "image/".concat(suffix);
    } else if (suffix == "jpg") {
      var fileType = "image/jpeg";
    } else {
      var fileType = "application/octet-stream";
    }
    return {
      buffer: buffer.buffer,
      fileName,
      fileType
    };
  } catch (error) {
  }
});
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
