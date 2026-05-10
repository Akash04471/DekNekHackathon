import React from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

const LANES = ['NORTH', 'EAST', 'SOUTH', 'WEST']
const LANE_COLORS = { NORTH: '#00d4e0', EAST: '#34d399', SOUTH: '#fbbf24', WEST: '#a78bfa' }

export default function SignalPanel() {
  const { signals, setSignalMode, forceGreenLane } = useJunctionStore()
  const phases = signals.phases || {}
  const isManual = signals.mode === 'MANUAL'

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <span className="section-label mb-0">Signal Logic</span>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-1 h-1 rounded-full ${isManual ? 'bg-amber' : 'bg-cyan'}`} />
            <span className="text-[7px] text-muted font-mono uppercase tracking-widest">
              {isManual ? 'Operator Override' : 'Adaptive Neural Flow'}
            </span>
          </div>
        </div>
        <button
          onClick={() => setSignalMode(isManual ? 'ADAPTIVE' : 'MANUAL')}
          className={`px-3 py-1.5 rounded-lg text-[8px] font-heading font-black tracking-wider transition-all border ${
            isManual 
            ? 'bg-amber/20 border-amber/40 text-amber' 
            : 'bg-white/5 border-white/10 text-muted hover:text-white'
          }`}
        >
          {isManual ? 'EXIT MANUAL' : 'GO MANUAL'}
        </button>
      </div>

      <div className="space-y-4">
        {LANES.map(lane => {
          const phase = phases[lane]
          const color = LANE_COLORS[lane]
          const duration = phase?.green_duration || 30
          const isActive = phase?.state === 'GREEN'

          return (
            <div key={lane} className="relative group">
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-heading font-black text-white/80">{lane.slice(0, 1)}</span>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isActive ? 'bg-green shadow-[0_0_8px_var(--green)]' : 'bg-red'}`} />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-[8px] font-bold text-muted uppercase tracking-widest">{lane} CORRIDOR</span>
                    <span className="text-[10px] font-mono font-bold text-white/40">{duration}s</span>
                  </div>
                  <div className="h-1.5 bg-white/3 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: color }}
                      animate={{ width: `${(duration / 60) * 100}%` }}
                      transition={{ duration: 0.6 }}
                    />
                  </div>
                </div>

                {isManual && (
                  <button
                    onClick={() => forceGreenLane(lane)}
                    className={`shrink-0 w-16 h-8 rounded-xl text-[8px] font-heading font-black transition-all border ${
                      isActive
                      ? 'bg-green/10 border-green/40 text-green'
                      : 'bg-white/5 border-white/10 text-muted hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {isActive ? 'ACTIVE' : 'GREEN'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {isManual && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-amber/5 border border-amber/20 flex items-center gap-3"
        >
          <span className="text-lg">⚠️</span>
          <p className="text-[9px] text-amber/80 font-medium leading-relaxed uppercase tracking-tighter">
            Manual override enabled. Automated safety bounds are active but neural adaptation is suspended.
          </p>
        </motion.div>
      )}
    </div>
  )
}
