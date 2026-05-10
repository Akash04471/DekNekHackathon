import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

// ─── Intent Parser ──────────────────────────────────────────────────────
const INTENTS = [
  {
    patterns: [/emergency.*north/i, /ambulance.*north/i, /siren.*north/i, /trigger.*north/i, /override.*north/i],
    action: 'EMERGENCY_NORTH',
    response: '🚨 EMERGENCY PROTOCOL ENGAGED. Clearing North corridor immediately. Green Wave activated for 3 downstream junctions.',
  },
  {
    patterns: [/emergency.*east/i, /ambulance.*east/i, /siren.*east/i, /trigger.*east/i, /override.*east/i],
    action: 'EMERGENCY_EAST',
    response: '🚨 EMERGENCY PROTOCOL ENGAGED. Clearing East corridor immediately. Green Wave activated.',
  },
  {
    patterns: [/emergency.*south/i, /ambulance.*south/i, /siren.*south/i, /trigger.*south/i, /override.*south/i],
    action: 'EMERGENCY_SOUTH',
    response: '🚨 EMERGENCY PROTOCOL ENGAGED. Clearing South corridor immediately. Green Wave activated.',
  },
  {
    patterns: [/emergency.*west/i, /ambulance.*west/i, /siren.*west/i, /trigger.*west/i, /override.*west/i],
    action: 'EMERGENCY_WEST',
    response: '🚨 EMERGENCY PROTOCOL ENGAGED. Clearing West corridor immediately. Green Wave activated.',
  },
  {
    patterns: [/emergency/i, /trigger.*emergency/i, /trigger.*override/i, /ambulance/i, /siren/i],
    action: 'EMERGENCY_NORTH',
    response: '🚨 EMERGENCY PROTOCOL ENGAGED. Clearing North corridor. Green Wave activated for 3 downstream junctions.',
  },
  {
    patterns: [/clear/i, /all\s*clear/i, /stand\s*down/i, /reset/i, /resume/i, /cancel.*emergency/i],
    action: 'CLEAR_EMERGENCY',
    response: '✅ ALL CLEAR. Emergency corridor resolved. Returning to Autonomous Adaptive Mode. Signal efficiency stabilizing.',
  },
  {
    patterns: [/morning\s*rush/i, /rush\s*hour/i, /peak.*morning/i],
    action: 'SCENARIO_MORNING',
    response: '📊 SCENARIO LOADED: Morning Rush. North and South corridors entering high-density surge. Adaptive timing recalibrated.',
  },
  {
    patterns: [/severe.*congestion/i, /heavy.*traffic/i, /gridlock/i, /jam/i],
    action: 'SCENARIO_CONGESTION',
    response: '📊 SCENARIO LOADED: Severe Congestion. All corridors at 88%+ density. Emergency load-balancing engaged.',
  },
  {
    patterns: [/normal/i, /afternoon/i, /default/i, /standard/i],
    action: 'SCENARIO_NORMAL',
    response: '📊 SCENARIO LOADED: Normal Afternoon. Moderate mixed traffic across all corridors.',
  },
  {
    patterns: [/late\s*night/i, /night/i, /low.*traffic/i, /quiet/i],
    action: 'SCENARIO_NIGHT',
    response: '📊 SCENARIO LOADED: Late Night. Sparse traffic detected. Fast-cycling signal mode activated.',
  },
  {
    patterns: [/status/i, /report/i, /how.*traffic/i, /what.*happening/i, /overview/i, /summary/i],
    action: 'STATUS_REPORT',
    response: null, // Will be generated dynamically
  },
  {
    patterns: [/congestion/i, /density/i, /how.*busy/i, /which.*lane.*busy/i],
    action: 'CONGESTION_CHECK',
    response: null, // Will be generated dynamically
  },
  {
    patterns: [/open.*chat/i, /nexus.*ai/i, /assistant/i, /help/i],
    action: 'OPEN_CHAT',
    response: '🤖 Opening NEXUS AI Tactical Assistant. You can ask me anything about the junction.',
  },
]

function parseIntent(transcript) {
  const cleaned = transcript.toLowerCase().trim()
  for (const intent of INTENTS) {
    for (const pattern of intent.patterns) {
      if (pattern.test(cleaned)) {
        return intent
      }
    }
  }
  return null
}

// ─── Speech Synthesis ───────────────────────────────────────────────────
function speakText(text) {
  if (!window.speechSynthesis) return
  // Strip emoji for cleaner speech
  const clean = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim()
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(clean)
  utt.rate = 1.1
  utt.pitch = 0.9
  utt.volume = 0.8
  // Prefer a professional-sounding voice
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) 
    || voices.find(v => v.lang.startsWith('en'))
  if (preferred) utt.voice = preferred
  window.speechSynthesis.speak(utt)
}

// Register global speak function for store integration
window.speak = speakText

// ─── Waveform Visualizer ────────────────────────────────────────────────
function VoiceWaveform({ active }) {
  return (
    <div className="voice-waveform">
      {Array.from({ length: 24 }).map((_, i) => (
        <motion.div
          key={i}
          className="voice-waveform-bar"
          animate={active ? {
            height: [4, 12 + Math.random() * 28, 4],
            opacity: [0.3, 1, 0.3],
          } : {
            height: 4,
            opacity: 0.15,
          }}
          transition={active ? {
            repeat: Infinity,
            duration: 0.4 + Math.random() * 0.4,
            delay: i * 0.03,
            ease: 'easeInOut',
          } : { duration: 0.3 }}
        />
      ))}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────
export default function VoiceCommandCenter() {
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [feedback, setFeedback] = useState(null) // { text, type: 'success' | 'error' | 'info' }
  const [showOverlay, setShowOverlay] = useState(false)
  const [processing, setProcessing] = useState(false)
  const recognitionRef = useRef(null)
  const feedbackTimerRef = useRef(null)

  const {
    triggerEmergency,
    clearEmergency,
    setScenario,
    toggleChat,
    chatOpen,
    addChatMessage,
    lanes,
    signals,
  } = useJunctionStore()

  // Load voices on mount
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices()
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
    }
  }, [])

  const generateStatusReport = useCallback(() => {
    const totalVehicles = Object.values(lanes).reduce((s, l) => s + l.vehicle_count, 0)
    const avgDensity = Math.round(Object.values(lanes).reduce((s, l) => s + l.density_score, 0) / 4)
    const mode = signals.mode
    const activeLane = signals.active_phase
    return `📋 JUNCTION STATUS: ${totalVehicles} vehicles tracked across 4 corridors. Average density ${avgDensity}%. System mode: ${mode}. Active phase: ${activeLane}. All sensors nominal.`
  }, [lanes, signals])

  const generateCongestionReport = useCallback(() => {
    const sorted = Object.entries(lanes).sort((a, b) => b[1].density_score - a[1].density_score)
    const busiest = sorted[0]
    const quietest = sorted[sorted.length - 1]
    return `📊 CONGESTION ANALYSIS: Busiest corridor is ${busiest[0]} at ${busiest[1].density_score}% density with ${busiest[1].vehicle_count} vehicles. Quietest is ${quietest[0]} at ${quietest[1].density_score}%.`
  }, [lanes])

  const executeIntent = useCallback((intent) => {
    let responseText = intent.response

    switch (intent.action) {
      case 'EMERGENCY_NORTH':
        triggerEmergency('NORTH')
        break
      case 'EMERGENCY_EAST':
        triggerEmergency('EAST')
        break
      case 'EMERGENCY_SOUTH':
        triggerEmergency('SOUTH')
        break
      case 'EMERGENCY_WEST':
        triggerEmergency('WEST')
        break
      case 'CLEAR_EMERGENCY':
        clearEmergency()
        break
      case 'SCENARIO_MORNING':
        setScenario('Morning Rush')
        break
      case 'SCENARIO_CONGESTION':
        setScenario('Severe Congestion')
        break
      case 'SCENARIO_NORMAL':
        setScenario('Normal Afternoon')
        break
      case 'SCENARIO_NIGHT':
        setScenario('Late Night')
        break
      case 'STATUS_REPORT':
        responseText = generateStatusReport()
        break
      case 'CONGESTION_CHECK':
        responseText = generateCongestionReport()
        break
      case 'OPEN_CHAT':
        if (!chatOpen) toggleChat()
        break
      default:
        break
    }

    if (responseText) {
      addChatMessage({ role: 'assistant', text: `🎤 VOICE COMMAND: "${transcript}"\n\n${responseText}` })
      speakText(responseText)
      setFeedback({ text: responseText, type: 'success' })
    }
  }, [triggerEmergency, clearEmergency, setScenario, toggleChat, chatOpen, addChatMessage, transcript, generateStatusReport, generateCongestionReport])

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setFeedback({ text: 'Speech recognition not supported in this browser. Try Chrome.', type: 'error' })
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = 'en-US'
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setListening(true)
      setShowOverlay(true)
      setTranscript('')
      setFeedback(null)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        if (result.isFinal) {
          finalTranscript += result[0].transcript
        } else {
          interimTranscript += result[0].transcript
        }
      }

      setTranscript(finalTranscript || interimTranscript)

      if (finalTranscript) {
        setProcessing(true)
        setTimeout(() => {
          const intent = parseIntent(finalTranscript)
          if (intent) {
            executeIntent(intent)
          } else {
            const msg = `I heard: "${finalTranscript}" — but I couldn't match a command. Try saying "trigger emergency on North" or "switch to morning rush".`
            setFeedback({ text: msg, type: 'info' })
            speakText("Command not recognized. Please try again.")
          }
          setProcessing(false)
        }, 600)
      }
    }

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      if (event.error !== 'aborted') {
        setFeedback({ text: `Voice error: ${event.error}. Please try again.`, type: 'error' })
      }
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
      // Auto-close overlay after showing feedback
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      feedbackTimerRef.current = setTimeout(() => {
        setShowOverlay(false)
        setTranscript('')
        setFeedback(null)
      }, 4000)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [executeIntent])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  const handleMicClick = () => {
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) recognitionRef.current.abort()
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  return (
    <>
      {/* ── Floating Mic Button ──────────────────────────────────── */}
      <motion.button
        id="voice-command-btn"
        className={`voice-mic-btn ${listening ? 'voice-mic-active' : ''}`}
        onClick={handleMicClick}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        title="Voice Command (click to speak)"
      >
        {/* Pulse rings when listening */}
        <AnimatePresence>
          {listening && (
            <>
              <motion.div
                className="voice-mic-ring"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut' }}
              />
              <motion.div
                className="voice-mic-ring"
                initial={{ scale: 1, opacity: 0.4 }}
                animate={{ scale: 2, opacity: 0 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeOut', delay: 0.5 }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Mic Icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="1" width="6" height="14" rx="3" />
          <path d="M5 10a7 7 0 0 0 14 0" />
          <line x1="12" y1="21" x2="12" y2="17" />
          <line x1="8" y1="21" x2="16" y2="21" />
        </svg>
      </motion.button>

      {/* ── Full-screen Voice Overlay ────────────────────────────── */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            className="voice-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Background dismiss */}
            <div className="voice-overlay-bg" onClick={() => {
              stopListening()
              setShowOverlay(false)
            }} />

            {/* Content */}
            <motion.div
              className="voice-overlay-content"
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              {/* Header Tag */}
              <div className="voice-overlay-tag">
                <div className={`voice-status-dot ${listening ? 'active' : ''}`} />
                <span>{listening ? 'LISTENING' : processing ? 'PROCESSING' : 'STANDBY'}</span>
              </div>

              {/* Main Visual */}
              <div className="voice-overlay-visual">
                <motion.div
                  className={`voice-orb ${listening ? 'voice-orb-active' : ''}`}
                  animate={listening ? {
                    boxShadow: [
                      '0 0 40px rgba(0, 212, 224, 0.3), inset 0 0 30px rgba(0, 212, 224, 0.1)',
                      '0 0 80px rgba(0, 212, 224, 0.6), inset 0 0 50px rgba(0, 212, 224, 0.2)',
                      '0 0 40px rgba(0, 212, 224, 0.3), inset 0 0 30px rgba(0, 212, 224, 0.1)',
                    ]
                  } : {}}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="1" width="6" height="14" rx="3" />
                    <path d="M5 10a7 7 0 0 0 14 0" />
                    <line x1="12" y1="21" x2="12" y2="17" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                  </svg>
                </motion.div>
              </div>

              {/* Waveform */}
              <VoiceWaveform active={listening} />

              {/* Transcript */}
              <div className="voice-transcript-area">
                {transcript ? (
                  <motion.p
                    className="voice-transcript"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    "{transcript}"
                  </motion.p>
                ) : listening ? (
                  <p className="voice-transcript-placeholder">
                    Say a command...
                  </p>
                ) : null}
              </div>

              {/* Feedback */}
              <AnimatePresence>
                {feedback && (
                  <motion.div
                    className={`voice-feedback voice-feedback-${feedback.type}`}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {feedback.text}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Quick Commands Hint */}
              {listening && !transcript && (
                <motion.div
                  className="voice-hints"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  <span className="voice-hint-label">TRY SAYING</span>
                  <div className="voice-hint-items">
                    <span>"Trigger emergency on North"</span>
                    <span>"Switch to morning rush"</span>
                    <span>"Status report"</span>
                    <span>"All clear"</span>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
