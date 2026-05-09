import { create } from 'zustand'

const LANES = ['NORTH', 'EAST', 'SOUTH', 'WEST']

const defaultLane = () => ({
  vehicle_count: 0,
  density_score: 0,
  avg_speed_kmh: 60,
  queue_length_m: 0,
  vehicle_types: { car: 0, truck: 0, bike: 0, bus: 0, emergency: 0 },
  has_emergency: false,
})

const defaultSignal = () => ({
  state: 'RED',
  time_remaining: 30,
  green_duration: 30,
  next_green_in: 0,
})

export const useJunctionStore = create((set, get) => ({
  // ── Connection ──────────────────────────────────────────────────────────
  connected: { detection: false, signals: false, audio: false, predictions: false },
  setConnected: (channel, val) =>
    set(s => ({ connected: { ...s.connected, [channel]: val } })),

  // ── Lane detection data ─────────────────────────────────────────────────
  lanes: Object.fromEntries(LANES.map(l => [l, defaultLane()])),
  simState: { scenario: 'Normal Afternoon', speed_multiplier: 1, emergency_active: false, emergency_lane: null },

  setDetection: (payload) => {
    if (!payload || !payload.lanes) return
    // Force a new object reference for each lane to ensure Zustand detects the change
    const newLanes = {}
    for (const lane of LANES) {
      const raw = payload.lanes[lane]
      if (!raw) {
        newLanes[lane] = defaultLane()
        continue
      }
      newLanes[lane] = {
        vehicle_count: raw.vehicle_count ?? 0,
        density_score: raw.density_score ?? 0,
        avg_speed_kmh: raw.avg_speed_kmh ?? 60,
        queue_length_m: raw.queue_length_m ?? 0,
        vehicle_types: {
          car: raw.vehicle_types?.car ?? 0,
          truck: raw.vehicle_types?.truck ?? 0,
          bike: raw.vehicle_types?.bike ?? 0,
          bus: raw.vehicle_types?.bus ?? 0,
          emergency: raw.vehicle_types?.emergency ?? 0,
        },
        has_emergency: raw.has_emergency ?? false,
      }
    }
    set({
      lanes: newLanes,
      simState: payload.sim_state || get().simState,
    })
  },

  // ── Signal state ────────────────────────────────────────────────────────
  signals: {
    timestamp: Date.now() / 1000,
    cycle_number: 0,
    active_phase: 'NORTH',
    phases: Object.fromEntries(LANES.map(l => [l, defaultSignal()])),
    mode: 'ADAPTIVE',
    efficiency_score: 75,
    emergency_lane: null,
    emergency_eta: null,
    green_wave: [],
  },
  setSignals: (payload) => set({ signals: payload }),

  // ── Audio state ─────────────────────────────────────────────────────────
  audio: {
    siren_detected: false,
    sound_class: 'ambient',
    db_level: 38,
    estimated_distance_m: 500,
    estimated_eta_seconds: 999,
    urgency: 'CLEAR',
    approaching: false,
    confidence: 0,
    timestamp: Date.now() / 1000,
  },
  dbHistory: [],  // last 60 readings
  setAudio: (payload) => set(s => {
    const hist = [...s.dbHistory, { t: payload.timestamp, db: payload.db_level }]
    return {
      audio: { ...payload },
      dbHistory: hist.slice(-60),
    }
  }),

  // ── Predictions ─────────────────────────────────────────────────────────
  predictions: { forecasts: {}, mape_score: 89 },
  setPredictions: (payload) => set({ predictions: payload }),

  // ── KPIs ────────────────────────────────────────────────────────────────
  kpis: {
    signal_response_latency_ms: 0,
    emergency_detection_time_s: 0,
    avg_wait_reduction_pct: 0,
    prediction_accuracy_pct: 0,
    uptime_pct: 99.9,
    uptime_seconds: 0,
    vehicles_processed_today: 0,
  },
  setKpis: (kpis) => set({ kpis }),

  // ── Simulation controls ─────────────────────────────────────────────────
  scenario: 'Normal Afternoon',
  speedMultiplier: 1,
  setScenario: async (scenario) => {
    set({ scenario })
    try {
      await fetch(`/api/sim/scenario?scenario=${encodeURIComponent(scenario)}`, { method: 'POST' })
    } catch (_) {}
  },
  setSpeed: async (mult) => {
    set({ speedMultiplier: mult })
    try {
      await fetch(`/api/sim/speed?multiplier=${mult}`, { method: 'POST' })
    } catch (_) {}
  },
  triggerEmergency: async (lane = 'NORTH') => {
    try {
      await fetch(`/api/sim/emergency?lane=${lane}`, { method: 'POST' })
    } catch (_) {}
  },
  clearEmergency: async () => {
    try {
      await fetch('/api/sim/clear_emergency', { method: 'POST' })
    } catch (_) {}
  },

  // ── Chat ────────────────────────────────────────────────────────────────
  chatOpen: false,
  chatMessages: [
    { role: 'assistant', text: 'Hello! I\'m NEXUS AI. Ask me about traffic, predictions, or system status.' }
  ],
  toggleChat: () => set(s => ({ chatOpen: !s.chatOpen })),
  addChatMessage: (msg) => set(s => ({ chatMessages: [...s.chatMessages, msg] })),

  // ── Weather ─────────────────────────────────────────────────────────────
  weather: null,
  setWeather: (w) => set({ weather: w }),

  // ── Active panel (right sidebar) ────────────────────────────────────────
  activePanel: 'detection',   // detection | audio | predictions | analytics
  setActivePanel: (p) => set({ activePanel: p }),
}))
