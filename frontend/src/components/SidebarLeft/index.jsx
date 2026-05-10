import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'
const MODES = ['ADAPTIVE', 'MANUAL', 'SIMULATION']
const LANES = ['NORTH', 'EAST', 'SOUTH', 'WEST']
const SCENARIOS = ['Morning Rush', 'Normal Afternoon', 'Emergency', 'Severe Congestion', 'Late Night']
const SPEEDS = [{ label: '1×', val: 1 }, { label: '5×', val: 5 }, { label: '60×', val: 60 }]

export default function SidebarLeft() {
  const { kpis, signals, setSignalMode, toggleChat, chatOpen, connected } = useJunctionStore()
  const { setScenario, setSpeed, triggerEmergency, clearEmergency, scenario, speedMultiplier } = useJunctionStore()
  const [clock, setClock] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const systemStatus = signals.mode === 'EMERGENCY' ? 'EMERGENCY' : 'ONLINE'
  const statusColor = systemStatus === 'EMERGENCY' ? 'var(--red)' : 'var(--green)'
  const wsConnected = Object.values(connected || {}).some(v => v)

  return (
    <div className="flex flex-col h-full gap-8 overflow-y-auto pr-1">
      {/* ── Identity ─────────────────────────────────────────────── */}
      <div className="shrink-0">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-cyan/10 border border-cyan/20 flex items-center justify-center shadow-[0_0_15px_rgba(0,212,224,0.1)]">
            <span className="text-cyan text-lg">⬡</span>
          </div>
          <div>
            <h1 className="font-heading font-black text-[12px] tracking-[0.25em] text-white">NEXUS JUNCTION</h1>
            <span className="text-[9px] text-muted font-mono uppercase tracking-widest">AI Traffic OS v4.0</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between px-1">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
              <span className="text-[10px] font-black uppercase tracking-[0.1em]" style={{ color: statusColor }}>{systemStatus}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-1 h-1 rounded-full ${wsConnected ? 'bg-green' : 'bg-red'}`} />
              <span className="text-[7px] text-muted font-mono tracking-wider">{wsConnected ? 'WEBSOCKET ACTIVE' : 'NETWORK OFFLINE'}</span>
            </div>
          </div>
          <span className="text-[12px] font-mono text-white/80 tabular-nums font-bold">
            {clock.toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>

        {/* AI Assistant Toggle (Moved for visibility) */}
        <motion.button
          onClick={() => {
            console.log('Nexus AI Clicked')
            toggleChat()
          }}
          whileHover={{ scale: 1.02, boxShadow: '0 0 25px rgba(0, 212, 224, 0.4)' }}
          whileTap={{ scale: 0.95 }}
          className={`w-full mt-6 relative flex items-center justify-center gap-3 py-5 rounded-2xl transition-all border text-[11px] font-heading font-black tracking-[0.3em] overflow-hidden group pointer-events-auto ${
            chatOpen
            ? 'bg-cyan text-black border-cyan shadow-[0_0_40px_rgba(0,212,224,0.4)]'
            : 'bg-black/40 text-cyan border-cyan/20 hover:border-cyan/40 shadow-xl'
          }`}
          style={{ zIndex: 99999 }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <div className={`w-2.5 h-2.5 rounded-full ${chatOpen ? 'bg-black animate-pulse' : 'bg-cyan animate-pulse-soft'}`} />
          <span>NEXUS AI</span>
        </motion.button>
      </div>

      {/* ── Quick Stats ──────────────────────────────────────────── */}
      <div className="shrink-0">
        <span className="section-label">Performance Metrics</span>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {[
            { label: 'Total Load', val: Math.floor(kpis.vehicles_processed_today || 0), unit: 'u' },
            { label: 'Avg Latency', val: `${Math.round(kpis.signal_response_latency_ms || 31)}ms`, accent: true },
            { label: 'Resolved', val: '2', unit: 'inc' },
            { label: 'Efficiency', val: `${Math.round(signals.efficiency_score)}%`, accent: true },
          ].map((s, i) => (
            <div key={i} className="stat-card group hover:bg-white/5 transition-all">
              <span className="text-[8px] font-bold text-muted uppercase tracking-[0.15em] block mb-1">{s.label}</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-lg font-black ${s.accent ? 'text-cyan' : 'text-white'}`}>{s.val}</span>
                {s.unit && <span className="text-[8px] text-muted font-mono">{s.unit}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* ── Simulation Controls ───────────────────────────────────── */}
      <div className="shrink-0">
        <span className="section-label">Simulation Engine</span>
        
        <div className="space-y-1.5 mt-4 mb-4">
          {SCENARIOS.map(s => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold tracking-wider transition-all border ${
                scenario === s
                  ? 'bg-cyan/10 text-cyan border-cyan/30 shadow-[0_0_15px_rgba(0,212,224,0.05)]'
                  : 'text-muted border-white/5 hover:border-white/10 hover:text-white/80'
              }`}
            >
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          {SPEEDS.map(sp => (
            <button
              key={sp.val}
              onClick={() => setSpeed(sp.val)}
              className={`flex-1 py-2 rounded-xl text-[10px] font-heading font-black transition-all border ${
                speedMultiplier === sp.val
                  ? 'border-cyan/40 bg-cyan/15 text-cyan'
                  : 'border-white/5 text-muted hover:border-white/10 hover:text-white/60'
              }`}
            >
              {sp.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => triggerEmergency('NORTH')}
            className="flex-[1.5] py-3 rounded-xl text-[9px] font-heading font-black tracking-[0.2em] bg-red/10 text-red border border-red/30 hover:bg-red/20 transition-all shadow-[0_0_20px_rgba(248,113,113,0.1)]"
          >
            🚨 TRIGGER
          </button>
          <button
            onClick={clearEmergency}
            className="flex-1 py-3 rounded-xl text-[9px] font-heading font-black tracking-[0.2em] bg-white/5 text-muted border border-white/10 hover:bg-white/10 transition-all"
          >
            CLEAR
          </button>
        </div>
      </div>

      {/* ── Tactical Lane Control ─────────────────────────────────── */}
      <div className="shrink-0">
        <span className="section-label">Tactical Focus</span>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {LANES.map(l => {
            const isActive = signals.mode === 'EMERGENCY' && signals.emergency_lane === l
            return (
              <button
                key={l}
                onClick={() => triggerEmergency(l)}
                className={`h-10 rounded-xl border text-[10px] font-heading font-black transition-all ${
                  isActive 
                  ? 'border-red bg-red/20 text-red shadow-[0_0_15px_rgba(255,0,0,0.3)]'
                  : 'border-white/5 text-muted hover:border-cyan/30 hover:text-cyan'
                }`}
              >
                {l.slice(0, 1)}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Global Mode Switcher ──────────────────────────────────── */}
      <div className="mt-auto shrink-0 pt-4 border-t border-white/5">
        <span className="section-label">System Control Mode</span>
        <div className="flex gap-2 mt-4">
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => setSignalMode(m)}
              className={`flex-1 py-3 rounded-xl text-[9px] font-heading font-black tracking-widest transition-all border ${
                signals.mode === m
                  ? 'border-cyan/40 bg-cyan/15 text-cyan'
                  : 'border-white/5 text-muted hover:border-white/10 hover:text-white/60'
              }`}
            >
              {m.slice(0, 4)}
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
