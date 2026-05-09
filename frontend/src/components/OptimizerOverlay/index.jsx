import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

export default function OptimizerOverlay() {
  const { recommendations, removeRecommendation, updateOptimizerMetrics } = useJunctionStore()

  useEffect(() => {
    const timer = setInterval(updateOptimizerMetrics, 2000)
    return () => clearInterval(timer)
  }, [updateOptimizerMetrics])

  if (recommendations.length === 0) return null

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 w-[520px] pointer-events-none">
      <AnimatePresence>
        {recommendations.map(rec => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto bg-[#0a0f1eee] border border-white/6 rounded-xl p-4 flex gap-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="w-1 rounded-full shrink-0" style={{ background: rec.type === 'STRATEGY' ? 'var(--purple)' : 'var(--cyan)' }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[8px] font-heading font-bold tracking-[0.15em] uppercase" style={{ color: rec.type === 'STRATEGY' ? 'var(--purple)' : 'var(--cyan)' }}>
                  {rec.type}
                </span>
              </div>
              <h4 className="text-[11px] font-bold text-white mb-1">{rec.title}</h4>
              <p className="text-[10px] text-muted leading-relaxed">{rec.desc}</p>
              <div className="mt-3 flex gap-2">
                <button className="text-[8px] font-heading font-bold tracking-wider bg-cyan/8 text-cyan px-3 py-1.5 rounded-lg border border-cyan/15 hover:bg-cyan/15 transition-all">
                  APPLY
                </button>
                <button
                  onClick={() => removeRecommendation(rec.id)}
                  className="text-[8px] font-heading font-bold tracking-wider bg-white/3 text-muted px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/6 transition-all"
                >
                  DISMISS
                </button>
              </div>
            </div>
            <button
              onClick={() => removeRecommendation(rec.id)}
              className="text-muted hover:text-white transition-colors text-sm self-start"
            >
              ×
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
