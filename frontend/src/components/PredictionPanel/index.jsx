import React, { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, CartesianGrid } from 'recharts'
import { useJunctionStore } from '../../store/junctionStore'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = ['LIVE', 'PREDICT', 'HISTORY', 'COMPARE']

export default function PredictionPanel() {
  const [activeTab, setActiveTab] = useState('PREDICT')
  const predictions = useJunctionStore(s => s.predictions)
  const lanes = useJunctionStore(s => s.lanes)

  // Generate synthetic live data for LIVE tab
  const liveData = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      t: `${i}m`,
      NORTH: Math.round(20 + Math.random() * 40),
      EAST: Math.round(15 + Math.random() * 35),
      SOUTH: Math.round(25 + Math.random() * 30),
      WEST: Math.round(10 + Math.random() * 50),
    }))
  }, [])

  const renderContent = () => {
    switch (activeTab) {
      case 'LIVE':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={liveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="t" tick={{ fill: '#475569', fontSize: 9 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} width={30} />
              <Line type="monotone" dataKey="NORTH" stroke="#00d4e0" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="EAST" stroke="#34d399" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="SOUTH" stroke="#fbbf24" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="WEST" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )

      case 'PREDICT':
        const forecasts = predictions.forecasts?.['NORTH'] || []
        const data = forecasts.length > 0
          ? forecasts.map(pt => ({
              label: `+${pt.offset_minutes}m`,
              predicted: pt.predicted_density,
              lower: pt.confidence_lower,
              upper: pt.confidence_upper,
            }))
          : Array.from({ length: 12 }, (_, i) => ({
              label: `+${(i+1)*15}m`,
              predicted: 30 + Math.sin(i / 2) * 20,
              lower: 20 + Math.sin(i / 2) * 15,
              upper: 40 + Math.sin(i / 2) * 25,
            }))
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="p-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#a78bfa" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 9 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#475569', fontSize: 9 }} width={30} />
              <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="upper" stroke="none" fill="#a78bfa" fillOpacity={0.04} isAnimationActive={false} />
              <Area type="monotone" dataKey="lower" stroke="none" fill="#030712" fillOpacity={1} isAnimationActive={false} />
              <Area type="monotone" dataKey="predicted" stroke="#a78bfa" fill="url(#p-grad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        )

      case 'COMPARE':
        const compData = [
          { name: 'Avg Wait (s)', fixed: 95, nexus: 31 },
          { name: 'CO₂ (kg)', fixed: 52, nexus: 18 },
          { name: 'Throughput', fixed: 420, nexus: 663 },
        ]
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={compData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
              <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 9 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 9 }} width={40} />
              <Tooltip contentStyle={{ background: '#0a0f1e', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="fixed" fill="rgba(255,255,255,0.06)" radius={[4, 4, 0, 0]} name="Fixed Timing" />
              <Bar dataKey="nexus" fill="#00d4e0" radius={[4, 4, 0, 0]} name="NEXUS Adaptive" />
            </BarChart>
          </ResponsiveContainer>
        )

      case 'HISTORY':
        // 7×24 heatmap grid
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        return (
          <div className="h-full flex flex-col justify-center px-4">
            <div className="grid grid-rows-7 gap-1">
              {days.map((day, di) => (
                <div key={day} className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-muted w-6">{day}</span>
                  <div className="flex-1 flex gap-0.5">
                    {Array.from({ length: 24 }, (_, h) => {
                      const val = Math.random()
                      const opacity = 0.05 + val * 0.4
                      return (
                        <div
                          key={h}
                          className="flex-1 h-3 rounded-sm"
                          style={{ background: `rgba(0, 212, 224, ${opacity})` }}
                          title={`${day} ${h}:00 — ${Math.round(val * 100)}%`}
                        />
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="tab-bar">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`tab-btn ${activeTab === t ? 'active' : ''}`}
          >
            {t}
          </button>
        ))}

        {/* Right side info */}
        <div className="ml-auto flex items-center gap-4 pr-2">
          <div className="flex flex-col items-end">
            <span className="text-[8px] font-bold text-muted uppercase tracking-wider">Confidence</span>
            <span className="text-[11px] font-mono font-bold text-purple">{predictions.mape_score}%</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4" style={{ minWidth: 0, minHeight: 0 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full w-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
