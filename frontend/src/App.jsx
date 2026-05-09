import React from 'react'
import { motion } from 'framer-motion'
import SidebarLeft from './components/SidebarLeft'
import JunctionView3D from './components/JunctionView3D'
import SignalPanel from './components/SignalPanel'
import DetectionPanel from './components/DetectionPanel'
import AudioPanel from './components/AudioPanel'
import PredictionPanel from './components/PredictionPanel'
import EmergencyBanner from './components/EmergencyBanner'
import ChatAssistant from './components/ChatAssistant'
import OptimizerOverlay from './components/OptimizerOverlay'
import { useWebSockets, useKpiPoller, useWeatherPoller, useLanePoller, useAudioPoller } from './hooks/useWebSockets'
import { useJunctionStore } from './store/junctionStore'
import './index.css'


function KpiBar() {
  const kpis = useJunctionStore(s => s.kpis)
  const weather = useJunctionStore(s => s.weather)

  return (
    <div className="app-stats">
      <div className="flex items-center gap-6 flex-1 overflow-hidden">
        <span className="text-[8px] font-heading font-bold tracking-[0.15em] text-muted shrink-0">PERF</span>
        <div className="flex items-center gap-4 text-[10px] font-medium overflow-x-auto">
          <span className="text-white/50 shrink-0">Wait: <span className="text-white/25 line-through">95s</span> → <span className="text-green font-bold">31s</span> <span className="text-green/50 text-[8px]">↓{kpis.avg_wait_reduction_pct || 67}%</span></span>
          <span className="text-white/10 shrink-0">|</span>
          <span className="text-white/50 shrink-0">Latency: <span className="text-cyan font-bold font-mono">{kpis.signal_response_latency_ms || 120}ms</span></span>
          <span className="text-white/10 shrink-0">|</span>
          <span className="text-white/50 shrink-0">Emergency: <span className="text-amber font-bold font-mono">{kpis.emergency_detection_time_s || 2.1}s</span></span>
          <span className="text-white/10 shrink-0">|</span>
          <span className="text-white/50 shrink-0">Accuracy: <span className="text-purple font-bold font-mono">{kpis.prediction_accuracy_pct || 89}%</span></span>
          <span className="text-white/10 shrink-0">|</span>
          <span className="text-white/50 shrink-0">Uptime: <span className="text-green font-bold font-mono">{kpis.uptime_pct || 99.9}%</span></span>
          {weather && (
            <>
              <span className="text-white/10 shrink-0">|</span>
              <span className="text-white/50 shrink-0">🌤 <span className="font-mono">{weather.temp_c}°C {weather.condition}</span></span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[8px] font-mono text-muted">v4.0</span>
        <div className="w-1.5 h-1.5 rounded-full bg-cyan/50 animate-pulse-soft" />
      </div>
    </div>
  )
}

export default function App() {
  useWebSockets()
  useKpiPoller()
  useWeatherPoller()
  useLanePoller()
  useAudioPoller()

  return (
    <>
      <div className="app-layout">
        <aside className="app-left">
          <SidebarLeft />
        </aside>

        <main className="app-center">
          <JunctionView3D />
          <EmergencyBanner />
        </main>

        <aside className="app-right">
          <DetectionPanel />
          <div className="border-t border-white/4 pt-5">
            <SignalPanel />
          </div>
          <div className="border-t border-white/4 pt-5">
            <AudioPanel />
          </div>
        </aside>

        <footer className="app-bottom">
          <PredictionPanel />
        </footer>

        <KpiBar />
      </div>

      <OptimizerOverlay />
      <ChatAssistant />
    </>
  )
}
