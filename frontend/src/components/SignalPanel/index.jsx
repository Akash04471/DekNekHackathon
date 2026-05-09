import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

const LANE_COLORS = { NORTH: '#00F5FF', EAST: '#00FF88', SOUTH: '#FFB800', WEST: '#A855F7' }

function CountdownRing({ remaining, total, color }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const pct = total > 0 ? remaining / total : 0
  const dash = circ * pct

  return (
    <svg width="70" height="70" viewBox="0 0 70 70">
      <circle cx="35" cy="35" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx="35" cy="35" r={r}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 35 35)"
        style={{ transition: 'stroke-dasharray 0.5s ease', filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x="35" y="40" textAnchor="middle" fill={color} fontSize="14" fontFamily="JetBrains Mono" fontWeight="700">
        {Math.ceil(remaining)}s
      </text>
    </svg>
  )
}

function SignalCard({ lane, phase }) {
  const color = LANE_COLORS[lane]
  const stateClass = phase.state === 'GREEN' ? 'signal-green' : phase.state === 'YELLOW' ? 'signal-yellow' : 'signal-red'

  return (
    <motion.div
      className={`glass rounded-xl p-3 border ${stateClass}`}
      animate={{ boxShadow: phase.state === 'GREEN'
        ? '0 0 16px rgba(0,255,136,0.3)'
        : phase.state === 'YELLOW'
        ? '0 0 16px rgba(255,184,0,0.3)'
        : 'none'
      }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          <span className="font-semibold text-xs tracking-widest" style={{ color }}>{lane}</span>
        </div>
        <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${stateClass}`}>
          {phase.state}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <CountdownRing
          remaining={phase.time_remaining}
          total={phase.green_duration}
          color={phase.state === 'GREEN' ? '#00FF88' : phase.state === 'YELLOW' ? '#FFB800' : '#FF4444'}
        />
        <div className="text-right">
          <div className="text-muted text-xs mb-1">Duration</div>
          <div className="font-mono text-sm" style={{ color }}>{Math.ceil(phase.green_duration)}s</div>
          {phase.state === 'RED' && (
            <>
              <div className="text-muted text-xs mt-1">Next green</div>
              <div className="font-mono text-xs text-amber">{Math.ceil(phase.next_green_in)}s</div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function SignalPanel() {
  const signals = useJunctionStore(s => s.signals)
  const phases = signals.phases || {}

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="panel-header">
        <div className="dot" />
        <span>Signal Controller</span>
        <div className="ml-auto flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded font-mono ${signals.mode === 'EMERGENCY' ? 'text-red border border-red animate-blink-red' : 'text-cyan'}`}>
            {signals.mode}
          </span>
          <span className="text-muted text-xs">#{signals.cycle_number}</span>
        </div>
      </div>

      <div className="p-2 grid grid-cols-2 gap-2">
        {['NORTH','EAST','SOUTH','WEST'].map(lane => (
          <SignalCard key={lane} lane={lane} phase={phases[lane] || {}} />
        ))}
      </div>

      <div className="px-3 pb-3 flex items-center justify-between">
        <span className="text-muted text-xs">Efficiency</span>
        <div className="flex items-center gap-2">
          <div className="h-1 w-24 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-cyan"
              animate={{ width: `${signals.efficiency_score}%` }}
              style={{ boxShadow: '0 0 6px #00F5FF' }}
            />
          </div>
          <span className="font-mono text-xs text-cyan">{signals.efficiency_score?.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  )
}
