import React from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

const SCENARIOS = ['Normal Afternoon', 'Morning Rush', 'Severe Congestion', 'Emergency', 'Late Night']
const SPEEDS = [{ label: '1×', val: 1 }, { label: '5×', val: 5 }, { label: '60×', val: 60 }]
const LANES = ['NORTH', 'EAST', 'SOUTH', 'WEST']

export default function Header() {
  const { connected, scenario, speedMultiplier, setScenario, setSpeed, triggerEmergency, clearEmergency, signals, toggleChat, chatOpen } = useJunctionStore()
  const isEmergency = signals.mode === 'EMERGENCY'
  const allConnected = Object.values(connected).every(Boolean)

  return (
    <header className="app-header glass rounded-2xl flex items-center gap-6 px-6">
      {/* Logo Section */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative group cursor-pointer">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-[0_0_20px_rgba(0,245,255,0.2)]"
            style={{ 
              background: 'rgba(0, 245, 255, 0.05)', 
              border: '1px solid rgba(0, 245, 255, 0.4)',
              backdropFilter: 'blur(10px)'
            }}>
            <span className="text-cyan">⬡</span>
          </motion.div>
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#050816]"
            style={{ 
              background: allConnected ? 'var(--green)' : 'var(--red)', 
              boxShadow: `0 0 10px ${allConnected ? 'var(--green)' : 'var(--red)'}` 
            }} />
        </div>
        <div>
          <div className="font-heading font-black text-sm tracking-[0.25em] text-cyan">NEXUS JUNCTION</div>
          <div className="text-muted text-[8px] font-bold tracking-[0.4em] uppercase opacity-60">AI Traffic OS v4.0</div>
        </div>
      </div>

      <div className="h-8 w-px bg-white/5" />

      {/* Control Hub */}
      <div className="flex items-center gap-6">
        {/* Scenario */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-muted tracking-widest uppercase">Mission Scenario</span>
          <select
            value={scenario}
            onChange={e => setScenario(e.target.value)}
            className="text-[11px] font-bold px-3 py-1.5 rounded-lg outline-none cursor-pointer glass-bright hover:border-cyan/50 transition-all font-heading"
            style={{ color: 'var(--text-primary)' }}
          >
            {SCENARIOS.map(s => <option key={s} value={s} className="bg-bg-deep">{s}</option>)}
          </select>
        </div>

        {/* Speed */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-muted tracking-widest uppercase">Time Scale</span>
          <div className="flex gap-1">
            {SPEEDS.map(s => (
              <button
                key={s.val}
                onClick={() => setSpeed(s.val)}
                className={`text-[10px] px-2.5 py-1 rounded-md border font-bold transition-all duration-300 ${
                  speedMultiplier === s.val ? 'border-cyan text-cyan bg-cyan/10 shadow-[0_0_10px_rgba(0,245,255,0.2)]' : 'border-white/5 text-muted hover:border-white/20'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Emergency Trigger */}
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold text-muted tracking-widest uppercase">Tactical Override</span>
          {!isEmergency ? (
            <div className="flex gap-1">
              {LANES.map(l => (
                <button
                  key={l}
                  onClick={() => triggerEmergency(l)}
                  className="text-[10px] w-7 h-7 flex items-center justify-center rounded-md border border-red/30 text-red hover:bg-red/10 hover:border-red transition-all font-bold"
                  title={`Force Emergency in ${l}`}
                >
                  {l[0]}
                </button>
              ))}
            </div>
          ) : (
            <motion.button
              onClick={clearEmergency}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-[10px] px-4 h-7 rounded-md border border-red text-red bg-red/10 font-bold tracking-widest animate-pulse"
            >
              ABORT EMERGENCY
            </motion.button>
          )}
        </div>
      </div>

      <div className="h-8 w-px bg-white/5" />

      {/* NEXUS AI Trigger */}
      <button 
        onClick={toggleChat}
        className={`flex items-center gap-3 px-6 py-2.5 rounded-xl transition-all duration-500 border ${
          chatOpen 
          ? 'bg-cyan text-bg-deep border-cyan shadow-[0_0_25px_#00F5FF]' 
          : 'bg-cyan/5 text-cyan border-cyan/40 hover:bg-cyan/20 hover:border-cyan hover:shadow-[0_0_15px_rgba(0,245,255,0.3)]'
        }`}
      >
        <div className={`w-2 h-2 rounded-full ${chatOpen ? 'bg-bg-deep' : 'bg-cyan animate-pulse shadow-[0_0_8px_#00F5FF]'}`} />
        <span className="text-[11px] font-black tracking-[0.2em] uppercase">Nexus AI Core</span>
      </button>

      <div className="h-8 w-px bg-white/5" />

      {/* Network Status & Clock */}
      <div className="ml-auto flex items-center gap-6">
        <div className="flex gap-4">
          {Object.entries(connected).map(([ch, ok]) => (
            <div key={ch} className="flex flex-col items-center gap-1">
               <div className="text-[8px] font-bold text-muted uppercase opacity-60">{ch.slice(0,3)}</div>
               <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green shadow-[0_0_8px_var(--green)]' : 'bg-red shadow-[0_0_8px_var(--red)]'}`} />
            </div>
          ))}
        </div>
        
        <div className="h-8 w-px bg-white/5" />
        
        <div className="flex flex-col items-end">
            <div className="text-cyan font-mono text-[13px] font-bold tracking-tighter">
                {new Date().toLocaleTimeString('en-US', { hour12: false })}
            </div>
            <div className="text-[8px] font-bold text-muted uppercase tracking-[0.2em] opacity-40">UTC REALTIME</div>
        </div>
      </div>
    </header>
  )
}
