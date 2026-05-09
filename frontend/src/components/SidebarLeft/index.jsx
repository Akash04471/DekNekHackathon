import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

const MODES = ['ADAPTIVE', 'MANUAL', 'SIMULATION']
const LANES = ['NORTH', 'EAST', 'SOUTH', 'WEST']
const SCENARIOS = ['Morning Rush', 'Normal Afternoon', 'Emergency', 'Severe Congestion', 'Late Night']
const SPEEDS = [{ label: '1×', val: 1 }, { label: '5×', val: 5 }, { label: '60×', val: 60 }]

export default function SidebarLeft() {
  const { kpis, signals, setSignalMode, toggleChat, chatOpen, wastedGreenSeconds, connected } = useJunctionStore()
  const { setScenario, setSpeed, triggerEmergency, clearEmergency, scenario, speedMultiplier } = useJunctionStore()
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const systemStatus = signals.mode === 'EMERGENCY' ? 'EMERGENCY' : 'ONLINE'
  const statusColor = systemStatus === 'EMERGENCY' ? 'var(--red)' : 'var(--green)'

  // Connection status
  const wsConnected = Object.values(connected || {}).some(v => v)

  return (
    <div className="flex flex-col h-full gap-0 overflow-y-auto">
      {/* ── Identity ─────────────────────────────────────────────── */}
      <div className="pb-5 border-b border-white/5 mb-5 shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-cyan/8 border border-cyan/20 flex items-center justify-center">
            <span className="text-cyan text-sm">⬡</span>
          </div>
          <div>
            <h1 className="font-heading font-black text-[11px] tracking-[0.2em] text-white/90">NEXUS JUNCTION</h1>
            <span className="text-[9px] text-muted font-mono">AI Traffic OS v4.0</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-soft" style={{ background: statusColor }} />
            <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: statusColor }}>{systemStatus}</span>
          </div>
          <span className="text-[10px] font-mono text-muted tabular-nums">
            {clock.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>
        {/* WS Connection */}
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-1 h-1 rounded-full ${wsConnected ? 'bg-green' : 'bg-red'}`} />
          <span className="text-[8px] text-muted font-mono">{wsConnected ? 'WEBSOCKET LIVE' : 'RECONNECTING...'}</span>
        </div>
      </div>

      {/* ── Quick Stats ──────────────────────────────────────────── */}
      <div className="mb-5 shrink-0">
        <span className="section-label">System Metrics</span>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Vehicles', val: kpis.vehicles_processed_today || 0 },
            { label: 'Avg Wait', val: '31s', accent: true },
            { label: 'Emergencies', val: '2' },
            { label: 'Efficiency', val: `${signals.efficiency_score}%`, accent: true },
          ].map((s, i) => (
            <div key={i} className="stat-card">
              <span className="text-[8px] font-bold text-muted uppercase tracking-widest block mb-0.5">{s.label}</span>
              <span className={`text-base font-black ${s.accent ? 'text-cyan' : 'text-white'}`}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Wasted Green (Module 7) ──────────────────────────────── */}
      <div className="mb-5 shrink-0">
        <span className="section-label">Wasted Green</span>
        <div className="stat-card flex items-center justify-between">
          <span className="text-[9px] font-bold text-muted">Idle seconds</span>
          <span className="text-sm font-black text-amber font-mono">{wastedGreenSeconds}s</span>
        </div>
      </div>

      {/* ── Simulation Controls ───────────────────────────────────── */}
      <div className="mb-5 shrink-0">
        <span className="section-label">Simulation</span>

        {/* Scenario Presets */}
        <div className="space-y-1 mb-3">
          {SCENARIOS.map(s => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`w-full text-left px-3 py-1.5 rounded-lg text-[9px] font-bold tracking-wide transition-all ${
                scenario === s
                  ? 'bg-cyan/8 text-cyan border border-cyan/20'
                  : 'text-muted hover:text-white/70 border border-transparent'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Speed Control */}
        <div className="flex gap-1.5 mb-3">
          {SPEEDS.map(sp => (
            <button
              key={sp.val}
              onClick={() => setSpeed(sp.val)}
              className={`flex-1 py-1.5 rounded-lg text-[9px] font-heading font-bold transition-all border ${
                speedMultiplier === sp.val
                  ? 'border-cyan/30 bg-cyan/8 text-cyan'
                  : 'border-white/4 text-muted hover:text-white/60'
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>

        {/* Emergency Trigger */}
        <div className="flex gap-1.5">
          <button
            onClick={() => triggerEmergency('NORTH')}
            className="flex-1 py-2 rounded-lg text-[8px] font-heading font-bold tracking-wider bg-red/8 text-red border border-red/20 hover:bg-red/15 transition-all"
          >
            🚨 TRIGGER
          </button>
          <button
            onClick={clearEmergency}
            className="flex-1 py-2 rounded-lg text-[8px] font-heading font-bold tracking-wider bg-white/3 text-muted border border-white/5 hover:bg-white/6 transition-all"
          >
            CLEAR
          </button>
        </div>
      </div>

      {/* ── Lane Focus ───────────────────────────────────────────── */}
      <div className="mb-5 shrink-0">
        <span className="section-label">Tactical Focus</span>
        <div className="grid grid-cols-4 gap-1.5">
          {LANES.map(l => (
            <button
              key={l}
              className="py-2 rounded-lg border border-white/4 text-[8px] font-heading font-bold tracking-wider text-muted hover:border-cyan/20 hover:text-cyan transition-all"
            >
              {l.slice(0, 1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Mode Switcher ────────────────────────────────────────── */}
      <div className="mt-auto shrink-0">
        <span className="section-label">Control Mode</span>
        <div className="flex gap-1.5">
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => setSignalMode(m)}
              className={`flex-1 py-2 rounded-lg text-[8px] font-heading font-bold tracking-wider transition-all border ${
                signals.mode === m
                  ? 'border-cyan/30 bg-cyan/8 text-cyan'
                  : 'border-white/4 text-muted hover:text-white/60'
              }`}
            >
              {m.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

      {/* ── AI Trigger ───────────────────────────────────────────── */}
      <motion.button
        onClick={toggleChat}
        whileTap={{ scale: 0.97 }}
        className={`mt-4 shrink-0 flex items-center justify-center gap-2 py-3 rounded-xl transition-all border text-[9px] font-heading font-bold tracking-[0.15em] ${
          chatOpen
          ? 'bg-cyan/10 text-cyan border-cyan/30'
          : 'bg-white/2 text-muted border-white/5 hover:border-cyan/20 hover:text-cyan'
        }`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${chatOpen ? 'bg-cyan' : 'bg-cyan/40 animate-pulse-soft'}`} />
        NEXUS AI
      </motion.button>
    </div>
  )
}
