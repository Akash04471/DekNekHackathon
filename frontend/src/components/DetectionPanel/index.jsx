import React from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

const LANE_COLORS = { NORTH: '#00d4e0', EAST: '#34d399', SOUTH: '#fbbf24', WEST: '#a78bfa' }
const ARROWS = { NORTH: '↑', EAST: '→', SOUTH: '↓', WEST: '←' }

function LaneCard({ lane, data, signal }) {
  const color = LANE_COLORS[lane]
  const density = data?.density_score || 0
  const isEmergency = data?.has_emergency
  const signalState = signal?.state || 'RED'
  const sigColor = signalState === 'GREEN' ? 'var(--green)' : signalState === 'YELLOW' ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="lane-card group relative overflow-hidden bg-white/[0.02] border border-white/5 p-4 rounded-2xl hover:bg-white/[0.04] hover:border-white/10 transition-all">
      {isEmergency && (
        <motion.div
          animate={{ opacity: [0.05, 0.15, 0.05] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="absolute inset-0 pointer-events-none bg-red/10"
        />
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-transform group-hover:scale-110"
            style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}>
            {ARROWS[lane]}
          </div>
          <div>
            <span className="text-[11px] font-heading font-black text-white/90 block tracking-wider">{lane}</span>
            <span className="text-[9px] text-muted font-mono font-bold">{data?.vehicle_count || 0} UNITS</span>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg border" 
            style={{ background: `${sigColor}10`, color: sigColor, borderColor: `${sigColor}30` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sigColor }} />
            <span className="text-[9px] font-black tracking-widest uppercase">{signalState}</span>
          </div>
          {isEmergency && (
            <span className="text-[8px] font-black text-red tracking-widest animate-pulse">EMERGENCY</span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end">
          <span className="text-[9px] font-bold text-muted uppercase tracking-widest">Congestion</span>
          <span className="text-[11px] font-mono font-black text-white/80">{Math.round(density)}%</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full shadow-[0_0_8px_rgba(255,255,255,0.1)]"
            style={{ background: color }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(density, 100)}%` }}
            transition={{ duration: 1, ease: "circOut" }}
          />
        </div>
        <div className="flex justify-between pt-1">
          <div className="flex items-center gap-1">
            <span className="text-[7px] text-muted font-bold uppercase">Queue</span>
            <span className="text-[9px] font-mono text-white/60">{data?.queue_length_m?.toFixed(0) || 0}m</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[7px] text-muted font-bold uppercase">Flow</span>
            <span className="text-[9px] font-mono text-white/60">{data?.avg_speed_kmh?.toFixed(0) || 0}km/h</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DetectionPanel() {
  const lanes = useJunctionStore(s => s.lanes)
  const signals = useJunctionStore(s => s.signals)
  const phases = signals.phases || {}

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <span className="section-label">Lane Intelligence</span>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-cyan/40" />
          <div className="w-1 h-1 rounded-full bg-cyan/40" />
          <div className="w-1 h-1 rounded-full bg-cyan/40" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {Object.keys(LANE_COLORS).map(lane => (
          <LaneCard key={lane} lane={lane} data={lanes[lane]} signal={phases[lane]} />
        ))}
      </div>
    </div>
  )
}
