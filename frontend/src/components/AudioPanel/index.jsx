import React, { useRef, useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

// ─── Component 1: Oscilloscope ──────────────────────────────────────
function Oscilloscope({ active, dbLevel }) {
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

      // Height responds to dbLevel
      const amplitude = (dbLevel / 100) * (active ? 40 : 15)

      for (let i = 0; i < 128; i++) {
        const t = Date.now() * 0.01 + i * 0.1
        const noise = (Math.random() - 0.5) * (active ? 15 : 3)
        const v = Math.sin(t) * amplitude + noise
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
  }, [active, dbLevel])

  return <canvas ref={canvasRef} width={220} height={80} className="w-full bg-black/40 rounded-lg border border-white/5" />
}

// ─── Component 2: Spectrogram ────────────────────────────────────────
function Spectrogram({ active, dbLevel }) {
  const canvasRef = useRef()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    let frame

    const draw = () => {
      const img = ctx.getImageData(1, 0, canvas.width - 1, canvas.height)
      ctx.putImageData(img, 0, 0)

      for (let y = 0; y < canvas.height; y++) {
        const isSirenFreq = y > 25 && y < 45
        let val = (Math.random() * 30) + (dbLevel * 0.2)
        if (active && isSirenFreq) val += 180 + Math.random() * 70
        
        const r = val
        const g = active && isSirenFreq ? val * 0.2 : val * 0.8
        const b = val * 1.2
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(canvas.width - 1, canvas.height - y, 1, 1)
      }

      ctx.fillStyle = 'rgba(248, 113, 113, 0.15)'
      ctx.fillRect(canvas.width - 1, 35, 1, 20)

      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [active, dbLevel])

  return (
    <div className="relative">
      <canvas ref={canvasRef} width={220} height={80} className="w-full bg-black/40 rounded-lg border border-white/5" />
      <div className="absolute top-1/2 -translate-y-1/2 right-2 text-[7px] font-black text-red/60 uppercase tracking-tighter vertical-text">SIREN BAND</div>
    </div>
  )
}

// ─── Component 3: Radar Compass ──────────────────────────────────────
function RadarCompass({ direction, confidence, distance, eta, active }) {
  const rotations = { NORTH: 0, EAST: 90, SOUTH: 180, WEST: 270 }
  const angle = rotations[direction] ?? 0
  const arcWidth = confidence * 140 
  
  return (
    <div className="relative w-[180px] h-[180px] mx-auto my-4">
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        <circle cx="100" cy="100" r="95" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        <circle cx="100" cy="100" r="65" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        <circle cx="100" cy="100" r="35" fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
        
        {['N', 'E', 'S', 'W'].map((l, i) => (
          <text key={l} x={100 + Math.sin(i * Math.PI/2) * 85} y={105 - Math.cos(i * Math.PI/2) * 85} 
            fill="rgba(255,255,255,0.2)" fontSize="10" textAnchor="middle" className="font-heading font-bold">
            {l}
          </text>
        ))}

        <motion.line
          x1="100" y1="100" x2="100" y2="10"
          stroke="var(--cyan)" strokeWidth="0.5" strokeOpacity="0.3"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          style={{ originX: "100px", originY: "100px" }}
        />

        {active && confidence > 0.1 && (
          <motion.path
            d={`M 100 100 L ${100 + Math.sin((angle - arcWidth/2) * Math.PI/180) * 95} ${100 - Math.cos((angle - arcWidth/2) * Math.PI/180) * 95} A 95 95 0 0 1 ${100 + Math.sin((angle + arcWidth/2) * Math.PI/180) * 95} ${100 - Math.cos((angle + arcWidth/2) * Math.PI/180) * 95} Z`}
            fill="rgba(248, 113, 113, 0.1)"
            stroke="rgba(248, 113, 113, 0.4)"
            strokeWidth="0.5"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        )}

        {active && (
          <motion.circle
            cx={100 + Math.sin(angle * Math.PI/180) * (Math.max(20, Math.min(distance, 400) / 400 * 90))}
            cy={100 - Math.cos(angle * Math.PI/180) * (Math.max(20, Math.min(distance, 400) / 400 * 90))}
            r="4"
            fill="var(--red)"
            animate={{ scale: [1, 1.5, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className={`text-[22px] font-black font-heading leading-none ${active ? 'text-red animate-pulse' : 'text-white/80'}`}>
          {active ? Math.round(eta) : '---'}
        </span>
        <span className="text-[7px] font-bold text-muted uppercase tracking-[0.2em] mt-1">ETA SEC</span>
      </div>
    </div>
  )
}

// ─── Component 4: Confidence Fusion ─────────────────────────────────
function ConfidenceFusion({ audioConf, visualConf }) {
  const fused = (audioConf * 0.7 + visualConf * 0.3)
  const [currentFused, setCurrentFused] = useState(0)

  useEffect(() => {
    let frame
    const animate = () => {
      setCurrentFused(p => p + (fused - p) * 0.1)
      frame = requestAnimationFrame(animate)
    }
    animate()
    return () => cancelAnimationFrame(frame)
  }, [fused])

  const getColor = (v) => v > 0.7 ? 'var(--red)' : v > 0.4 ? 'var(--cyan)' : 'var(--white/10)'

  return (
    <div className="space-y-4 pt-2 border-t border-white/5">
      <div className="flex justify-around items-end h-20">
        {[
          { label: 'AUDIO', val: audioConf, color: audioConf > 0.5 ? 'var(--red)' : 'var(--cyan)' },
          { label: 'VISUAL', val: visualConf, color: visualConf > 0.5 ? 'var(--red)' : 'var(--cyan)' },
          { label: 'FUSED', val: currentFused, color: getColor(currentFused), main: true },
        ].map(b => (
          <div key={b.label} className="flex flex-col items-center gap-1.5 h-full justify-end">
            <div className="relative w-5 flex-1 bg-white/5 rounded-t-sm overflow-hidden">
              <motion.div
                className="absolute bottom-0 left-0 right-0 rounded-t-sm transition-all duration-300"
                style={{ background: b.color, height: `${b.val * 100}%` }}
              />
              {b.main && currentFused > 0.7 && (
                <motion.div 
                  className="absolute inset-0 bg-red/20 z-10"
                  animate={{ opacity: [0, 0.4, 0] }}
                  transition={{ repeat: Infinity, duration: 0.5 }}
                />
              )}
            </div>
            <span className="text-[7px] font-bold text-muted tracking-tighter">{b.label}</span>
          </div>
        ))}
      </div>
      
      <div className="flex gap-1.5 justify-center">
        <div className="px-2 py-1 rounded bg-white/3 border border-white/5 flex items-center gap-1.5">
          <span className="text-[8px] text-muted uppercase">YAMNet</span>
          <span className="text-[10px] font-mono text-cyan">{Math.round(audioConf * 100)}%</span>
        </div>
        <div className="px-2 py-1 rounded bg-white/3 border border-white/5 flex items-center gap-1.5">
          <span className="text-[8px] text-muted uppercase">YOLOv8</span>
          <span className="text-[10px] font-mono text-cyan">{Math.round(visualConf * 100)}%</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Panel ──────────────────────────────────────────────────────
export default function AudioPanel() {
  const audio = useJunctionStore(s => s.audio)
  const lanes = useJunctionStore(s => s.lanes)
  const signals = useJunctionStore(s => s.signals)

  // Link to active emergency state
  const isEmergency = signals.mode === 'EMERGENCY'
  const activeLane = signals.emergency_lane || 'NORTH'
  
  const visualConf = useMemo(() => {
    const laneData = lanes[activeLane]
    return isEmergency ? 0.92 : (laneData?.vehicle_count > 15 ? 0.3 : 0.1)
  }, [lanes, isEmergency, activeLane])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="section-label">Acoustic Intelligence v4</span>
        {isEmergency && (
          <motion.span 
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 0.8 }}
            className="text-[8px] font-black text-red border border-red/40 px-1.5 py-0.5 rounded uppercase"
          >
            Siren Lock
          </motion.span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <span className="text-[7px] font-bold text-muted uppercase tracking-widest pl-1">Waveform</span>
          <Oscilloscope active={isEmergency} dbLevel={audio.db_level} />
        </div>
        <div className="space-y-1">
          <span className="text-[7px] font-bold text-muted uppercase tracking-widest pl-1">Spectrogram</span>
          <Spectrogram active={isEmergency} dbLevel={audio.db_level} />
        </div>
      </div>

      <RadarCompass 
        active={isEmergency}
        direction={activeLane} 
        confidence={audio.confidence}
        distance={audio.estimated_distance_m}
        eta={signals.emergency_eta || audio.estimated_eta_seconds}
      />

      <ConfidenceFusion 
        audioConf={audio.confidence} 
        visualConf={visualConf}
      />
    </div>
  )
}
