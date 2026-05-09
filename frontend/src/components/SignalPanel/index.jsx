import React from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

const LANES = ['NORTH', 'EAST', 'SOUTH', 'WEST']
const LANE_COLORS = { NORTH: '#00d4e0', EAST: '#34d399', SOUTH: '#fbbf24', WEST: '#a78bfa' }

export default function SignalPanel() {
  const { signals } = useJunctionStore()
  const phases = signals.phases || {}

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="section-label mb-0">Signal Timing</span>
        <span className="text-[8px] font-mono text-cyan/60 uppercase">Adaptive v4</span>
      </div>

      <div className="space-y-3">
        {LANES.map(lane => {
          const phase = phases[lane]
          const color = LANE_COLORS[lane]
          const duration = phase?.green_duration || 30

          return (
            <div key={lane} className="flex items-center gap-3">
              <span className="text-[9px] font-heading font-bold text-muted w-12 tracking-wider">{lane.slice(0, 1)}</span>
              <div className="flex-1 h-2 bg-white/3 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(duration / 60) * 100}%` }}
                  transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
              <span className="text-[9px] font-mono text-muted w-8 text-right">{duration}s</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
