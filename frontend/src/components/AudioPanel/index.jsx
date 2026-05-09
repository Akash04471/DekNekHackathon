import React from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

export default function AudioPanel() {
  const detection = useJunctionStore(s => s.audio)

  const db = detection?.db_level ?? 38
  const confidence = detection?.confidence ?? 0
  const urgencyClass = detection?.urgency ?? 'CLEAR'
  const isApproaching = detection?.approaching ?? false
  const urgencyColor = urgencyClass === 'CRITICAL' ? 'var(--red)' : urgencyClass === 'WARNING' ? 'var(--amber)' : 'var(--cyan)'

  return (
    <div>
      <span className="section-label">Acoustic Intelligence</span>

      <div className="stat-card space-y-4">
        {/* Main Reading */}
        <div className="flex items-center gap-5">
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className="absolute inset-0 rounded-full opacity-10"
              style={{ background: urgencyColor }}
            />
            <div className="absolute inset-0 rounded-full border border-white/6" />
            <div className="flex flex-col items-center">
              <span className="text-xl font-black font-heading" style={{ color: urgencyColor }}>{Math.round(db)}</span>
              <span className="text-[7px] font-bold text-muted uppercase">dB</span>
            </div>
          </div>

          <div className="flex-1 space-y-2.5 min-w-0">
            {[
              { label: 'Class', val: detection?.sound_class?.toUpperCase() || 'AMBIENT' },
              { label: 'Distance', val: `~${detection?.estimated_distance_m || 500}m`, color: 'var(--cyan)' },
              { label: 'ETA', val: `${detection?.estimated_eta_seconds || '—'}s`, color: 'var(--red)' },
              { label: 'Trend', val: isApproaching ? '↓ APPROACHING' : '↑ RECEDING', color: isApproaching ? 'var(--red)' : 'var(--green)' },
            ].map(r => (
              <div key={r.label} className="flex justify-between items-center">
                <span className="text-[8px] font-bold text-muted uppercase tracking-wider">{r.label}</span>
                <span className="text-[10px] font-bold font-mono" style={{ color: r.color || 'var(--text-primary)' }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Confidence */}
        <div className="pt-3 border-t border-white/4 flex items-center justify-between">
          <span className="text-[8px] font-bold text-muted uppercase tracking-wider">Confidence</span>
          <div className="flex items-center gap-3">
            <div className="w-24 h-1.5 bg-white/4 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: urgencyColor }}
                animate={{ width: `${confidence * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-[9px] font-mono text-muted">{Math.round(confidence * 100)}%</span>
          </div>
        </div>
      </div>
    </div>
  )
}
