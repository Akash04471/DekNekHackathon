import React, { useRef, useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

// ─── Component 1: Oscilloscope ──────────────────────────────────────
function Oscilloscope({ active, color }) {
  const canvasRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let frame

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.beginPath()
      ctx.strokeStyle = active ? '#f87171' : '#00F5FF'
      ctx.lineWidth = active ? 2.5 : 1.5

      const sliceWidth = canvas.width / 128
      let x = 0

      for (let i = 0; i < 128; i++) {
        const t = Date.now() * 0.01 + i * 0.1
        const noise = (Math.random() - 0.5) * (active ? 20 : 5)
        const v = Math.sin(t) * (active ? 25 : 10) + noise
        const y = canvas.height / 2 + v

        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
        x += sliceWidth
      }
      ctx.stroke()
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [active])

  return <canvas ref={canvasRef} width={220} height={80} className="w-full bg-black/40 rounded-lg border border-white/5" />
}

// ─── Component 1: Spectrogram ────────────────────────────────────────
function Spectrogram({ active }) {
  const canvasRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let frame

    const draw = () => {
      // Shift left
      const img = ctx.getImageData(1, 0, canvas.width - 1, canvas.height)
      ctx.putImageData(img, 0, 0)

      // Draw new column on the right
      for (let y = 0; y < canvas.height; y++) {
        const freq = y / canvas.height
        const isSirenFreq = y > 20 && y < 45
        let val = Math.random() * 50
        if (active && isSirenFreq) val += 150 + Math.random() * 100
        
        const r = val
        const g = val * 0.8
        const b = val * 1.2
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(canvas.width - 1, canvas.height - y, 1, 1)
      }

      // Red siren band overlay
      ctx.fillStyle = 'rgba(248, 113, 113, 0.2)'
      ctx.fillRect(canvas.width - 1, 35, 1, 25)

      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [active])

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={220} height={80} className="w-full bg-black/40 rounded-lg border border-white/5" />
      <div className="absolute top-1/2 -translate-y-1/2 right-2 text-[7px] font-black text-red/60 uppercase tracking-tighter vertical-text">SIREN BAND</div>
    </div>
  )
}

// ─── Component 2: Radar Compass ──────────────────────────────────────
function RadarCompass({ direction, confidence, distance, eta }) {
  const rotations = { NORTH: 0, EAST: 90, SOUTH: 180, WEST: 270 }
  const angle = rotations[direction] ?? 0
  const arcWidth = confidence * 180 // 90% = 180deg
  
  return (
    <div className="relative w-[180px] h-[180px] mx-auto my-4">
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        {/* Outer Ring */}
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <circle cx="100" cy="100" r="35" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
        
        {/* Labels */}
        {['N', 'E', 'S', 'W'].map((l, i) => (
          <text key={l} x={100 + Math.sin(i * Math.PI/2) * 85} y={105 - Math.cos(i * Math.PI/2) * 85} 
            fill="rgba(255,255,255,0.2)" fontSize="10" textAnchor="middle" className="font-heading font-bold">
            {l}
          </text>
        ))}

        {/* Sweep Line */}
        <motion.line
          x1="100" y1="100" x2="100" y2="10"
          stroke="var(--cyan)" strokeWidth="0.5" strokeOpacity="0.3"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          style={{ originX: "100px", originY: "100px" }}
        />

        {/* Direction Sector */}
        {confidence > 0.1 && (
          <motion.path
            d={`M 100 100 L ${100 + Math.sin((angle - arcWidth/2) * Math.PI/180) * 95} ${100 - Math.cos((angle - arcWidth/2) * Math.PI/180) * 95} A 95 95 0 0 1 ${100 + Math.sin((angle + arcWidth/2) * Math.PI/180) * 95} ${100 - Math.cos((angle + arcWidth/2) * Math.PI/180) * 95} Z`}
            fill="rgba(248, 113, 113, 0.15)"
            stroke="rgba(248, 113, 113, 0.6)"
            strokeWidth="1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        )}

        {/* Blip Dot */}
        {distance !== undefined && distance > 0 && (
          <circle
            cx={100 + Math.sin(angle * Math.PI/180) * (Math.min(distance, 400) / 400 * 90)}
            cy={100 - Math.cos(angle * Math.PI/180) * (Math.min(distance, 400) / 400 * 90)}
            r="3"
            fill="var(--red)"
            className="shadow-[0_0_10px_rgba(248,113,113,0.8)]"
          />
        )}
      </svg>
      
      {/* Center ETA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[20px] font-black font-heading leading-none text-white/90">{eta || '—'}</span>
        <span className="text-[7px] font-bold text-muted uppercase tracking-[0.2em] mt-1">ETA SEC</span>
      </div>
    </div>
  )
}

// ─── Component 3: Confidence Fusion ─────────────────────────────────
function ConfidenceFusion({ audioConf, visualConf }) {
  const fused = (audioConf * 0.6 + visualConf * 0.4)
  const [currentFused, setCurrentFused] = useState(0)

  useEffect(() => {
    let frame
    const animate = () => {
      setCurrentFused(p => p + (fused - p) * 0.12)
      frame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frame)
  }, [fused])

  const getColor = (v) => v > 0.8 ? 'var(--red)' : v > 0.6 ? 'var(--amber)' : 'var(--text-muted)'

  return (
    <div className="space-y-4 pt-4 border-t border-white/5">
      <div className="flex justify-around items-end h-24">
        {[
          { label: 'AUDIO', val: audioConf, color: getColor(audioConf) },
          { label: 'VISUAL', val: visualConf, color: getColor(visualConf) },
          { label: 'FUSED', val: currentFused, color: getColor(currentFused), main: true },
        ].map(b => (
          <div key={b.label} className="flex flex-col items-center gap-2 h-full justify-end">
            <div className="relative w-6 flex-1 bg-white/3 rounded-t-sm overflow-hidden">
              <motion.div
                className="absolute bottom-0 left-0 right-0 rounded-t-sm"
                style={{ background: b.color, height: `${b.val * 100}%` }}
              />
              {b.main && currentFused > 0.8 && (
                <motion.div 
                  className="absolute inset-0 border border-white/40 z-10"
                  animate={{ opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 0.4 }}
                />
              )}
            </div>
            <span className="text-[8px] font-bold text-muted">{b.label}</span>
          </div>
        ))}
      </div>
      
      <div className="flex gap-2 justify-center">
        <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-mono border border-white/5">
          🎤 YAMNet <span className="text-cyan">{Math.round(audioConf * 100)}%</span>
        </span>
        <span className="px-2 py-0.5 rounded bg-white/5 text-[9px] font-mono border border-white/5">
          👁 YOLOv8 <span className="text-cyan">{Math.round(visualConf * 100)}%</span>
        </span>
      </div>
    </div>
  )
}

// ─── Main Panel ──────────────────────────────────────────────────────
export default function AudioPanel() {
  const audio = useJunctionStore(s => s.audio)
  const lanes = useJunctionStore(s => s.lanes)

  // Derive visual confidence from lane data
  const visualConf = useMemo(() => {
    const activeEmergency = Object.values(lanes).find(l => l.has_emergency)
    return activeEmergency ? 0.85 + Math.random() * 0.1 : 0.15
  }, [lanes])

  return (
    <div className="space-y-4">
      <span className="section-label">Acoustic Intelligence v4</span>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[7px] font-bold text-muted uppercase tracking-widest pl-1">Waveform</span>
          <Oscilloscope active={audio.siren_detected} />
        </div>
        <div className="space-y-1">
          <span className="text-[7px] font-bold text-muted uppercase tracking-widest pl-1">Spectrogram</span>
          <Spectrogram active={audio.siren_detected} />
        </div>
      </div>

      <RadarCompass 
        direction={audio.siren_detected ? 'NORTH' : null} 
        confidence={audio.confidence}
        distance={audio.estimated_distance_m}
        eta={audio.estimated_eta_seconds}
      />

      <ConfidenceFusion 
        audioConf={audio.confidence} 
        visualConf={visualConf}
      />
    </div>
  )
}
