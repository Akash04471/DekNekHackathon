import React, { useEffect, useState, useRef } from 'react'
import { useJunctionStore } from '../../store/junctionStore'
import confetti from 'canvas-confetti';

const Digit = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true)
      const timer = setTimeout(() => {
        setDisplayValue(value)
        setIsAnimating(false)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [value, displayValue])

  return (
    <div className="relative w-[18px] h-[28px] overflow-hidden flex flex-col items-center justify-center bg-black/40 rounded-sm border border-white/5 mx-[1px]">
      <div 
        className={`text-[18px] font-mono font-bold text-cyan transition-transform duration-150 ease-in-out ${isAnimating ? 'translate-y-[-100%]' : 'translate-y-0'}`}
      >
        {displayValue}
      </div>
    </div>
  )
}

export default function CO2Odometer() {
  const co2Saved = useJunctionStore(s => s.simState.co2Saved || 0)
  const lastMilestone = useRef(0)

  useEffect(() => {
    const milestones = [10, 50, 100, 500, 1000]
    const currentMilestone = milestones.find(m => co2Saved >= m && lastMilestone.current < m)
    if (currentMilestone) {
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.7 },
        colors: ['#00F5FF', '#34d399', '#ffffff'],
        scalar: 0.8
      })
      lastMilestone.current = currentMilestone
    }
  }, [co2Saved])

  const formatted = co2Saved.toFixed(2).padStart(5, '0')
  const digits = formatted.replace('.', '').split('')
  const trees = (co2Saved / 21.7).toFixed(1)
  const km = (co2Saved / 0.21).toFixed(0)

  return (
    <div className="flex flex-col gap-4 p-5 bg-white/3 rounded-3xl border border-white/5 backdrop-blur-xl group hover:border-cyan/20 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-heading font-bold tracking-[0.2em] text-muted uppercase">Emission Offset</span>
        <div className="flex items-center gap-1.5 bg-green/10 px-2 py-0.5 rounded-full border border-green/20">
           <div className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
           <span className="text-[7px] font-mono font-bold text-green tracking-widest uppercase">Live Impact</span>
        </div>
      </div>

      <div className="flex items-baseline gap-3">
        <div className="flex bg-black/20 p-1.5 rounded-xl border border-white/5">
          {digits.map((d, i) => (
            <React.Fragment key={i}>
              <Digit value={d} />
              {i === 1 && <div className="text-cyan self-end pb-1.5 px-0.5 font-black text-lg opacity-40">.</div>}
            </React.Fragment>
          ))}
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-cyan leading-none">KG CO₂</span>
          <span className="text-[7px] font-mono text-muted uppercase font-bold">Accumulated</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col hover:bg-white/8 transition-colors">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-sm">🌲</span>
             <span className="text-xs font-black text-white">{trees}</span>
          </div>
          <span className="text-[7px] text-muted font-bold uppercase tracking-wider">Trees/Day</span>
        </div>
        <div className="p-3 rounded-2xl bg-white/5 border border-white/5 flex flex-col hover:bg-white/8 transition-colors">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-sm">🚗</span>
             <span className="text-xs font-black text-white">{km}km</span>
          </div>
          <span className="text-[7px] text-muted font-bold uppercase tracking-wider">Driving Offset</span>
        </div>
      </div>
    </div>
  )
}
