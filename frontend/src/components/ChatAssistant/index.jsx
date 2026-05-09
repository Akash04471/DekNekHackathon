import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

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
  const { chatOpen, chatMessages, toggleChat, addChatMessage } = useJunctionStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (chatOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatOpen])

  const send = async () => {
    const msg = input.trim()
    if (!msg || loading) return
    setInput('')
    addChatMessage({ role: 'user', text: msg })
    setLoading(true)
    try {
      const r = await fetch(`/api/chat?message=${encodeURIComponent(msg)}`)
      const data = await r.json()
      addChatMessage({ role: 'assistant', text: data.reply })
    } catch {
      addChatMessage({ role: 'assistant', text: 'Connection lost. Please retry.' })
    } finally {
      setLoading(false)
    }
  }

  const ui = (
    <AnimatePresence>
      {chatOpen && (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleChat}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-auto"
          />

          {/* Panel */}
          <motion.div
            className="absolute top-0 right-0 bottom-0 w-[400px] bg-[#060a18f5] border-l border-white/5 flex flex-col pointer-events-auto"
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {/* Header */}
            <div className="p-6 pb-4 border-b border-white/5">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-heading font-bold text-[11px] tracking-[0.2em] text-white/90 mb-1">NEXUS AI</h2>
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse-soft" />
                    <span className="text-[9px] text-muted font-mono">Operational</span>
                  </div>
                </div>
                <button onClick={toggleChat} className="text-muted hover:text-white transition-colors text-lg p-1">×</button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {chatMessages.map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col"
                >
                  <span className="text-[8px] font-bold text-muted uppercase tracking-widest mb-2">
                    {m.role === 'user' ? 'You' : 'Nexus AI'}
                  </span>
                  <div className={`px-4 py-3 rounded-xl text-[12px] leading-relaxed ${
                    m.role === 'user'
                    ? 'bg-cyan/6 text-white/90 border border-cyan/10'
                    : 'bg-white/3 text-white/80 border border-white/5'
                  }`}>
                    {m.role === 'assistant' ? <Typewriter text={m.text} /> : m.text}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map(d => (
                      <motion.div
                        key={d}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: d * 0.15 }}
                        className="w-1 h-1 rounded-full bg-cyan"
                      />
                    ))}
                  </div>
                  <span className="text-[9px] text-muted font-mono">Processing...</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/5">
              <div className="relative">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Ask about traffic, predictions..."
                  className="w-full bg-white/3 border border-white/6 rounded-xl py-3 pl-4 pr-12 text-[12px] text-white placeholder-white/20 outline-none focus:border-cyan/20 transition-colors"
                />
                <button
                  onClick={send}
                  disabled={!input.trim() || loading}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm ${
                    input.trim() ? 'bg-cyan text-[#030712]' : 'bg-white/5 text-muted'
                  }`}
                >
                  ➤
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )

  return createPortal(ui, document.body)
}
