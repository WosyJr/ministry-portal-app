const { app, BrowserWindow, WebContentsView, Tray, Menu, shell, session, nativeImage, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const DEFAULT_URL = 'https://koministry.com';
const DISCORD_APP_ID = '1547370252063739944';
const STORE = path.join(app.getPath('userData'), 'settings.json');
const RAIL = 74;
const BAR = 54;
const FOOT = 30;

let win = null;
let view = null;
let tray = null;
let rpc = null;
let rpcReady = false;
let quitting = false;
let updater = null;
const startedAt = Date.now();
let lastHall = { line1: 'Opening the hall', line2: 'Imperial Ministry' };

function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE, 'utf8')) || {}; } catch (_) { return {}; }
}
function writeStore(patch) {
  const next = Object.assign(readStore(), patch);
  try {
    fs.mkdirSync(path.dirname(STORE), { recursive: true });
    fs.writeFileSync(STORE, JSON.stringify(next, null, 2));
  } catch (_) {}
  return next;
}
function pref(key, fallback) {
  const v = readStore()[key];
  return v === undefined ? fallback : v;
}

function siteUrl() {
  const raw = String(readStore().url || DEFAULT_URL).trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(raw) ? raw : 'https://' + raw;
}
function siteHost() {
  try { return new URL(siteUrl()).host.replace(/^www\./, ''); } catch (_) { return ''; }
}
function sameSite(target) {
  try { return new URL(target).host.replace(/^www\./, '') === siteHost(); } catch (_) { return false; }
}
const iconPath = () => path.join(__dirname, 'build', 'icon.png');

function layout() {
  if (!win || win.isDestroyed() || !view) return;
  const b = win.getContentBounds();
  view.setBounds({ x: RAIL, y: BAR, width: Math.max(0, b.width - RAIL), height: Math.max(0, b.height - BAR - FOOT) });
}

function toShell(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function hallOf(urlStr) {
  let p = '/';
  try { p = new URL(urlStr).pathname; } catch (_) {}
  const at = (rail, line1, line2) => ({ rail, line1, line2, path: p });
  if (p.startsWith('/staff/desk') || p === '/staff' || p.startsWith('/staff/letters')) return at('desk', 'Viewing Staff Dashboard', 'Imperial Ministry');
  if (p.startsWith('/records')) return at('docket', 'Reading the Docket', 'Civil & Administrative Affairs');
  if (p.startsWith('/record/')) return at('docket', 'Setting a seal to a record', 'Civil & Administrative Affairs');
  if (p.startsWith('/justice')) return at('justice', 'At the Imperial Bench', 'Ministry of Justice');
  if (p.startsWith('/finance')) return at('finance', 'Over the county purse', 'Ministry of Finance');
  if (p.startsWith('/war-office')) return at('war', 'At the muster roll', 'Imperial War Office');
  if (p.startsWith('/province/staff')) return at('staffroom', 'Behind the Staff Room door', 'Gamemaster');
  if (p.startsWith('/province')) return at('staffroom', 'In the Minister’s Study', 'Imperial Ministry');
  if (p.startsWith('/login') || p.startsWith('/auth')) return at('hall', 'At the door', 'Imperial Ministry');
  return at('hall', 'In the Imperial Ministries', 'Imperial Ministry');
}

function pushPresence() {
  if (!rpc || !rpcReady || !pref('presence', true)) return;
  rpc.user.setActivity({
    details: lastHall.line1,
    state: lastHall.line2,
    startTimestamp: startedAt,
    largeImageKey: 'seal',
    largeImageText: 'The Imperial Ministries of Skyrim',
    instance: false,
    buttons: [{ label: 'Open Ministry Portal', url: siteUrl() }]
  }).catch(() => {});
}

function clearPresence() {
  if (rpc && rpcReady) rpc.user.clearActivity().catch(() => {});
}

async function startPresence() {
  if (rpc || !pref('presence', true)) return;
  try {
    const { Client } = require('@xhayper/discord-rpc');
    rpc = new Client({ clientId: DISCORD_APP_ID });
    rpc.on('ready', () => { rpcReady = true; pushPresence(); });
    await rpc.login();
  } catch (_) {
    rpc = null;
    rpcReady = false;
  }
}

function stopPresence() {
  clearPresence();
  try { if (rpc) rpc.destroy(); } catch (_) {}
  rpc = null;
  rpcReady = false;
}

function go(target) {
  if (!view) return;
  view.webContents.loadURL(target).catch(() => showLocal('offline'));
}

function showLocal(which) {
  if (!view) return;
  view.webContents.loadFile(path.join(__dirname, which + '.html'), { query: { site: siteUrl() } }).catch(() => {});
}

function notify(title, body, goTo) {
  if (!pref('notifications', true) || !Notification.isSupported()) return;
  const n = new Notification({ title, body, icon: iconPath() });
  n.on('click', () => { openWindow(); if (goTo) go(siteUrl() + goTo); });
  n.show();
}

function restoreBounds() {
  const b = readStore().bounds;
  return (b && b.width > 600 && b.height > 420) ? b : { width: 1340, height: 880 };
}
function rememberBounds() {
  if (!win || win.isDestroyed() || win.isMinimized()) return;
  writeStore({ bounds: win.getNormalBounds ? win.getNormalBounds() : win.getBounds(), maximized: win.isMaximized() });
}

async function readSignedIn() {
  if (!view) return;
  try {
    const who = await view.webContents.executeJavaScript(
      '(function(){var e=document.querySelector(".topright");if(!e)return null;' +
      'var t=e.textContent.replace(/\\s+/g," ").trim();' +
      'if(/Staff Entrance/.test(t))return {out:true};' +
      'var m=/^(.+?)\\s*\\u00b7\\s*([^\\u00b7]+?)\\s*(?:Leave the Hall|Profile)/.exec(t);' +
      'return m?{name:m[1].trim(),rank:m[2].trim()}:null;})()',
      true
    );
    toShell('who', who);
  } catch (_) {}
}

async function readState() {
  if (!view) return;
  try {
    const got = await view.webContents.executeJavaScript(
      '(function(){' +
      'var f=document.querySelector(".flash");' +
      'var held=f&&/held here|cannot be reached/i.test(f.textContent);' +
      'var n=0,d=document.querySelector(".deskbtn");' +
      'if(d){var m=/(\\d+)/.exec(d.textContent);if(m)n=parseInt(m[1],10);}' +
      'return {held:!!held,count:n};})()',
      true
    );
    const count = Number(got && got.count) || 0;
    toShell('badge', count);
    toShell('archives', got && got.held
      ? { state: 'held', text: 'Archives held' }
      : { state: 'ok', text: 'Archives answering' });
    if (process.platform === 'win32' && win && !win.isDestroyed()) {
      win.setOverlayIcon(null, count ? count + ' waiting' : '');
    }
    if (tray) tray.setToolTip(count ? 'Ministry Portal — ' + count + ' waiting on you' : 'Ministry Portal');
  } catch (_) {}
}

function onMoved(url) {
  lastHall = hallOf(url);
  pushPresence();
  toShell('where', lastHall);
  readSignedIn();
  readState();
}

function createWindow() {
  win = new BrowserWindow({
    ...restoreBounds(),
    minWidth: 820,
    minHeight: 560,
    title: 'Ministry Portal',
    backgroundColor: '#14100B',
    icon: iconPath(),
    frame: false,
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false }
  });

  win.loadFile(path.join(__dirname, 'shell.html'));
  if (readStore().maximized) win.maximize();
  win.once('ready-to-show', () => win.show());

  view = new WebContentsView({
    webPreferences: {
      partition: 'persist:ministry',
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: true
    }
  });
  win.contentView.addChildView(view);
  layout();

  const wc = view.webContents;

  wc.on('dom-ready', () => {
    wc.insertCSS(
      '.topbar{display:none !important}' +
      '.foot{display:none !important}' +
      '.installbar{display:none !important}' +
      '.wrap{padding-top:8px}'
    ).catch(() => {});
  });

  wc.on('did-start-loading', () => toShell('busy', true));
  wc.on('did-stop-loading', () => toShell('busy', false));
  wc.on('did-navigate', (e, url) => onMoved(url));
  wc.on('did-navigate-in-page', (e, url) => onMoved(url));

  wc.on('did-fail-load', (e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 || code === 0) return;
    showLocal('offline');
    toShell('archives', { state: 'down', text: 'Cannot reach the hall' });
  });

  wc.setWindowOpenHandler(({ url }) => {
    if (sameSite(url)) { go(url); return { action: 'deny' }; }
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  wc.on('will-navigate', (e, url) => {
    if (url.startsWith('file://') || sameSite(url)) return;
    e.preventDefault();
    shell.openExternal(url).catch(() => {});
  });

  win.on('resize', () => { layout(); rememberBounds(); });
  win.on('move', rememberBounds);
  win.on('maximize', () => { layout(); toShell('maximised', true); });
  win.on('unmaximize', () => { layout(); toShell('maximised', false); });

  win.on('close', e => {
    rememberBounds();
    if (!quitting && pref('trayOnClose', true)) { e.preventDefault(); win.hide(); }
  });
  win.on('closed', () => { win = null; view = null; });

  go(siteUrl());
}

function openWindow() {
  if (!win || win.isDestroyed()) { createWindow(); return; }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function handleDeep(url) {
  if (!url || !url.startsWith('ministry://')) return;
  let u;
  try { u = new URL(url); } catch (_) { return; }
  const host = u.host || String(u.pathname || '').replace(/^\/+/, '').split('/')[0];
  if (host === 'auth') {
    const code = u.searchParams.get('code');
    if (code) { openWindow(); go(siteUrl() + '/auth/app/claim?code=' + encodeURIComponent(code)); }
    return;
  }
  openWindow();
  go(siteUrl() + '/' + url.replace(/^ministry:\/\//, '').replace(/^\/+/, ''));
}

function checkUpdates(loud) {
  try {
    if (!updater) {
      updater = require('electron-updater').autoUpdater;
      updater.autoDownload = true;
      updater.autoInstallOnAppQuit = true;
      updater.on('update-downloaded', info => {
        toShell('update', { version: info && info.version });
        notify('A new version is ready', 'Version ' + ((info && info.version) || '') + ' will be in place next time you open the Ministry.');
      });
      updater.on('error', () => { if (loud) notify('Could not look for an update', 'The Ministry could not reach the release list just now.'); });
      updater.on('update-not-available', () => { if (loud) notify('Nothing new', 'You already have the latest version.'); });
    }
    updater.checkForUpdates().catch(() => {});
  } catch (_) {}
}

function refreshTray() {
  if (!tray) return;
  const at = p => () => { openWindow(); go(siteUrl() + p); };
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open the Ministry', click: openWindow },
    { type: 'separator' },
    { label: 'My Desk', click: at('/staff/desk') },
    { label: 'The Docket', click: at('/records') },
    { label: 'Letters', click: at('/staff/letters') },
    { type: 'separator' },
    {
      label: 'Show what I am doing on Discord', type: 'checkbox', checked: pref('presence', true),
      click: i => { writeStore({ presence: i.checked }); if (i.checked) startPresence(); else stopPresence(); refreshTray(); }
    },
    {
      label: 'Notify me on this machine', type: 'checkbox', checked: pref('notifications', true),
      click: i => { writeStore({ notifications: i.checked }); refreshTray(); }
    },
    {
      label: 'Start with Windows', type: 'checkbox', checked: app.getLoginItemSettings().openAtLogin,
      click: i => app.setLoginItemSettings({ openAtLogin: i.checked, args: ['--hidden'] })
    },
    {
      label: 'Keep running when closed', type: 'checkbox', checked: pref('trayOnClose', true),
      click: i => { writeStore({ trayOnClose: i.checked }); refreshTray(); }
    },
    { type: 'separator' },
    { label: 'Check for an update', click: () => checkUpdates(true) },
    { label: 'Change the address…', click: () => { openWindow(); showLocal('settings'); } },
    { label: 'Sign out', click: at('/logout') },
    { type: 'separator' },
    { label: 'Leave the Hall', click: () => { quitting = true; app.quit(); } }
  ]));
}

function buildTray() {
  const img = nativeImage.createFromPath(iconPath()).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('Ministry Portal');
  refreshTray();
  tray.on('click', openWindow);
}

ipcMain.on('win:minimise', () => { if (win) win.minimize(); });
ipcMain.on('win:maximise', () => { if (!win) return; win.isMaximized() ? win.unmaximize() : win.maximize(); });
ipcMain.on('win:close', () => { if (win) win.close(); });
ipcMain.on('nav:go', (e, p) => go(siteUrl() + p));
ipcMain.on('nav:back', () => { if (view && view.webContents.navigationHistory.canGoBack()) view.webContents.navigationHistory.goBack(); });
ipcMain.on('nav:reload', () => { if (view) view.webContents.reload(); });
ipcMain.on('app:settings', () => showLocal('settings'));
ipcMain.on('app:update-restart', () => { try { quitting = true; updater.quitAndInstall(); } catch (_) {} });
ipcMain.on('ministry:retry', () => go(siteUrl()));
ipcMain.on('ministry:set-url', (e, v) => {
  const clean = String(v || '').trim();
  if (!clean) return;
  writeStore({ url: clean });
  refreshTray();
  go(siteUrl());
});
ipcMain.handle('ministry:get-url', () => siteUrl());
ipcMain.handle('app:prefs', () => ({
  presence: pref('presence', true),
  notifications: pref('notifications', true),
  trayOnClose: pref('trayOnClose', true),
  openAtLogin: app.getLoginItemSettings().openAtLogin,
  version: app.getVersion(),
  site: siteUrl()
}));
ipcMain.on('app:set-pref', (e, data) => {
  const key = data && data.key;
  const value = !!(data && data.value);
  if (key === 'openAtLogin') { app.setLoginItemSettings({ openAtLogin: value, args: ['--hidden'] }); refreshTray(); return; }
  if (!key) return;
  writeStore({ [key]: value });
  if (key === 'presence') { if (value) startPresence(); else stopPresence(); }
  refreshTray();
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.setAsDefaultProtocolClient('ministry');

  app.on('second-instance', (e, argv) => {
    openWindow();
    const deep = argv.find(a => a.startsWith('ministry://'));
    if (deep) handleDeep(deep);
  });

  app.on('open-url', (e, url) => { e.preventDefault(); handleDeep(url); });

  app.whenReady().then(() => {
    session.fromPartition('persist:ministry').setPermissionRequestHandler((wc, permission, cb) => {
      cb(permission === 'notifications' || permission === 'clipboard-read' || permission === 'clipboard-sanitized-write');
    });
    createWindow();
    try { buildTray(); } catch (_) { tray = null; }
    startPresence();
    setTimeout(() => checkUpdates(false), 8000);
    setInterval(() => checkUpdates(false), 1000 * 60 * 60 * 6);
    setInterval(readState, 60000);
    const deep = process.argv.find(a => a.startsWith('ministry://'));
    if (deep) handleDeep(deep);
    if (process.argv.includes('--hidden') && pref('trayOnClose', true) && win) win.hide();
  });

  app.on('window-all-closed', () => { if (!pref('trayOnClose', true)) app.quit(); });
  app.on('before-quit', () => { quitting = true; rememberBounds(); stopPresence(); });
}
