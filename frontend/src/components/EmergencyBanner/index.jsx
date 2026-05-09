import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

export default function EmergencyBanner() {
  const signals = useJunctionStore(s => s.signals)
  const audio = useJunctionStore(s => s.audio)
  const isEmergency = signals.mode === 'EMERGENCY'
  const lane = signals.emergency_lane
  const eta = signals.emergency_eta
  const greenWave = signals.green_wave || []

  return (
    <AnimatePresence>
      {isEmergency && (
        <motion.div
          className="absolute top-0 left-0 right-0 z-[100]"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        >
          <div className="bg-red/8 border-b border-red/20 backdrop-blur-xl px-6 py-3">
            <div className="flex items-center gap-5">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="w-9 h-9 rounded-xl bg-red/15 border border-red/30 flex items-center justify-center text-base shrink-0"
              >
                🚨
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-heading font-bold text-[10px] tracking-[0.15em] text-red">EMERGENCY OVERRIDE</span>
                  <span className="text-[8px] font-mono text-red/60 uppercase">
                    {audio.sound_class?.toUpperCase() || 'SIREN'} DETECTED
                  </span>
                </div>
                <div className="flex items-center gap-5 text-[10px] text-white/60 font-mono">
                  <span>Corridor: <span className="text-white font-bold">{lane}</span></span>
                  <span>ETA: <span className="text-red font-bold">{Math.ceil(eta || 0)}s</span></span>
                  <span>Sensor: <span className="text-cyan font-bold">LIDAR + ACOUSTIC</span></span>
                </div>
              </div>

              {/* Green Wave Visualization */}
              {greenWave.length > 0 && (
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[8px] font-heading font-bold text-green/60 tracking-wider">GREEN WAVE</span>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6 rounded-md bg-green/15 border border-green/30 flex items-center justify-center">
                      <span className="text-[7px] font-bold text-green">⬡</span>
                    </div>
                    {greenWave.map((junc, i) => (
                      <React.Fragment key={i}>
                        <motion.div
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.8, delay: i * 0.3, repeat: Infinity }}
                          className="w-5 h-0.5 bg-green/40 rounded"
                        />
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-md bg-green/10 border border-green/20 flex items-center justify-center">
                            <span className="text-[6px] font-bold text-green/80">{junc.name?.split(' ')[1] || i + 1}</span>
                          </div>
                          <span className="text-[6px] text-green/50 font-mono mt-0.5">{Math.round(junc.arrival_time_s || 0)}s</span>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
