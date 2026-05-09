import { useEffect } from 'react'
import { useJunctionStore } from '../store/junctionStore'

// Connect directly to backend port to avoid Vite WS proxy issues
const WS_BASE = 'ws://localhost:8000'

function makeWs(path, channelName, storeAction) {
  let ws
  let retryTimer
  let alive = true

  function connect() {
    if (!alive) return

    try {
      ws = new WebSocket(`${WS_BASE}${path}`)
    } catch (_) {
      if (alive) retryTimer = setTimeout(connect, 3000)
      return
    }

    ws.onopen = () => {
      useJunctionStore.getState().setConnected(channelName, true)
    }

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        // Always call from current store to avoid stale module refs after HMR
        storeAction(data)
      } catch (_) {}
    }

    ws.onclose = () => {
      useJunctionStore.getState().setConnected(channelName, false)
      if (alive) retryTimer = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      try { ws.close() } catch (_) {}
    }
  }

  connect()

  return () => {
    alive = false
    clearTimeout(retryTimer)
    try { ws?.close() } catch (_) {}
  }
}

let wsCleanups = []

// Initialize WebSocket connections once (not in React effect to avoid HMR issues)
function initWebSockets() {
  // Clean up any existing connections
  wsCleanups.forEach(fn => fn())
  wsCleanups = [
    makeWs('/ws/detection',   'detection',   (d) => useJunctionStore.getState().setDetection(d)),
    makeWs('/ws/signals',     'signals',     (d) => useJunctionStore.getState().setSignals(d)),
    makeWs('/ws/audio',       'audio',       (d) => useJunctionStore.getState().setAudio(d)),
    makeWs('/ws/predictions', 'predictions', (d) => useJunctionStore.getState().setPredictions(d)),
  ]
}

export function useWebSockets() {
  useEffect(() => {
    initWebSockets()
    // No cleanup here — we want persistent connections
    // They'll be cleaned up on page unload naturally
  }, [])
}

export function useKpiPoller() {
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/kpis')
        if (r.ok) useJunctionStore.getState().setKpis(await r.json())
      } catch (_) {}
    }
    poll()
    const id = setInterval(poll, 10000)
    return () => clearInterval(id)
  }, [])
}

export function useWeatherPoller() {
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/weather')
        if (r.ok) useJunctionStore.getState().setWeather(await r.json())
      } catch (_) {}
    }
    poll()
    const id = setInterval(poll, 120000)
    return () => clearInterval(id)
  }, [])
}
