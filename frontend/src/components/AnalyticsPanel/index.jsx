import React from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

function KpiCard({ label, value, unit, color = '#00F5FF', icon, idx }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05 }}
      className="glass-bright rounded-xl p-3 flex items-center gap-4 relative overflow-hidden group"
      whileHover={{ scale: 1.02, borderColor: `${color}40` }}
    >
      <div className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-muted text-[8px] font-black uppercase tracking-widest mb-1">{label}</div>
        <div className="font-heading font-black text-sm" style={{ color }}>
          {value}
          {unit && <span className="text-[9px] text-muted ml-2 font-mono opacity-60">{unit}</span>}
        </div>
      </div>
      
      {/* HUD scanline effect on hover */}
      <motion.div 
        className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 pointer-events-none"
        initial={false}
      />
    </motion.div>
  )
}

export default function AnalyticsPanel() {
  const kpis = useJunctionStore(s => s.kpis)
  const simState = useJunctionStore(s => s.simState)

  const uptimeSeconds = kpis.uptime_seconds || 0
  const formattedUptime = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`

  const KPI_DATA = [
    { icon: "⚡", label: "Signal Latency", value: kpis.signal_response_latency_ms, unit: "ms", color: "var(--cyan)" },
    { icon: "🚨", label: "EMG Detection", value: kpis.emergency_detection_time_s, unit: "s", color: "var(--red)" },
    { icon: "🚦", label: "Wait Reduction", value: `${kpis.avg_wait_reduction_pct}%`, color: "var(--green)" },
    { icon: "🤖", label: "AI Accuracy", value: `${kpis.prediction_accuracy_pct}%`, color: "var(--purple)" },
    { icon: "🟢", label: "System Uptime", value: `${kpis.uptime_pct}%`, unit: formattedUptime, color: "var(--green)" },
    { icon: "🚗", label: "Total Load", value: (kpis.vehicles_processed_today || 0).toLocaleString(), unit: "units", color: "var(--amber)" },
  ]

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        <div className="flex items-center">
            <div className="status-dot" style={{ background: '#F59E0B', boxShadow: '0 0 8px #F59E0B' }} />
            <span className="font-heading">System Analytics</span>
        </div>
        <span className="text-[8px] font-black text-amber/60 tracking-widest uppercase">{simState?.scenario}</span>
      </div>
      <div className="p-3 flex flex-col gap-2 overflow-y-auto">
        {KPI_DATA.map((kpi, i) => (
          <KpiCard key={kpi.label} {...kpi} idx={i} />
        ))}
      </div>
      
      
      {/* Bottom status strip */}
      <div className="mt-auto p-3 bg-white/5 border-t border-white/5">
          <div className="flex justify-between items-center">
              <span className="text-[8px] font-black text-muted uppercase tracking-[0.2em]">Operational Integrity</span>
              <span className="text-[10px] font-black text-green">NOMINAL</span>
          </div>
      </div>
    </div>
  )
}
