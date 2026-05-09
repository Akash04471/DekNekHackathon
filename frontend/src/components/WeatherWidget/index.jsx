import React from 'react'
import { useJunctionStore } from '../../store/junctionStore'

const CONDITION_ICONS = {
  'Clear': '☀️', 'Partly Cloudy': '⛅', 'Cloudy': '☁️',
  'Light Rain': '🌧️', 'Rain': '🌧️', 'Thunderstorm': '⛈️',
  'Fog': '🌫️', 'Hazy': '🌫️', 'Snow': '❄️',
}

export default function WeatherWidget() {
  const weather = useJunctionStore(s => s.weather)
  if (!weather) return null

  const icon = CONDITION_ICONS[weather.condition] || '🌡️'

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="panel-header">
        <div className="dot" style={{ background: '#3B82F6', boxShadow: '0 0 6px #3B82F6' }} />
        <span>Weather</span>
        {weather.affects_timing && (
          <span className="ml-auto text-xs text-amber">⚠️ Affects timing</span>
        )}
      </div>
      <div className="px-3 pb-3 pt-2">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{icon}</span>
          <div>
            <div className="font-bold text-lg text-white">{weather.temp_c}°C</div>
            <div className="text-muted text-xs">{weather.condition}</div>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs text-muted">Humidity</div>
            <div className="font-mono text-sm text-blue-400">{weather.humidity_pct}%</div>
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <div>
            <span className="text-muted">Wind </span>
            <span className="font-mono text-cyan">{weather.wind_kmh} km/h</span>
          </div>
          <div>
            <span className="text-muted">Vis </span>
            <span className="font-mono text-cyan">{weather.visibility_km} km</span>
          </div>
          {weather.mock && <span className="text-muted italic">simulated</span>}
        </div>
        {weather.affects_timing && (
          <div className="mt-2 p-2 rounded-lg bg-amber/10 border border-amber/20 text-xs text-amber">
            🌧️ Extended stopping distance — +15% green time applied
          </div>
        )}
      </div>
    </div>
  )
}
