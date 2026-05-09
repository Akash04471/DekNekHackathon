import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

export default function ChatAssistant() {
  const { chatOpen, chatMessages, toggleChat, addChatMessage } = useJunctionStore()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

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
      addChatMessage({ role: 'assistant', text: 'Connection error. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const suggestions = [
    "What's causing congestion?",
    "When will traffic clear?",
    "System efficiency status",
    "Emergency protocol status",
  ]

  return (
    <>
      {/* Toggle button */}
      <motion.button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full flex items-center justify-center text-xl"
        style={{
          background: 'linear-gradient(135deg, #00F5FF20, #A855F720)',
          border: '1px solid rgba(0,245,255,0.4)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 0 20px rgba(0,245,255,0.3)',
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {chatOpen ? '✕' : '🤖'}
      </motion.button>

      {/* Chat drawer */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="fixed bottom-20 right-4 z-50 w-80 rounded-2xl overflow-hidden flex flex-col"
            style={{
              height: 420,
              background: 'rgba(10,14,26,0.96)',
              border: '1px solid rgba(0,245,255,0.2)',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 40px rgba(0,245,255,0.15)',
            }}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
              <div className="w-2 h-2 rounded-full bg-cyan" style={{ boxShadow: '0 0 6px #00F5FF' }} />
              <span className="font-semibold text-sm text-cyan">NEXUS AI</span>
              <span className="text-xs text-muted ml-auto">Assistant</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {chatMessages.map((m, i) => (
                <motion.div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div
                    className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed"
                    style={{
                      background: m.role === 'user'
                        ? 'rgba(0,245,255,0.12)'
                        : 'rgba(255,255,255,0.05)',
                      border: m.role === 'user'
                        ? '1px solid rgba(0,245,255,0.25)'
                        : '1px solid rgba(255,255,255,0.06)',
                      color: m.role === 'user' ? '#00F5FF' : '#E8F4FF',
                    }}
                  >
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-xl px-3 py-2 text-xs border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-muted">Analyzing</span>
                    <span className="animate-pulse">...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Suggestions */}
            {chatMessages.length <= 1 && (
              <div className="px-3 pb-1 flex flex-wrap gap-1">
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-xs px-2 py-1 rounded-lg border border-white/10 text-muted hover:border-cyan/40 hover:text-cyan transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 p-3 border-t border-white/5">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask NEXUS AI..."
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-muted outline-none focus:border-cyan/40 transition-colors"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="px-3 py-2 rounded-lg text-xs font-bold transition-all"
                style={{
                  background: input.trim() ? 'rgba(0,245,255,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${input.trim() ? 'rgba(0,245,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: input.trim() ? '#00F5FF' : '#4A6080',
                }}
              >
                ➤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
