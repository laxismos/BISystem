import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as fs from 'fs'
import ExcelJS from 'exceljs'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

ipcMain.handle('select-files', ()=>{
  const result = dialog.showOpenDialogSync({properties: ['openFile', 'multiSelections']})
  if (!result) return []
  return result
})

ipcMain.handle('select-directory', ()=>{
  const result = dialog.showOpenDialogSync({properties: ['openDirectory']})
  if (!result) return []
  const base_path = result[0]
  const dir = fs.readdirSync(base_path)
  var files:string[] = []
  dir.forEach((name)=>{
    files.push(path.join(base_path, name))
  })
  return files
})

ipcMain.handle('read-file', (_, file: string)=>{
  try {
    const buffer = fs.readFileSync(file)
    const fileName = path.basename(file)
    const suffix = file.split('.').at(-1)
    if (suffix == 'jpeg' || suffix == 'png') {
      var fileType = 'image/'.concat(suffix)
    } else if(suffix == 'jpg'){
      var fileType = 'image/jpeg'
    } else {
      var fileType = 'application/octet-stream'
    }
    return {
      buffer: buffer.buffer,
      fileName,
      fileType
    }
  } catch (error) {
    
  }
})

ipcMain.handle('write-to-excel', (_, fp: string)=>{
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('表1')
  const imgId = workbook.addImage({
    extension: 'jpeg',
    filename: fp
  })
  worksheet.addImage(imgId, {
      tl: {col: 0, row: 0},
      ext: {width: 180, height: 320}
  })
  const p = app.getPath("documents")
  workbook.xlsx.writeFile(path.join(p, 'test.xlsx'))
})

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(createWindow)
