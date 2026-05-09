import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { useJunctionStore } from '../../store/junctionStore'

const LANE_COLORS = { NORTH: '#00F5FF', EAST: '#00FF88', SOUTH: '#FFB800', WEST: '#A855F7' }

function DensityGauge({ value, color }) {
  const r = 22, circ = 2 * Math.PI * r
  const pct = Math.min(value / 100, 1)
  return (
    <svg width="54" height="54" viewBox="0 0 54 54">
      <circle cx="27" cy="27" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
      <circle
        cx="27" cy="27" r={r} fill="none" stroke={color} strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ}`}
        transform="rotate(-90 27 27)"
        style={{ transition: 'stroke-dasharray 0.8s ease', filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text x="27" y="31" textAnchor="middle" fill={color} fontSize="10" fontFamily="JetBrains Mono" fontWeight="700">
        {Math.round(value)}
      </text>
    </svg>
  )
}

function TypeBar({ label, count, max, color }) {
  const pct = max > 0 ? Math.min((count / max) * 100, 100) : 0
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="text-muted text-xs w-8">{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${pct}%` }}
          style={{ background: color, boxShadow: `0 0 4px ${color}` }}
        />
      </div>
      <span className="font-mono text-xs w-5 text-right" style={{ color }}>{count}</span>
    </div>
  )
}

function LaneRow({ lane }) {
  const laneData = useJunctionStore(s => s.lanes[lane])
  const color = LANE_COLORS[lane]
  const d = laneData || {}
  const vt = d.vehicle_types || {}
  const vc = d.vehicle_count || 0
  const ds = d.density_score || 0
  const spd = d.avg_speed_kmh || 0
  const que = d.queue_length_m || 0
  const total = Math.max(vc, 1)

  return (
    <motion.div
      className="glass rounded-xl p-3 border"
      style={{ borderColor: `${color}25` }}
      animate={{ boxShadow: d.has_emergency ? `0 0 16px rgba(255,68,68,0.4)` : 'none' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          <span className="font-semibold text-xs tracking-widest" style={{ color }}>{lane}</span>
          {d.has_emergency && (
            <span className="text-xs text-red animate-blink-red font-bold">🚨 EMG</span>
          )}
        </div>
        <DensityGauge value={ds} color={color} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2 text-center">
        <div>
          <div className="font-mono text-base font-bold" style={{ color }}>{vc}</div>
          <div className="text-muted text-xs">vehicles</div>
        </div>
        <div>
          <div className="font-mono text-base font-bold text-cyan">{Math.round(spd)}</div>
          <div className="text-muted text-xs">km/h</div>
        </div>
        <div>
          <div className="font-mono text-base font-bold text-amber">{Math.round(que)}</div>
          <div className="text-muted text-xs">m queue</div>
        </div>
      </div>

      <TypeBar label="Car"   count={vt.car   || 0} max={total} color="#60A5FA" />
      <TypeBar label="Bike"  count={vt.bike  || 0} max={total} color="#A78BFA" />
      <TypeBar label="Truck" count={vt.truck || 0} max={total} color="#F59E0B" />
      {(vt.emergency || 0) > 0 && (
        <TypeBar label="EMG" count={vt.emergency} max={total} color="#FF4444" />
      )}
    </motion.div>
  )
}

export default function DetectionPanel() {
  const simState = useJunctionStore(s => s.simState)
  const setDetection = useJunctionStore(s => s.setDetection)
  const connected = useJunctionStore(s => s.connected.detection)

  // Polling fallback: if WS data isn't coming through, poll REST API
  useEffect(() => {
    let active = true
    const poll = async () => {
      if (!active) return
      try {
        const r = await fetch('/api/lanes')
        if (r.ok) {
          const data = await r.json()
          // Transform REST format to match WS payload format
          setDetection({
            lanes: data,
            sim_state: simState,
          })
        }
      } catch (_) {}
    }

    // Poll every 2 seconds as a fallback
    poll()
    const id = setInterval(poll, 2000)
    return () => { active = false; clearInterval(id) }
  }, [])

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="panel-header">
        <div className="dot" style={{ background: '#00FF88', boxShadow: '0 0 6px #00FF88' }} />
        <span>Vehicle Detection</span>
        <span className="ml-auto text-xs text-muted">{simState?.scenario}</span>
      </div>
      <div className="p-2 flex flex-col gap-2">
        {['NORTH','EAST','SOUTH','WEST'].map(l => (
          <LaneRow key={l} lane={l} />
        ))}
      </div>
    </div>
  )
}
