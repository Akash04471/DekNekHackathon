import React from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

const SCENARIOS = ['Normal Afternoon', 'Morning Rush', 'Severe Congestion', 'Emergency', 'Late Night']
const SPEEDS = [{ label: '1×', val: 1 }, { label: '5×', val: 5 }, { label: '60×', val: 60 }]
const LANES = ['NORTH', 'EAST', 'SOUTH', 'WEST']

export default function Header() {
  const { connected, scenario, speedMultiplier, setScenario, setSpeed, triggerEmergency, clearEmergency, signals } = useJunctionStore()
  const isEmergency = signals.mode === 'EMERGENCY'
  const allConnected = Object.values(connected).every(Boolean)

  return (
    <header className="app-header glass rounded-xl flex items-center gap-3 px-4">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="relative">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, #00F5FF20, #A855F720)', border: '1px solid rgba(0,245,255,0.4)' }}>
            ⬡
          </div>
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full"
            style={{ background: allConnected ? '#00FF88' : '#FF4444', boxShadow: `0 0 6px ${allConnected ? '#00FF88' : '#FF4444'}` }} />
        </div>
        <div>
          <div className="font-bold text-sm tracking-widest text-cyan">NEXUS JUNCTION</div>
          <div className="text-muted text-xs" style={{ fontSize: 9 }}>AI TRAFFIC OPTIMIZATION</div>
        </div>
      </div>

      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* Scenario selector */}
      <div className="flex items-center gap-2">
        <span className="text-muted text-xs flex-shrink-0">Scenario</span>
        <select
          value={scenario}
          onChange={e => setScenario(e.target.value)}
          className="text-xs px-2 py-1.5 rounded-lg outline-none cursor-pointer"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#E8F4FF' }}
        >
          {SCENARIOS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Speed control */}
      <div className="flex items-center gap-1.5">
        <span className="text-muted text-xs">Speed</span>
        {SPEEDS.map(s => (
          <button
            key={s.val}
            onClick={() => setSpeed(s.val)}
            className="text-xs px-2 py-1 rounded-md border transition-all"
            style={{
              borderColor: speedMultiplier === s.val ? 'rgba(0,245,255,0.5)' : 'rgba(255,255,255,0.1)',
              color: speedMultiplier === s.val ? '#00F5FF' : '#4A6080',
              background: speedMultiplier === s.val ? 'rgba(0,245,255,0.1)' : 'transparent',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* Emergency controls */}
      <div className="flex items-center gap-2">
        <span className="text-muted text-xs flex-shrink-0">Emergency</span>
        {!isEmergency ? (
          <div className="flex gap-1">
            {LANES.map(l => (
              <button
                key={l}
                onClick={() => triggerEmergency(l)}
                className="text-xs px-2 py-1 rounded-md border border-red/30 text-red hover:bg-red/10 transition-colors"
              >
                {l.slice(0,1)}
              </button>
            ))}
          </div>
        ) : (
          <motion.button
            onClick={clearEmergency}
            className="text-xs px-3 py-1 rounded-md border border-green/40 text-green animate-blink-red"
            whileHover={{ scale: 1.05 }}
          >
            CLEAR
          </motion.button>
        )}
      </div>

      {/* Connection indicators */}
      <div className="ml-auto flex items-center gap-3 flex-shrink-0">
        {Object.entries(connected).map(([ch, ok]) => (
          <div key={ch} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{
              background: ok ? '#00FF88' : '#FF4444',
              boxShadow: ok ? '0 0 4px #00FF88' : '0 0 4px #FF4444',
            }} />
            <span className="text-muted" style={{ fontSize: 9 }}>{ch.slice(0,3).toUpperCase()}</span>
          </div>
        ))}
        <div className="text-muted text-xs font-mono">{new Date().toLocaleTimeString()}</div>
      </div>
    </header>
  )
}
