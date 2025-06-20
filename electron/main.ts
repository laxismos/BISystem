import { app, BrowserWindow, dialog, ipcMain } from 'electron'
// import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import * as fs from 'fs'
import ExcelJS from 'exceljs'
import { Jimp } from 'jimp'

// const require = createRequire(import.meta.url)
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

async function saveExcel(excelWorkbook: ExcelJS.Workbook, toPath?: string) {
  const date = new Date()
  const formatName = `${date.getFullYear()}_${date.getMonth()}_${date.getDay()}_${date.getHours()}_${date.getMinutes()}_${date.getSeconds()}.xlsx`
  console.log(formatName)
  excelWorkbook.xlsx.writeFile(toPath ? path.join(toPath, formatName) : path.join(app.getPath('documents'), formatName))
}

async function writeToExcel(fp: PredictData[], baseWorkbook?: ExcelJS.Workbook,  newWorkSheet?:ExcelJS.Worksheet, toPath?:string) {
  fp.sort((a, b)=>{
    return a.image_name.localeCompare(b.image_name)
  })
  const workbook = baseWorkbook ? baseWorkbook : new ExcelJS.Workbook()
  const worksheet = newWorkSheet ? newWorkSheet : workbook.addWorksheet('表1')
  worksheet.columns = [
    { header: '图片名称/路径', key: 'name', width: 40},
    { header: '任务类型', key: 'type', width: 15},
    { header: '识别结果', key: 'content'},
  ]
  let lastImageName = ''
  let curLine = 2
  for (let i=0; i<fp.length; i++) {
    let pd = fp[i]
    if (lastImageName != pd.image_name) {
      while ((curLine-2)%4 != 0) {
        curLine += 1
      }
      worksheet.mergeCells(`A${curLine}:A${curLine+3}`)
      if (pd.orgin_path) {
        const imgSuffix= pd.image_name.split('.').at(-1)?.toLocaleLowerCase()
        const imgType = imgSuffix == 'jpg' || imgSuffix == 'jpeg' ? 'jpeg' : 'png'
        const img = (await Jimp.read(pd.orgin_path!)).resize({w:128})
        const buf = await img.getBuffer(imgType == 'jpeg' ? 'image/jpeg' : 'image/png')
        const imgId = workbook.addImage({
          extension: imgType,
          buffer: buf as unknown as ArrayBuffer
        })
        worksheet.mergeCells(`D${curLine}:E${curLine+3}`)
        worksheet.addImage(imgId, `D${curLine}:E${curLine+3}`)
      }
    }
    const row = worksheet.getRow(curLine)
    row.getCell('name').value = pd.orgin_path ? pd.orgin_path : pd.image_name
    row.getCell('type').value = pd.type
    row.getCell('content').value = pd.content
    curLine += 1
    lastImageName = fp[i].image_name
  }
  if (!baseWorkbook) {
    saveExcel(workbook, toPath)
  }
}

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
    const suffix = file.split('.').at(-1)?.toLocaleLowerCase()
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

ipcMain.handle('write-to-excel', async (_, val: string, many_sheet:boolean)=>{
  const fp:PredictData[] = JSON.parse(val)
  if (many_sheet==false) {
    writeToExcel(fp)
  } else {
    let sub:PredictData[] = []
    fp.sort((a, b)=>{
      return a.type.localeCompare(b.type)
    })
    let lastType = fp[0].type
    const workbook = new ExcelJS.Workbook()
    let worksheet = workbook.addWorksheet(`表_${lastType}`)
    for (let i=0; i<fp.length; i++) {
      const pd = fp[i]
      if (lastType != pd.type) {
        await writeToExcel(sub, workbook, worksheet)
        lastType = pd.type
        worksheet = workbook.addWorksheet(`表_${lastType}`)
        sub.length = 0
      }
      sub.push(pd)
    }
    await writeToExcel(sub, workbook, worksheet)
    saveExcel(workbook)

  }
  
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
