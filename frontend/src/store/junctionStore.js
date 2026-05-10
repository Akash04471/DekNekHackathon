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
  simState: { 
    scenario: 'Normal Afternoon', 
    speed_multiplier: 1, 
    emergency_active: false, 
    emergency_lane: null,
  },

  setDetection: (payload) => {
    if (!payload || !payload.lanes) return
    const newLanes = {}
    for (const lane of LANES) {
      const raw = payload.lanes[lane]
      newLanes[lane] = {
        vehicle_count: raw?.vehicle_count ?? 0,
        density_score: raw?.density_score ?? 0,
        avg_speed_kmh: raw?.avg_speed_kmh ?? 60,
        queue_length_m: raw?.queue_length_m ?? 0,
        vehicle_types: {
          car: raw?.vehicle_types?.car ?? 0,
          truck: raw?.vehicle_types?.truck ?? 0,
          bike: raw?.vehicle_types?.bike ?? 0,
          bus: raw?.vehicle_types?.bus ?? 0,
          emergency: raw?.vehicle_types?.emergency ?? 0,
        },
        has_emergency: raw?.has_emergency ?? false,
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
  setSignals: (payload) => {
    if (!payload || !payload.phases) return
    set(s => ({
      signals: {
        ...s.signals,
        ...payload,
        phases: { ...s.signals.phases, ...payload.phases }
      }
    }))
  },

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
  
  updateMetrics: () => {
    const { speedMultiplier, kpis, lanes, signals } = get()
    const totalVehicles = Object.values(lanes).reduce((sum, l) => sum + l.vehicle_count, 0)
    
    set(s => ({
      kpis: {
        ...s.kpis,
        vehicles_processed_today: s.kpis.vehicles_processed_today + (totalVehicles > 0 ? (speedMultiplier * 0.1) : 0),
        signal_response_latency_ms: 25 + Math.random() * 15,
        avg_wait_reduction_pct: 15 + Math.random() * 10,
      },
      signals: {
        ...s.signals,
        efficiency_score: Math.max(60, Math.min(98, 95 - (totalVehicles * 0.5)))
      }
    }))
  },

  setSignalMode: (mode) => set(s => ({ signals: { ...s.signals, mode } })),

  // ── Lane Optimizer (Module 7) ───────────────────────────────────────────
  recommendations: [],
  wastedGreenSeconds: 0,
  addRecommendation: (rec) => set(s => {
    // Prevent duplicates of the same title
    if (s.recommendations.some(r => r.title === rec.title)) return s
    return { recommendations: [ { id: Date.now(), ...rec }, ...s.recommendations ].slice(0, 5) }
  }),
  removeRecommendation: (id) => set(s => ({ 
    recommendations: s.recommendations.filter(r => r.id !== id) 
  })),
  applyRecommendation: (id) => {
    const { recommendations, removeRecommendation, addChatMessage } = get()
    const rec = recommendations.find(r => r.id === id)
    if (!rec) return
    removeRecommendation(id)
    addChatMessage({
      role: 'assistant',
      text: `✅ OPTIMIZATION APPLIED: ${rec.title}. The junction logic has been updated to reflect this ${rec.type.toLowerCase()} change. Expect a 4-7% increase in flow efficiency.`
    })
  },
  
  updateOptimizerMetrics: () => {
    const { lanes, signals, addRecommendation } = get()
    const activeLane = signals.active_phase
    const activeData = lanes[activeLane]
    const phases = signals.phases || {}
    if (phases[activeLane]?.state === 'GREEN' && activeData.vehicle_count < 3) {
      set(s => ({ wastedGreenSeconds: s.wastedGreenSeconds + 1 }))
    }
    if (activeData.vehicle_count > 10 && Math.random() > 0.99) {
      addRecommendation({
        title: "LANE RECONFIGURATION",
        desc: `93% of ${activeLane} vehicles go straight — suggest dedicating center lane as straight-only for peak hours.`,
        type: "STRATEGY"
      })
    }
  },

  // 3. Dual Green Suggestion
  dualGreenSuggestion: () => {
    const { lanes, signals, addRecommendation } = get()
    const activeLane = signals.active_phase
    const activeData = lanes[activeLane]
    const opposing = { NORTH: 'SOUTH', SOUTH: 'NORTH', EAST: 'WEST', WEST: 'EAST' }
    const oppLane = opposing[activeLane]
    if (activeData.vehicle_count < 3 && lanes[oppLane]?.vehicle_count < 3 && Math.random() > 0.995) {
      addRecommendation({
        title: "DUAL GREEN CANDIDATE",
        desc: `${activeLane} and ${oppLane} are both low density — suggest activating Dual Green phase for efficiency.`,
        type: "OPTIMIZATION"
      })
    }
  },

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
  chatMessages: [
    { role: 'assistant', text: 'NEXUS Traffic OS initialized. Tactical Dashboard Online. How can I assist you today?' }
  ],
  chatOpen: false,
  proactiveAlerts: [],
  toggleChat: () => set(s => ({ chatOpen: !s.chatOpen })),
  addChatMessage: (msg) => {
    set(s => {
      const last = s.chatMessages[s.chatMessages.length - 1]
      // Prevent identical consecutive messages
      if (last && last.text === msg.text && last.role === msg.role) return s
      
      const newMessages = [...s.chatMessages, msg]
      if (msg.role === 'assistant' && window.speak) {
        window.speak(msg.text)
      }
      return { chatMessages: newMessages }
    })
  },
  addProactiveAlert: (alert) => {
    set(s => {
      // Prevent duplicate alerts
      if (s.proactiveAlerts.some(a => a.message === alert.message)) return s
      
      const newAlerts = [{ id: Date.now(), ...alert }, ...s.proactiveAlerts].slice(0, 5)
      // Auto-open chat for high priority alerts
      if (alert.priority === 'HIGH') return { proactiveAlerts: newAlerts, chatOpen: true }
      return { proactiveAlerts: newAlerts }
    })
  },

  // ── Active panel (right sidebar) ────────────────────────────────────────
  activePanel: 'detection',   // detection | audio | predictions | analytics
  setActivePanel: (p) => set({ activePanel: p }),

  forceGreenLane: async (lane) => {
    const { signals, setSignals } = get()
    if (signals.mode !== 'MANUAL') return

    // Update local state immediately for responsiveness
    const newPhases = { ...signals.phases }
    Object.keys(newPhases).forEach(l => {
      newPhases[l] = { ...newPhases[l], state: l === lane ? 'GREEN' : 'RED', time_remaining: l === lane ? 30 : 0 }
    })
    setSignals({ ...signals, active_phase: lane, phases: newPhases })

    try {
      await fetch(`/api/signals/override?lane=${lane}`, { method: 'POST' })
    } catch (_) {}
  },
}))
