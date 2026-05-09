import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

const LANE_COLORS = { NORTH: '#00F5FF', EAST: '#00FF88', SOUTH: '#FFB800', WEST: '#A855F7' }

function GreenWaveMap({ wave }) {
  const junctions = [
    { name: 'JUNCTION A', x: 0 },
    ...wave.map((w, i) => ({ name: w.name, x: (i + 1) * 25, offset: w.green_at_offset_s }))
  ]
  return (
    <div className="relative mt-2">
      <div className="flex items-center gap-0 px-1">
        {junctions.map((j, i) => (
          <React.Fragment key={j.name}>
            <div className="text-center" style={{ minWidth: 56 }}>
              <motion.div
                className="w-8 h-8 rounded-full border-2 mx-auto flex items-center justify-center text-xs font-bold"
                animate={{
                  borderColor: '#00FF88',
                  background: 'rgba(0,255,136,0.15)',
                  boxShadow: '0 0 12px rgba(0,255,136,0.5)',
                }}
                transition={{ delay: i * 0.4, duration: 0.3 }}
              >
                🟢
              </motion.div>
              <div className="text-muted text-xs mt-1" style={{ fontSize: 9 }}>
                {j.name.split(' ').pop()}
              </div>
              {j.offset && (
                <div className="text-green text-xs font-mono">+{j.offset}s</div>
              )}
            </div>
            {i < junctions.length - 1 && (
              <motion.div
                className="flex-1 h-0.5"
                animate={{ background: 'linear-gradient(90deg, #00FF88, #00FF8880)' }}
                transition={{ delay: i * 0.4 + 0.3 }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}

export default function EmergencyBanner() {
  const signals = useJunctionStore(s => s.signals)
  const audio = useJunctionStore(s => s.audio)
  const isEmergency = signals.mode === 'EMERGENCY'
  const lane = signals.emergency_lane
  const eta = signals.emergency_eta
  const wave = signals.green_wave || []
  const color = LANE_COLORS[lane] || '#FF4444'

  return (
    <AnimatePresence>
      {isEmergency && (
        <motion.div
          className="absolute top-0 left-0 right-0 z-50 mx-2 mt-2"
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        >
          <div
            className="rounded-xl border p-3"
            style={{
              background: 'rgba(255,20,20,0.1)',
              backdropFilter: 'blur(20px)',
              borderColor: 'rgba(255,68,68,0.5)',
              boxShadow: '0 0 30px rgba(255,68,68,0.3)',
            }}
          >
            <div className="flex items-center gap-3">
              {/* Pulsing icon */}
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-lg animate-blink-red">
                  🚨
                </div>
                {[0,1,2].map(i => (
                  <div
                    key={i}
                    className="absolute inset-0 rounded-full border border-red-500 animate-pulse-ring"
                    style={{ animationDelay: `${i * 0.5}s` }}
                  />
                ))}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-red font-bold text-sm tracking-wide">EMERGENCY OVERRIDE</span>
                  <span className="text-xs px-2 py-0.5 rounded border border-red/40 text-red font-mono">
                    {audio.sound_class?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-muted">Lane cleared:</span>
                  <span className="font-bold font-mono" style={{ color }}>{lane}</span>
                  {eta && (
                    <>
                      <span className="text-muted">ETA:</span>
                      <span className="font-bold font-mono text-red animate-blink-red">{Math.ceil(eta)}s</span>
                    </>
                  )}
                  <span className="text-muted">Detection:</span>
                  <span className="text-green font-mono">AUDIO + VISUAL</span>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-xs text-muted">Signal response</div>
                <div className="font-mono font-bold text-green text-sm">{'< 200ms'}</div>
              </div>
            </div>

            {/* Green wave */}
            {wave.length > 0 && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <div className="text-xs text-muted mb-1">🌊 Green Wave Corridor</div>
                <GreenWaveMap wave={wave} />
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
