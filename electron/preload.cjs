const { contextBridge, ipcRenderer } = require('electron')

try {
  contextBridge.exposeInMainWorld('api', {
    openFile: async () => ipcRenderer.invoke('open-file'),
    saveFile: async (payload) => ipcRenderer.invoke('save-file', payload),
    runCode: async (payload) => ipcRenderer.invoke('run-code', payload),
    checkTools: async () => ipcRenderer.invoke('check-tools'),
    // Interactive run API
    startRun: async (payload) => ipcRenderer.invoke('start-run', payload),
    sendInput: async (payload) => ipcRenderer.invoke('send-stdin', payload),
    stopRun: async (payload) => ipcRenderer.invoke('stop-run', payload),
    onRunOutput: (handler) => {
      const fn = (_event, msg) => {
        try { handler && handler(msg) } catch {}
      }
      ipcRenderer.on('run-output', fn)
      return () => {
        try { ipcRenderer.removeListener('run-output', fn) } catch {}
      }
    },
    onRunExit: (handler) => {
      const fn = (_event, msg) => {
        try { handler && handler(msg) } catch {}
      }
      ipcRenderer.on('run-exit', fn)
      return () => {
        try { ipcRenderer.removeListener('run-exit', fn) } catch {}
      }
    }
  })
} catch (e) {
  // In case of preload failure, do nothing; renderer will detect missing API and inform the user.
}
const { contextBridge, ipcRenderer } = require('electron');

try {
  contextBridge.exposeInMainWorld('api', {
    openFile: async () => ipcRenderer.invoke('open-file'),
    saveFile: async (payload) => ipcRenderer.invoke('save-file', payload),
    runCode: async (payload) => ipcRenderer.invoke('run-code', payload),
    // New interactive run API
    startRun: async (payload) => ipcRenderer.invoke('start-run', payload),
    sendInput: async ({ sessionId, data }) => ipcRenderer.invoke('send-stdin', { sessionId, data }),
    stopRun: async ({ sessionId }) => ipcRenderer.invoke('stop-run', { sessionId }),
    onRunOutput: (cb) => {
      const handler = (_event, msg) => cb && cb(msg)
      ipcRenderer.on('run-output', handler)
      return () => ipcRenderer.removeListener('run-output', handler)
    },
    onRunExit: (cb) => {
      const handler = (_event, msg) => cb && cb(msg)
      ipcRenderer.on('run-exit', handler)
      return () => ipcRenderer.removeListener('run-exit', handler)
    },
    checkTools: async () => ipcRenderer.invoke('check-tools')
  });
} catch (e) {
  // Renderer detects missing API and informs the user; log for diagnostics.
  console.error('Preload failed to expose API:', e && e.message ? e.message : e);
}
