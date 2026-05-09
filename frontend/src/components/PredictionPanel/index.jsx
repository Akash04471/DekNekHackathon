import React, { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useJunctionStore } from '../../store/junctionStore'

const LANE_COLORS = { NORTH: '#00F5FF', EAST: '#00FF88', SOUTH: '#FFB800', WEST: '#A855F7' }

export default function PredictionPanel() {
  const [activeLane, setActiveLane] = useState('NORTH')
  const predictions = useJunctionStore(s => s.predictions)
  const lanes = useJunctionStore(s => s.lanes)
  const forecasts = predictions.forecasts || {}
  const data = (forecasts[activeLane] || []).map(pt => ({
    label: `+${pt.offset_minutes}m`,
    predicted: pt.predicted_density,
    lower: pt.confidence_lower,
    upper: pt.confidence_upper,
  }))

  const color = LANE_COLORS[activeLane]

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="panel-header">
        <div className="dot" style={{ background: '#A855F7', boxShadow: '0 0 6px #A855F7' }} />
        <span>Congestion Forecast</span>
        <span className="ml-auto font-mono text-xs text-purple-400">MAPE {predictions.mape_score}%</span>
      </div>

      {/* Lane selector */}
      <div className="flex gap-1 px-3 pt-2">
        {Object.keys(LANE_COLORS).map(lane => (
          <button
            key={lane}
            onClick={() => setActiveLane(lane)}
            className="text-xs px-2 py-1 rounded-md border transition-all duration-200"
            style={{
              borderColor: activeLane === lane ? LANE_COLORS[lane] : 'rgba(255,255,255,0.1)',
              color: activeLane === lane ? LANE_COLORS[lane] : '#4A6080',
              background: activeLane === lane ? `${LANE_COLORS[lane]}15` : 'transparent',
            }}
          >
            {lane.slice(0,1)}
          </button>
        ))}
        <span className="ml-auto text-muted text-xs self-center">4h horizon</span>
      </div>

      {/* Chart */}
      <div className="px-3 pt-2" style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id={`pg-${activeLane}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.4} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fill: '#4A6080', fontSize: 9 }} interval={3} tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tick={{ fill: '#4A6080', fontSize: 9 }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ background: '#0A0E1A', border: `1px solid ${color}40`, borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#8BA3BF' }}
              itemStyle={{ color }}
            />
            <Area type="monotone" dataKey="upper"    stroke="none"  fill={color} fillOpacity={0.08} isAnimationActive={false} />
            <Area type="monotone" dataKey="lower"    stroke="none"  fill="#050810" fillOpacity={1}   isAnimationActive={false} />
            <Area type="monotone" dataKey="predicted" stroke={color} fill={`url(#pg-${activeLane})`}
              strokeWidth={2} dot={false} isAnimationActive={false}
              style={{ filter: `drop-shadow(0 0 3px ${color})` }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Current vs predicted */}
      <div className="grid grid-cols-2 gap-2 px-3 pb-3 pt-1">
        <div className="glass-bright rounded-lg p-2 text-center">
          <div className="text-muted text-xs mb-1">Current</div>
          <div className="font-mono font-bold" style={{ color }}>
            {Math.round(lanes[activeLane]?.density_score || 0)}
          </div>
        </div>
        <div className="glass-bright rounded-lg p-2 text-center">
          <div className="text-muted text-xs mb-1">15min</div>
          <div className="font-mono font-bold" style={{ color }}>
            {Math.round(data[1]?.predicted || 0)}
          </div>
        </div>
      </div>
    </div>
  )
}
