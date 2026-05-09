import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from './components/Header'
import JunctionView3D from './components/JunctionView3D'
import SignalPanel from './components/SignalPanel'
import DetectionPanel from './components/DetectionPanel'
import AudioPanel from './components/AudioPanel'
import PredictionPanel from './components/PredictionPanel'
import EmergencyBanner from './components/EmergencyBanner'
import AnalyticsPanel from './components/AnalyticsPanel'
import ChatAssistant from './components/ChatAssistant'
import WeatherWidget from './components/WeatherWidget'
import { useWebSockets, useKpiPoller, useWeatherPoller } from './hooks/useWebSockets'
import './index.css'

function RightPanelTabs() {
  const [tab, setTab] = useState('audio')
  const tabs = [
    { id: 'audio',       label: '🔊 Audio',    color: '#FF4444' },
    { id: 'predictions', label: '📈 Forecast',  color: '#A855F7' },
    { id: 'analytics',   label: '📊 Analytics', color: '#F59E0B' },
  ]
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex gap-1">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex-1 text-xs py-1.5 rounded-lg border transition-all"
            style={{
              borderColor: tab === t.id ? `${t.color}60` : 'rgba(255,255,255,0.08)',
              color: tab === t.id ? t.color : '#4A6080',
              background: tab === t.id ? `${t.color}10` : 'transparent',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 overflow-y-auto"
      >
        {tab === 'audio'       && <AudioPanel />}
        {tab === 'predictions' && <PredictionPanel />}
        {tab === 'analytics'   && <AnalyticsPanel />}
      </motion.div>
    </div>
  )
}

// Live clock for header re-render
function LiveClock() {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])
  return null
}

export default function App() {
  useWebSockets()
  useKpiPoller()
  useWeatherPoller()

  return (
    <div className="app-layout">
      <LiveClock />

      {/* Header */}
      <Header />

      {/* Left sidebar */}
      <aside className="app-left">
        <SignalPanel />
        <WeatherWidget />
      </aside>

      {/* Center — 3D View */}
      <main className="app-center" style={{ position: 'relative' }}>
        <JunctionView3D />
        <EmergencyBanner />
      </main>

      {/* Right sidebar */}
      <aside className="app-right">
        <DetectionPanel />
        <RightPanelTabs />
      </aside>

      {/* Floating chat */}
      <ChatAssistant />
    </div>
  )
}
