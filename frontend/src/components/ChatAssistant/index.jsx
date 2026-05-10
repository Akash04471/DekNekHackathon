import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useJunctionStore, API_BASE } from '../../store/junctionStore'

function Typewriter({ text, speed = 15 }) {
  const [charIndex, setCharIndex] = useState(0)
  const indexRef = useRef(0)

  useEffect(() => {
    indexRef.current = 0
    setCharIndex(0)
    if (!text) return
    const timer = setInterval(() => {
      indexRef.current += 1
      if (indexRef.current >= text.length) {
        setCharIndex(text.length)
        clearInterval(timer)
      } else {
        setCharIndex(indexRef.current)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return <span>{text.slice(0, charIndex)}</span>
}

export default function ChatAssistant() {
  const { chatOpen, chatMessages, toggleChat, addChatMessage, lanes, signals, wastedGreenSeconds, addProactiveAlert, proactiveAlerts } = useJunctionStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  // Module E1: Proactive Alerts Polling
  useEffect(() => {
    const checkAlerts = () => {
      const { lanes, signals, wastedGreenSeconds } = useJunctionStore.getState()
      
      // 1. High Density Prediction
      const highDensityLane = Object.entries(lanes).find(([_, l]) => l.density_score > 75)
      if (highDensityLane) {
        addProactiveAlert({
          type: 'TRAFFIC',
          message: `Lane ${highDensityLane[0]} predicted to hit critical density soon. Adaptive override active.`,
          priority: 'HIGH'
        })
      }

      // 2. Wasted Green Time
      if (wastedGreenSeconds > 45) {
        addProactiveAlert({
          type: 'OPTIMIZATION',
          message: `System detected ${wastedGreenSeconds}s of wasted green time. Recalibrating phase duration.`,
          priority: 'MEDIUM'
        })
      }

      // 3. Efficiency Drop
      if (signals.efficiency_score < 55) {
        addProactiveAlert({
          type: 'DIAGNOSTIC',
          message: `Junction efficiency dropped to ${signals.efficiency_score}%. Diagnosing sensor conflict.`,
          priority: 'HIGH'
        })
      }
    }

    const timer = setInterval(checkAlerts, 30000)
    return () => clearInterval(timer)
  }, [addProactiveAlert])

  useEffect(() => {
    if (chatOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatOpen, proactiveAlerts])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    addChatMessage({ role: 'user', text: msg })
    setLoading(true)

    try {
      const r = await fetch(`${API_BASE}/api/chat?message=${encodeURIComponent(msg)}`)
      const data = await r.json()
      addChatMessage({ role: 'assistant', text: data.reply })
    } catch {
      addChatMessage({ role: 'assistant', text: 'Connection lost. Please retry.' })
    } finally {
      setLoading(false)
    }
  }

  const QUICK_ACTIONS = [
    { label: 'STATUS REPORT', cmd: 'Generate a full junction status report' },
    { label: 'OPTIMIZE FLOW', cmd: 'Run traffic flow optimization' },
    { label: 'EMERGENCY CLEAR', cmd: 'Clear all emergency overrides' },
    { label: 'SCENARIO LOGS', cmd: 'Show recent scenario transitions' }
  ]

  return (
    <AnimatePresence>
      {chatOpen && (
        <div className="fixed inset-0 z-[20000] pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleChat}
            className="absolute inset-0 bg-black/70 backdrop-blur-xl pointer-events-auto"
          />

          <motion.div
            className="absolute top-0 right-0 bottom-0 w-[480px] bg-[#04060c] border-l border-white/10 flex flex-col pointer-events-auto shadow-[-30px_0_120px_rgba(0,0,0,0.9)] overflow-hidden"
            initial={{ x: 480 }}
            animate={{ x: 0 }}
            exit={{ x: 480 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
          >
            {/* HUD Scanning Effect */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
              <div className="w-full h-px bg-cyan shadow-[0_0_20px_var(--cyan)] absolute top-0 animate-scanning" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,212,224,0.02)_0%,transparent_70%)]" />
            </div>

            {/* Header */}
            <div className="p-10 pb-8 border-b border-white/5 bg-gradient-to-r from-cyan/5 to-transparent relative z-10">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="px-2 py-0.5 rounded bg-cyan/10 border border-cyan/30 text-cyan text-[8px] font-black tracking-widest">ENCRYPTED</div>
                    <div className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-muted text-[8px] font-black tracking-widest">NODE-0447</div>
                  </div>
                  <h2 className="font-heading font-black text-[18px] tracking-[0.4em] text-white flex items-center gap-3">
                    NEXUS AI
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1 h-3 bg-cyan/40 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                      ))}
                    </div>
                  </h2>
                  <span className="text-[10px] text-muted font-mono uppercase tracking-[0.25em] mt-1 block">Advanced Tactical Intelligence Layer</span>
                </div>
                <button 
                  onClick={toggleChat} 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 text-muted hover:text-white hover:bg-red/20 hover:border-red/40 transition-all border border-white/10 group"
                >
                  <span className="text-3xl transition-transform group-hover:rotate-90">×</span>
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-10 space-y-10 relative scroll-smooth no-scrollbar">
              {/* Tactical Chips */}
              <div className="flex flex-wrap gap-2 mb-8">
                {QUICK_ACTIONS.map(qa => (
                  <button
                    key={qa.label}
                    onClick={() => {
                      setInput(qa.cmd)
                      // trigger send manually if needed or let user edit
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-cyan/70 tracking-widest hover:bg-cyan/10 hover:border-cyan/30 hover:text-cyan transition-all uppercase"
                  >
                    {qa.label}
                  </button>
                ))}
              </div>

              {proactiveAlerts.map(alert => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-6 rounded-2xl border-2 relative overflow-hidden ${
                    alert.priority === 'HIGH' 
                    ? 'bg-red/10 border-red/20 shadow-[0_0_30px_rgba(248,113,113,0.1)]' 
                    : 'bg-amber/10 border-amber/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${alert.priority === 'HIGH' ? 'bg-red' : 'bg-amber'} animate-ping`} />
                      <span className="text-[10px] font-black tracking-widest uppercase text-white">{alert.type} PRIORITY OVERRIDE</span>
                    </div>
                    <span className="text-[8px] font-mono text-muted">T+{Math.floor(Math.random() * 60)}S</span>
                  </div>
                  <p className="text-[14px] text-white leading-relaxed font-medium tracking-tight">
                    {alert.message}
                  </p>
                </motion.div>
              ))}

              {chatMessages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex items-center gap-3 mb-2 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${m.role === 'user' ? 'bg-cyan/20 text-cyan' : 'bg-white/10 text-muted'}`}>
                      {m.role === 'user' ? 'USER.001' : 'SYS.NEXUS'}
                    </div>
                    <span className="text-[8px] text-muted font-mono">08:42:12</span>
                  </div>
                  <div className={`px-6 py-5 rounded-3xl text-[14px] leading-relaxed relative border ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-cyan/20 to-cyan/5 text-white border-cyan/20 shadow-[0_10px_40px_rgba(0,212,224,0.1)] rounded-tr-none'
                      : 'bg-white/5 text-white/90 border-white/10 rounded-tl-none'
                  }`}>
                    {m.role === 'assistant' ? <Typewriter text={m.text} speed={8} /> : m.text}
                    {m.role === 'assistant' && (
                      <motion.span 
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="inline-block w-1.5 h-4 bg-cyan ml-1 translate-y-1"
                      />
                    )}
                  </div>
                </motion.div>
              ))}
              
              {loading && (
                <div className="flex flex-col gap-4 items-start pl-6">
                  <div className="flex gap-1.5 h-6 items-end">
                    {[0, 1, 2, 3, 4].map(d => (
                      <motion.div
                        key={d}
                        animate={{ height: [4, 24, 4], opacity: [0.2, 1, 0.2] }}
                        transition={{ repeat: Infinity, duration: 1.2, delay: d * 0.15 }}
                        className="w-1.5 rounded-full bg-cyan shadow-[0_0_10px_rgba(0,212,224,0.5)]"
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-cyan font-black tracking-[0.4em] animate-pulse uppercase">Neural Processing Phase 4...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input Area */}
            <div className="p-10 border-t border-white/10 bg-[#050811] relative z-10">
              <div className="relative flex items-center gap-4">
                <div className="flex-1 relative">
                  <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && send()}
                    placeholder="ENTER TACTICAL COMMAND..."
                    className="w-full bg-white/5 border-2 border-white/5 rounded-2xl py-5 px-8 text-[14px] text-white font-medium placeholder-white/10 outline-none focus:border-cyan/30 focus:bg-white/10 transition-all"
                  />
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-1">
                    <div className="w-1 h-1 rounded-full bg-cyan animate-ping" />
                    <div className="w-1 h-1 rounded-full bg-cyan/50" />
                  </div>
                </div>
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
                    input.trim() 
                    ? 'bg-cyan text-black shadow-[0_0_50px_rgba(0,212,224,0.5)] hover:scale-105 active:scale-95' 
                    : 'bg-white/5 text-muted'
                  }`}
                >
                  <span className="text-3xl rotate-[-45deg] mt-[-4px] ml-[2px]">➤</span>
                </button>
              </div>
              <div className="mt-4 flex justify-between px-2">
                <span className="text-[8px] text-muted font-mono tracking-widest uppercase">Encryption: AES-256-GCM</span>
                <span className="text-[8px] text-muted font-mono tracking-widest uppercase">Buffer: OK</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
