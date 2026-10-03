const { contextBridge, ipcRenderer } = require('electron');

const on = (channel, fn) => ipcRenderer.on(channel, (e, payload) => fn(payload));

if (location.protocol === 'file:') {
  contextBridge.exposeInMainWorld('ministry', {
    retry: () => ipcRenderer.send('ministry:retry'),
    setUrl: v => ipcRenderer.send('ministry:set-url', v),
    getUrl: () => ipcRenderer.invoke('ministry:get-url'),

    minimise: () => ipcRenderer.send('win:minimise'),
    maximise: () => ipcRenderer.send('win:maximise'),
    close: () => ipcRenderer.send('win:close'),

    go: p => ipcRenderer.send('nav:go', p),
    back: () => ipcRenderer.send('nav:back'),
    reload: () => ipcRenderer.send('nav:reload'),
    settings: () => ipcRenderer.send('app:settings'),
    restart: () => ipcRenderer.send('app:update-restart'),

    prefs: () => ipcRenderer.invoke('app:prefs'),
    setPref: (key, value) => ipcRenderer.send('app:set-pref', { key, value }),

    onWhere: fn => on('where', fn),
    onWho: fn => on('who', fn),
    onBadge: fn => on('badge', fn),
    onArchives: fn => on('archives', fn),
    onBusy: fn => on('busy', fn),
    onMaximised: fn => on('maximised', fn),
    onUpdate: fn => on('update', fn)
  });
}
