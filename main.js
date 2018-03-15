// jshint esversion:6, node:true
const {app, BrowserWindow, dialog, globalShortcut} = require('electron');
const path = require('path');
const url = require('url');

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

let ARG_ABBR = {
  "-u": "--username",
  "-p": "--password",
  "-r": "--route",
  "-D": "--debug",
  "-h": "--help",
};
let OPT = ["username", "password", "route"];

function parseArgs() {
  let config = {};
  let curopt = null;

  for (let arg of process.argv.slice(2)) {
    if (arg[0] === '-') {
      if (arg in ARG_ABBR) { arg = ARG_ABBR[arg]; }
      if (arg === "--debug") { config.debug = true; continue }
      if (arg === "--help") { displayHelpAndExit(); }
      if (!OPT.includes(arg.substr(2))) { displayHelpAndExit("Unknown option(s)"); }
      curopt = arg.substr(2);
    } else {
      if (curopt) {
        config[curopt] = arg;
      } else {
        if (config.ktbs) { displayHelpAndExit("Too many URLs"); }
        config.ktbs = arg;
      }
      curopt = null;
    }
  }
  if (!config.ktbs) { displayHelpAndExit("No URL provided"); }
  return config;
}

function displayHelpAndExit(message) {
  if (message) { console.log(message); }
  console.log("usage: electron main.js [options] <ktbs-url>");
  console.log("options:");
  console.log(" -u/--username <username> : if your kTBS requires authentication");
  console.log(" -p/--password <password> : if your kTBS requires authentication");
  console.log(" -r/--route    <route>    : to jump directly to a specific view");
  console.log(" -D/--debug               : open developer tools in all windows");
  console.log(" -h/--help                : displays this help message");
  app.exit(message && 1 || 0);
}

function createMainWindow () {
    // Create the browser window.
    win = new BrowserWindow({width: 1600, height: 1200});
    let hash = "";
    if (CONFIG.route) {
      hash = "#" + CONFIG.route;
    }
    // and load the index.html of the app.
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true,
        hash: hash,
    }));

    // Emitted when the window is closed.
    win.on('closed', () => {
        // Dereference the window object, usually you would store windows
        // in an array if your app supports multi windows, this is the time
        // when you should delete the corresponding element.
        win = null;
    });
}

let CONFIG = parseArgs();

if (CONFIG.debug) {
    app.on('browser-window-created', (event, window) => {
        window.webContents.openDevTools();
    });
}

// provide credentials from CONFIG whenever required to
app.on('login', (event, webContents, request, authInfo, callback) => {
    if (CONFIG.username && CONFIG.password) {
        event.preventDefault();
        let pw = CONFIG.password;
        CONFIG.password = null;
        callback(CONFIG.username, pw);
    } else {
        dialog.showMessageBox(win, {
            type: "error",
            title: "Authentication required",
            message: "You should provide credentials as command-line arguments",
            detail: "If you did, it seems they are incorrect...",
        });
        win.close();
    }
});

app.on('web-contents-created', (event, webContents) => {
    function sendKtbsUrl() {
        webContents.send('ktbs', CONFIG.ktbs);
    }
    webContents.on('did-finish-load', sendKtbsUrl);
    webContents.on('devtool-reload-page', sendKtbsUrl);
});

app.on('ready', createMainWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (win === null) {
        createMainWindow();
    }
});
