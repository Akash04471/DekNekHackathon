import React from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

function KpiCard({ label, value, unit, color = '#00F5FF', icon }) {
  return (
    <motion.div
      className="glass-bright rounded-xl p-3 flex items-center gap-3"
      whileHover={{ scale: 1.02 }}
    >
      <div className="text-2xl">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-muted text-xs truncate">{label}</div>
        <div className="font-mono font-bold" style={{ color }}>
          {value}
          {unit && <span className="text-xs text-muted ml-1">{unit}</span>}
        </div>
      </div>
    </motion.div>
  )
}

export default function AnalyticsPanel() {
  const kpis = useJunctionStore(s => s.kpis)
  const simState = useJunctionStore(s => s.simState)

  const uptimeSeconds = kpis.uptime_seconds || 0
  const formattedUptime = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="panel-header">
        <div className="dot" style={{ background: '#F59E0B', boxShadow: '0 0 6px #F59E0B' }} />
        <span>System Analytics</span>
        <span className="ml-auto text-xs text-muted">{simState?.scenario}</span>
      </div>
      <div className="p-2 grid grid-cols-1 gap-2">
        <KpiCard
          icon="⚡"
          label="Signal Response Latency"
          value={`${kpis.signal_response_latency_ms}`}
          unit="ms"
          color="#00F5FF"
        />
        <KpiCard
          icon="🚨"
          label="Emergency Detection Time"
          value={`${kpis.emergency_detection_time_s}`}
          unit="s"
          color="#FF4444"
        />
        <KpiCard
          icon="🚦"
          label="Wait Time Reduction"
          value={`${kpis.avg_wait_reduction_pct}%`}
          color="#00FF88"
        />
        <KpiCard
          icon="🤖"
          label="Prediction Accuracy"
          value={`${kpis.prediction_accuracy_pct}%`}
          color="#A855F7"
        />
        <KpiCard
          icon="🟢"
          label="System Uptime"
          value={`${kpis.uptime_pct}%`}
          unit={formattedUptime}
          color="#00FF88"
        />
        <KpiCard
          icon="🚗"
          label="Vehicles Processed Today"
          value={(kpis.vehicles_processed_today || 0).toLocaleString()}
          color="#FFB800"
        />
      </div>
    </div>
  )
}
