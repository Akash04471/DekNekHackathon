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
    <div className="lane-card group">
      {isEmergency && (
        <motion.div
          animate={{ opacity: [0.02, 0.06, 0.02] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ background: 'var(--red)' }}
        />
      )}

      <div className="flex justify-between items-center mb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
            style={{ background: `${color}10`, color, border: `1px solid ${color}20` }}>
            {ARROWS[lane]}
          </div>
          <div>
            <span className="text-[11px] font-bold text-white block leading-tight">{lane}</span>
            <span className="text-[9px] text-muted font-mono">{data?.vehicle_count || 0} units</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-md" style={{
            background: `${sigColor}10`, color: sigColor, border: `1px solid ${sigColor}20`
          }}>
            {signalState} · {signal?.time_remaining || 0}s
          </span>
          {isEmergency && (
            <span className="text-[8px] font-bold text-red">⚡ EMERGENCY</span>
          )}
        </div>
      </div>

      <div className="relative z-10 space-y-2">
        <div className="flex justify-between text-[9px] text-muted font-medium">
          <span>Density</span>
          <span className="font-mono">{Math.round(density)}%</span>
        </div>
        <div className="density-bar">
          <motion.div
            className="density-bar-fill"
            style={{ background: color }}
            animate={{ width: `${Math.min(density, 100)}%` }}
            transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-muted/50 font-mono">
          <span>Queue: {data?.queue_length_m?.toFixed(0) || 0}m</span>
          <span>{data?.avg_speed_kmh?.toFixed(0) || 0} km/h</span>
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
    <div>
      <span className="section-label">Lane Intelligence</span>
      <div className="flex flex-col gap-3">
        {Object.keys(LANE_COLORS).map(lane => (
          <LaneCard key={lane} lane={lane} data={lanes[lane]} signal={phases[lane]} />
        ))}
      </div>
    </div>
  )
}
