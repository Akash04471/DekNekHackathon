import React, { Suspense, useMemo, useState, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Stars, Float, Text, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { useJunctionStore } from '../../store/junctionStore'

// ─── Procedural City ─────────────────────────────────────────────────
function CityEnvironment() {
  const buildings = useMemo(() => {
    const b = []
    for (let i = 0; i < 80; i++) {
      const x = (Math.random() - 0.5) * 250
      const z = (Math.random() - 0.5) * 250
      if (Math.abs(x) < 22 && Math.abs(z) < 22) continue
      const h = 15 + Math.random() * 80
      b.push({ id: i, pos: [x, h / 2, z], w: 6 + Math.random() * 12, h, d: 6 + Math.random() * 12 })
    }
    return b
  }, [])

  return (
    <group>
      {buildings.map(b => (
        <mesh key={b.id} position={b.pos} castShadow receiveShadow>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#070c18" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}
      <gridHelper args={[400, 80, '#0d1525', '#080e1c']} position={[0, 0.02, 0]} />
    </group>
  )
}

// ─── Road System with lane markings + zebra crossings ────────────────
function RoadSystem() {
  const dashes = useMemo(() => {
    const d = []
    for (let i = -180; i < 180; i += 12) {
      d.push(i)
    }
    return d
  }, [])

  return (
    <group>
      {/* Main roads */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[400, 28]} />
        <meshStandardMaterial color="#0c0c0c" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[400, 28]} />
        <meshStandardMaterial color="#0c0c0c" roughness={0.9} />
      </mesh>

      {/* Center line dashes (E-W road) */}
      {dashes.map((x, i) => (
        Math.abs(x) > 16 ? (
          <mesh key={`ew-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, 0]}>
            <planeGeometry args={[6, 0.2]} />
            <meshBasicMaterial color="#2a3a55" transparent opacity={0.6} />
          </mesh>
        ) : null
      ))}

      {/* Center line dashes (N-S road) */}
      {dashes.map((z, i) => (
        Math.abs(z) > 16 ? (
          <mesh key={`ns-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, z]}>
            <planeGeometry args={[0.2, 6]} />
            <meshBasicMaterial color="#2a3a55" transparent opacity={0.6} />
          </mesh>
        ) : null
      ))}

      {/* Zebra crossings at each approach */}
      {[
        { pos: [0, 0.07, -15], rot: 0 },
        { pos: [0, 0.07, 15], rot: 0 },
        { pos: [-15, 0.07, 0], rot: Math.PI / 2 },
        { pos: [15, 0.07, 0], rot: Math.PI / 2 },
      ].map((z, zi) => (
        <group key={`zebra-${zi}`} position={z.pos} rotation={[0, z.rot, 0]}>
          {Array.from({ length: 6 }, (_, j) => (
            <mesh key={j} rotation={[-Math.PI / 2, 0, 0]} position={[(j - 2.5) * 2, 0, 0]}>
              <planeGeometry args={[1.2, 5]} />
              <meshBasicMaterial color="#1a2540" transparent opacity={0.4} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Junction intersection */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial color="#0e0e0e" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  )
}

// ─── Congestion Heatmap Overlay ──────────────────────────────────────
function HeatmapOverlay({ lanes, visible }) {
  if (!visible) return null

  const positions = {
    NORTH: [0, 0.15, -40],
    SOUTH: [0, 0.15, 40],
    EAST: [40, 0.15, 0],
    WEST: [-40, 0.15, 0],
  }
  const rotations = {
    NORTH: [-Math.PI / 2, 0, 0],
    SOUTH: [-Math.PI / 2, 0, 0],
    EAST: [-Math.PI / 2, 0, Math.PI / 2],
    WEST: [-Math.PI / 2, 0, Math.PI / 2],
  }

  return (
    <group>
      {Object.entries(lanes).map(([lane, data]) => {
        const d = data.density_score || 0
        const color = d > 70 ? '#f87171' : d > 40 ? '#fbbf24' : '#60a5fa'
        const opacity = 0.05 + (d / 100) * 0.15
        return (
          <mesh key={lane} rotation={rotations[lane]} position={positions[lane]}>
            <planeGeometry args={[24, 50]} />
            <meshBasicMaterial color={color} transparent opacity={opacity} />
          </mesh>
        )
      })}
    </group>
  )
}

// ─── Sound Wave Rings (when siren detected) ──────────────────────────
function SirenWaveRings({ sirenDetected }) {
  const ringsRef = useRef([])

  useFrame(({ clock }) => {
    if (!sirenDetected) return
    ringsRef.current.forEach((ring, i) => {
      if (!ring) return
      const t = (clock.getElapsedTime() + i * 0.6) % 3
      const scale = 1 + t * 15
      ring.scale.set(scale, scale, 1)
      ring.material.opacity = Math.max(0, 0.3 - t * 0.1)
    })
  })

  if (!sirenDetected) return null

  return (
    <group position={[0, 1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      {[0, 1, 2, 3].map(i => (
        <mesh key={i} ref={el => ringsRef.current[i] = el}>
          <ringGeometry args={[0.8, 1, 64]} />
          <meshBasicMaterial color="#f87171" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Traffic Lights ──────────────────────────────────────────────────
function TrafficLights() {
  const signals = useJunctionStore(s => s.signals)
  const phases = signals.phases || {}

  const positions = [
    { lane: 'NORTH', pos: [6, 0, -16] },
    { lane: 'SOUTH', pos: [-6, 0, 16] },
    { lane: 'EAST',  pos: [16, 0, 6] },
    { lane: 'WEST',  pos: [-16, 0, -6] },
  ]

  return (
    <group>
      {positions.map(p => {
        const state = phases[p.lane]?.state || 'RED'
        const color = state === 'GREEN' ? '#34d399' : state === 'YELLOW' ? '#fbbf24' : '#f87171'
        return (
          <group key={p.lane} position={p.pos}>
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 8]} />
              <meshStandardMaterial color="#1a1a1a" />
            </mesh>
            <mesh position={[0, 8.5, 0]}>
              <boxGeometry args={[0.8, 2.4, 0.8]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            {/* Red/Yellow/Green indicator lights */}
            {['#f87171', '#fbbf24', '#34d399'].map((c, i) => (
              <mesh key={i} position={[0, 9.2 - i * 0.7, 0.45]}>
                <sphereGeometry args={[0.2, 12, 12]} />
                <meshStandardMaterial
                  color={c === color ? c : '#111'}
                  emissive={c === color ? c : '#000'}
                  emissiveIntensity={c === color ? 3 : 0}
                />
              </mesh>
            ))}
            <pointLight position={[0, 8.5, 1]} intensity={2} color={color} distance={20} decay={2} />
          </group>
        )
      })}
    </group>
  )
}

// ─── Vehicle ─────────────────────────────────────────────────────────
function Vehicle({ lane, index }) {
  const meshRef = useRef()
  const signals = useJunctionStore(s => s.signals)
  const laneData = useJunctionStore(s => s.lanes[lane])
  const signalState = signals.phases?.[lane]?.state || 'RED'
  const isEmergencyVehicle = laneData?.has_emergency && index === 0

  const speed = useRef(0)
  const progress = useRef(-10 - (index * 8))
  const vehicleColor = useMemo(() => {
    if (isEmergencyVehicle) return '#f87171'
    const colors = ['#94a3b8', '#64748b', '#78716c', '#a3a3a3', '#60a5fa']
    return colors[index % colors.length]
  }, [isEmergencyVehicle, index])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const isGreen = signalState === 'GREEN'
    const stopZone = progress.current > -20 && progress.current < -12
    const targetSpeed = isGreen || isEmergencyVehicle ? 14 : (stopZone ? 0 : 14)
    speed.current = THREE.MathUtils.lerp(speed.current, targetSpeed, delta * 3)
    progress.current += speed.current * delta

    if (progress.current > 120) progress.current = -80

    const p = progress.current
    const m = meshRef.current
    switch (lane) {
      case 'NORTH': m.position.set(-4, 0.7, p); m.rotation.set(0, 0, 0); break
      case 'SOUTH': m.position.set(4, 0.7, -p); m.rotation.set(0, Math.PI, 0); break
      case 'EAST':  m.position.set(-p, 0.7, -4); m.rotation.set(0, Math.PI / 2, 0); break
      case 'WEST':  m.position.set(p, 0.7, 4); m.rotation.set(0, -Math.PI / 2, 0); break
    }
  })

  return (
    <group ref={meshRef}>
      {/* Body */}
      <mesh castShadow>
        <boxGeometry args={isEmergencyVehicle ? [2.5, 1.6, 5] : [2, 1, 4]} />
        <meshStandardMaterial color={vehicleColor} roughness={0.4} metalness={0.5} />
      </mesh>
      {/* Cabin */}
      <mesh position={[0, 0.6, -0.3]}>
        <boxGeometry args={[1.6, 0.5, 1.8]} />
        <meshStandardMaterial color="#0a0a0a" roughness={0.1} metalness={0.9} transparent opacity={0.6} />
      </mesh>
      {/* Taillights */}
      <mesh position={[0, 0.2, -2.1]}>
        <boxGeometry args={[1.8, 0.25, 0.08]} />
        <meshStandardMaterial color="#ff2020" emissive="#ff2020" emissiveIntensity={0.8} />
      </mesh>
      {/* Emergency light bar */}
      {isEmergencyVehicle && (
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[1.5, 0.3, 0.5]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={4} />
        </mesh>
      )}
    </group>
  )
}

function VehicleSystem() {
  const lanes = useJunctionStore(s => s.lanes)
  return (
    <group>
      {Object.keys(lanes).map(lane => (
        <group key={lane}>
          {Array.from({ length: Math.min(Math.max(lanes[lane].vehicle_count, 3), 12) }).map((_, i) => (
            <Vehicle key={`${lane}-${i}`} lane={lane} index={i} />
          ))}
        </group>
      ))}
    </group>
  )
}

// ─── Floating Labels ─────────────────────────────────────────────────
function FloatingLabel({ lane, data, visible }) {
  if (!visible) return null
  const pos = {
    NORTH: [0, 14, -30],
    SOUTH: [0, 14, 30],
    EAST: [30, 14, 0],
    WEST: [-30, 14, 0]
  }[lane]

  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <group position={pos}>
        <mesh>
          <planeGeometry args={[10, 4.5]} />
          <meshBasicMaterial color="#050810" transparent opacity={0.85} />
        </mesh>
        <Text position={[0, 0.8, 0.1]} fontSize={0.9} color="#94a3b8" anchorX="center">
          {lane}
        </Text>
        <Text position={[0, -0.5, 0.1]} fontSize={0.7} color="#e2e8f0" anchorX="center">
          {data.vehicle_count} units · {Math.round(data.density_score)}%
        </Text>
      </group>
    </Float>
  )
}

// ─── Camera Presets ──────────────────────────────────────────────────
const CAMERA_VIEWS = {
  ORBIT:   { pos: [70, 55, 70], label: 'Orbit' },
  TOP:     { pos: [0, 120, 0.1], label: 'Top-Down' },
  ISO:     { pos: [80, 60, 80], label: 'Isometric' },
  STREET:  { pos: [5, 6, 50], label: 'Street' },
}

// ─── Main Export ──────────────────────────────────────────────────────
export default function JunctionView3D() {
  const lanes = useJunctionStore(s => s.lanes)
  const audio = useJunctionStore(s => s.audio)
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [cameraView, setCameraView] = useState('ORBIT')
  const controlsRef = useRef()

  const camPos = CAMERA_VIEWS[cameraView].pos

  return (
    <div className="w-full h-full relative">
      <Canvas
        shadows
        gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.8 }}
      >
        <PerspectiveCamera makeDefault position={camPos} fov={38} />
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.05}
          maxPolarAngle={Math.PI / 2.3}
          minDistance={15}
          maxDistance={200}
          autoRotate={cameraView === 'ORBIT'}
          autoRotateSpeed={0.3}
        />

        <color attach="background" args={['#020408']} />
        <fog attach="fog" args={['#020408', 60, 280]} />

        <ambientLight intensity={0.15} />
        <directionalLight position={[40, 80, 30]} intensity={2} castShadow shadow-mapSize={2048} color="#b0d0ff" />
        <hemisphereLight intensity={0.3} color="#0a1530" groundColor="#000" />
        <pointLight position={[0, 30, 0]} intensity={1} color="#00d4e0" distance={80} decay={2} />

        <Suspense fallback={null}>
          <CityEnvironment />
          <RoadSystem />
          <TrafficLights />
          <VehicleSystem />
          <HeatmapOverlay lanes={lanes} visible={showHeatmap} />
          <SirenWaveRings sirenDetected={audio?.siren_detected} />

          {Object.entries(lanes).map(([lane, data]) => (
            <FloatingLabel key={lane} lane={lane} data={data} visible={showLabels} />
          ))}

          <Stars radius={200} depth={80} count={2000} factor={3} saturation={0} fade speed={0.5} />
          <Environment preset="night" />
          <ContactShadows resolution={1024} scale={300} blur={3} opacity={0.15} far={15} />
        </Suspense>
      </Canvas>

      {/* Minimal HUD */}
      <div className="absolute top-5 left-5 flex items-center gap-2 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse-soft" />
        <span className="text-[9px] font-heading font-bold tracking-[0.2em] text-cyan/60">LIVE 3D FEED</span>
      </div>

      {/* View + Toggle controls */}
      <div className="absolute bottom-5 left-5 flex gap-2 z-50">
        {Object.entries(CAMERA_VIEWS).map(([key, v]) => (
          <button
            key={key}
            onClick={() => setCameraView(key)}
            className={`px-3 py-1.5 rounded-lg text-[8px] font-heading font-bold tracking-wider uppercase transition-all border ${
              cameraView === key
                ? 'border-cyan/30 bg-cyan/8 text-cyan'
                : 'border-white/5 bg-black/60 text-muted hover:text-white/70'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="absolute bottom-5 right-5 flex gap-2 z-50">
        <button
          onClick={() => setShowHeatmap(!showHeatmap)}
          className={`px-3 py-1.5 rounded-lg text-[8px] font-heading font-bold tracking-wider uppercase transition-all border ${
            showHeatmap ? 'border-cyan/30 bg-cyan/8 text-cyan' : 'border-white/5 bg-black/60 text-muted'
          }`}
        >
          Heatmap
        </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
          className={`px-3 py-1.5 rounded-lg text-[8px] font-heading font-bold tracking-wider uppercase transition-all border ${
            showLabels ? 'border-cyan/30 bg-cyan/8 text-cyan' : 'border-white/5 bg-black/60 text-muted'
          }`}
        >
          Labels
        </button>
      </div>
    </div>
  )
}
