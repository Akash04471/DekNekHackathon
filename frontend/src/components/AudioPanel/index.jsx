import React, { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useJunctionStore } from '../../store/junctionStore'

const URGENCY_CONFIG = {
  CRITICAL: { color: '#FF4444', label: 'CRITICAL', glow: 'rgba(255,68,68,0.4)' },
  HIGH:     { color: '#FF8800', label: 'HIGH',     glow: 'rgba(255,136,0,0.4)' },
  MEDIUM:   { color: '#FFB800', label: 'MEDIUM',   glow: 'rgba(255,184,0,0.3)' },
  LOW:      { color: '#A855F7', label: 'LOW',      glow: 'rgba(168,85,247,0.2)' },
  CLEAR:    { color: '#00FF88', label: 'CLEAR',    glow: 'none' },
}

function DbMeter({ db }) {
  const bars = 20
  const active = Math.round((db / 100) * bars)
  return (
    <div className="flex items-end gap-0.5 h-10">
      {Array.from({ length: bars }, (_, i) => {
        const isActive = i < active
        const color = i < 10 ? '#00FF88' : i < 15 ? '#FFB800' : '#FF4444'
        return (
          <motion.div
            key={i}
            className="db-bar w-2"
            animate={{
              height: isActive ? `${40 + i * 2}%` : '15%',
              background: isActive ? color : 'rgba(255,255,255,0.05)',
              boxShadow: isActive ? `0 0 4px ${color}` : 'none',
            }}
            transition={{ duration: 0.2, delay: i * 0.01 }}
          />
        )
      })}
    </div>
  )
}

export default function AudioPanel() {
  const audio = useJunctionStore(s => s.audio)
  const dbHistory = useJunctionStore(s => s.dbHistory)
  const cfg = URGENCY_CONFIG[audio.urgency] || URGENCY_CONFIG.CLEAR

  const chartData = useMemo(() =>
    dbHistory.slice(-40).map((pt, i) => ({ i, db: pt.db })),
    [dbHistory]
  )

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="panel-header">
        <div className="dot" style={{ background: '#FF4444', boxShadow: '0 0 6px #FF4444' }} />
        <span>Acoustic Sensor</span>
        <AnimatePresence>
          {audio.siren_detected && (
            <motion.span
              className="ml-auto text-xs text-red font-bold animate-blink-red"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              🔊 SIREN
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="p-3 space-y-3">
        {/* dB Meter */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted">dB Level</span>
            <span className="font-mono" style={{ color: cfg.color }}>{audio.db_level} dB</span>
          </div>
          <DbMeter db={audio.db_level} />
        </div>

        {/* Urgency badge */}
        <motion.div
          className="flex items-center justify-between p-2 rounded-lg border"
          animate={{
            background: `${cfg.glow.replace('0.4)', '0.08)').replace('0.3)', '0.06)')}`,
            borderColor: `${cfg.color}40`,
            boxShadow: audio.siren_detected ? cfg.glow : 'none',
          }}
        >
          <div>
            <div className="text-xs text-muted mb-0.5">Urgency</div>
            <div className="font-bold text-sm font-mono" style={{ color: cfg.color }}>
              {cfg.label}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted mb-0.5">Confidence</div>
            <div className="font-mono text-sm text-cyan">{(audio.confidence * 100).toFixed(0)}%</div>
          </div>
        </motion.div>

        {/* Distance + ETA */}
        {audio.siren_detected && (
          <motion.div
            className="grid grid-cols-2 gap-2"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          >
            <div className="glass-bright rounded-lg p-2 text-center">
              <div className="text-xs text-muted mb-1">Distance</div>
              <div className="font-mono font-bold text-amber">{audio.estimated_distance_m}m</div>
            </div>
            <div className="glass-bright rounded-lg p-2 text-center">
              <div className="text-xs text-muted mb-1">ETA</div>
              <div className="font-mono font-bold text-red">{audio.estimated_eta_seconds}s</div>
            </div>
          </motion.div>
        )}

        {/* Sound class */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted">Sound class</span>
          <span className="text-xs font-mono" style={{ color: cfg.color }}>
            {audio.sound_class}
          </span>
        </div>

        {/* Approaching indicator */}
        {audio.siren_detected && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Direction</span>
            <motion.span
              className="text-sm"
              animate={{ x: audio.approaching ? [-4, 4, -4] : [4, -4, 4] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
            >
              {audio.approaching ? '→' : '←'}
            </motion.span>
            <span className="text-xs" style={{ color: cfg.color }}>
              {audio.approaching ? 'Approaching' : 'Receding'}
            </span>
          </div>
        )}

        {/* dB trend chart */}
        <div>
          <div className="text-xs text-muted mb-1">dB Trend (last 20s)</div>
          <div style={{ height: 48 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dbGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF4444" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#FF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="db" stroke="#FF4444" fill="url(#dbGrad)"
                  strokeWidth={1.5} dot={false} isAnimationActive={false} />
                <YAxis domain={[30, 95]} hide />
                <XAxis dataKey="i" hide />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
