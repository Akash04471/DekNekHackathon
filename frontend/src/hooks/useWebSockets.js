import { useEffect, useRef } from 'react'
import { useJunctionStore } from '../store/junctionStore'

const WS_BASE = 'ws://localhost:8080'

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

function initWebSockets() {
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
  }, [])
}

// Also poll /api/lanes every 2s as a reliable fallback for lane data
// This ensures data is always fresh even if the detection WebSocket has issues
export function useKpiPoller() {
  useEffect(() => {
    const pollKpis = async () => {
      try {
        const r = await fetch('/api/kpis')
        if (r.ok) useJunctionStore.getState().setKpis(await r.json())
      } catch (_) {}
    }
    pollKpis()
    const id = setInterval(pollKpis, 10000)
    return () => clearInterval(id)
  }, [])
}

// Poll lanes as fallback to ensure data always flows
export function useLanePoller() {
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/lanes')
        if (r.ok) {
          const data = await r.json()
          useJunctionStore.getState().setDetection({ lanes: data })
        }
      } catch (_) {}
    }
    poll()
    const id = setInterval(poll, 2000)
    return () => clearInterval(id)
  }, [])
}

// Poll audio status as fallback
export function useAudioPoller() {
  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/api/audio/status')
        if (r.ok) {
          const data = await r.json()
          useJunctionStore.getState().setAudio(data)
        }
      } catch (_) {}
    }
    poll()
    const id = setInterval(poll, 1000)
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
