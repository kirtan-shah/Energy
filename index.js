const electron = require('electron')

const {app, BrowserWindow} = require('electron')

// keep global ref to window to prevent GC
let win

function createWindow () {

    win = new BrowserWindow({width: 800, height: 600})
    win.loadFile('index.html')

    // Open the DevTools.
    win.webContents.openDevTools()

    win.on('closed', () => {
        // dereference window objects
        win = null
    })
}

// after electron init
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // keep app open on macOS
    if (process.platform !== 'darwin') {
      app.quit()
    }
})

app.on('activate', () => {
    // recreate window on macOS
    if (win === null) {
        createWindow()
    }
});
