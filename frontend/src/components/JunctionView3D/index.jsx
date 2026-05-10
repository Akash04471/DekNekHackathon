import React, { Suspense, useMemo, useState, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Stars, Float, Text, ContactShadows } from '@react-three/drei'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useJunctionStore } from '../../store/junctionStore'

// ─── Road System ──────────────────────────────────────────────────
function RoadSystem() {
  const dashes = useMemo(() => {
    const d = []
    for (let i = -180; i < 180; i += 12) d.push(i)
    return d
  }, [])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[400, 28]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[0, 0.01, 0]} receiveShadow>
        <planeGeometry args={[400, 28]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>

      {dashes.map((x, i) => Math.abs(x) > 16 && (
        <mesh key={`ew-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.06, 0]}>
          <planeGeometry args={[6, 0.2]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
        </mesh>
      ))}
      
      {dashes.map((z, i) => Math.abs(z) > 16 && (
        <mesh key={`ns-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, z]}>
          <planeGeometry args={[0.2, 6]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.4} />
        </mesh>
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
    </group>
  )
}

// ─── Procedural City ──────────────────────────────────────────────
function CityEnvironment({ emergency }) {
  const buildings = useMemo(() => {
    const b = []
    for (let i = 0; i < 100; i++) {
      const x = (Math.random() - 0.5) * 300
      const z = (Math.random() - 0.5) * 300
      if (Math.abs(x) < 28 || Math.abs(z) < 28) continue
      const h = 20 + Math.random() * 100
      const windows = []
      // Add random window lights
      const floorCount = Math.floor(h / 4)
      for(let f = 1; f < floorCount; f++) {
        if (Math.random() > 0.6) {
          windows.push({ f, side: Math.floor(Math.random() * 4) })
        }
      }
      b.push({ id: i, pos: [x, h / 2, z], w: 10 + Math.random() * 12, h, d: 10 + Math.random() * 12, windows })
    }
    return b
  }, [])

  return (
    <group>
      {buildings.map(b => (
        <group key={b.id} position={b.pos}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshStandardMaterial color="#0a1229" roughness={0.15} metalness={0.8} />
          </mesh>
          {/* Windows */}
          {b.windows.map((w, i) => (
            <mesh key={i} position={[
              w.side === 0 ? b.w/2 + 0.1 : w.side === 1 ? -b.w/2 - 0.1 : 0,
              w.f * 4 - b.h/2,
              w.side === 2 ? b.d/2 + 0.1 : w.side === 3 ? -b.d/2 - 0.1 : 0
            ]}>
              <planeGeometry args={[1.5, 1.2]} />
              <meshStandardMaterial 
                emissive={Math.random() > 0.5 ? "#00F5FF" : "#FBBF24"} 
                emissiveIntensity={4} 
                transparent 
                opacity={0.8} 
              />
            </mesh>
          ))}
        </group>
      ))}
      <gridHelper args={[600, 100, '#1e293b', '#0f172a']} position={[0, 0.02, 0]} />
    </group>
  )
}

// ─── Traffic Lights ───────────────────────────────────────────────
function TrafficLights({ emergency, activeLane }) {
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
        const color = state === 'GREEN' ? '#10b981' : state === 'YELLOW' ? '#f59e0b' : '#ef4444'
        return (
          <group key={p.lane} position={p.pos}>
            <mesh position={[0, 4, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 8]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            <mesh position={[0, 8.5, 0]}>
              <boxGeometry args={[0.8, 2.4, 0.8]} />
              <meshStandardMaterial color="#111" />
            </mesh>
            {['#ef4444', '#f59e0b', '#10b981'].map((c, i) => (
              <mesh key={i} position={[0, 9.2 - i * 0.7, 0.45]}>
                <sphereGeometry args={[0.25, 16, 16]} />
                <meshStandardMaterial
                  color={c === color ? c : '#111'}
                  emissive={c === color ? c : '#000'}
                  emissiveIntensity={c === color ? 2 : 0}
                />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

// ─── Vehicle ──────────────────────────────────────────────────────
function Vehicle({ lane, index }) {
  const meshRef = useRef()
  const signals = useJunctionStore(s => s.signals)
  const laneData = useJunctionStore(s => s.lanes[lane])
  const signalState = signals.phases?.[lane]?.state || 'RED'
  const isEmergency = laneData?.has_emergency && index === 0

  const speed = useRef(0)
  const progress = useRef(-10 - (index * 8))
  
  const vehicleColor = useMemo(() => {
    if (isEmergency) return '#ef4444'
    const colors = ['#3b82f6', '#64748b', '#94a3b8', '#1e293b', '#475569']
    return colors[index % colors.length]
  }, [isEmergency, index])

  const speedMultiplier = useJunctionStore(s => s.speedMultiplier)

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const scaledDelta = delta * speedMultiplier
    const targetSpeed = signalState === 'GREEN' || isEmergency ? 15 : (progress.current > -18 && progress.current < -12 ? 0 : 15)
    speed.current = THREE.MathUtils.lerp(speed.current, targetSpeed, scaledDelta * 4)
    progress.current += speed.current * scaledDelta
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
      <mesh castShadow receiveShadow>
        <boxGeometry args={isEmergency ? [2.5, 1.6, 5] : [2, 1, 4]} />
        <meshStandardMaterial color={vehicleColor} roughness={0.1} metalness={0.9} />
      </mesh>
      {/* Headlights */}
      <group position={[0, 0, isEmergency ? 2.6 : 2.1]}>
        <mesh position={[-0.6, -0.1, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={4} />
        </mesh>
        <mesh position={[0.6, -0.1, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={4} />
        </mesh>
      </group>
      <mesh position={[0, 0.6, -0.3]}>
        <boxGeometry args={[1.6, 0.5, 1.8]} />
        <meshStandardMaterial color="#000" transparent opacity={0.8} />
      </mesh>
      {isEmergency && (
        <mesh position={[0, 1.3, 0]}>
          <boxGeometry args={[1.5, 0.3, 0.5]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={10} />
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
          {Array.from({ length: Math.min(Math.max(lanes[lane].vehicle_count, 12), 40) }).map((_, i) => (
            <Vehicle key={`${lane}-${i}`} lane={lane} index={i} />
          ))}
        </group>
      ))}
    </group>
  )
}

// ─── Floating Labels ──────────────────────────────────────────────
function FloatingLabel({ lane, data }) {
  const pos = { NORTH: [0, 14, -30], SOUTH: [0, 14, 30], EAST: [30, 14, 0], WEST: [-30, 14, 0] }[lane]
  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <group position={pos}>
        <Text position={[0, 0.8, 0]} fontSize={1} color="#00d4e0" anchorX="center">
          {lane}
        </Text>
        <Text position={[0, -0.5, 0]} fontSize={0.7} color="#94a3b8" anchorX="center">
          {data.vehicle_count} units · {Math.round(data.density_score)}%
        </Text>
      </group>
    </Float>
  )
}

// ─── Cinematic Camera ──────────────────────────────────────────────
const CAMERA_PRESETS = [
  { pos: [0, 100, 100], target: [0, 0, 0], fov: 30 },
  { pos: [80, 20, 80], target: [0, 0, 0], fov: 40 },
  { pos: [-100, 40, 0], target: [0, 0, 0], fov: 35 },
  { pos: [0, 150, 0], target: [0, 0, 0], fov: 25 },
]

function CinematicCamera({ active }) {
  const { camera } = useFrame((state, delta) => {
    if (!active) return
    // Custom camera logic could go here, but OrbitControls handles much of it
  })
  return null
}

// ─── Main View ────────────────────────────────────────────────────
export default function JunctionView3D() {
  const lanes = useJunctionStore(s => s.lanes)
  const signals = useJunctionStore(s => s.signals)
  const [isCinematic, setIsCinematic] = useState(false)
  const [presetIdx, setPresetIdx] = useState(0)
  const controlsRef = useRef()

  useEffect(() => {
    if (!isCinematic) return
    const timer = setInterval(() => {
      setPresetIdx(prev => (prev + 1) % CAMERA_PRESETS.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [isCinematic])

  useEffect(() => {
    if (isCinematic && controlsRef.current) {
      const p = CAMERA_PRESETS[presetIdx]
      const { camera } = controlsRef.current
      if (camera) {
        camera.position.set(...p.pos)
        camera.lookAt(...p.target)
        camera.fov = p.fov
        camera.updateProjectionMatrix()
      }
      controlsRef.current.target.set(...p.target)
      controlsRef.current.update()
    }
  }, [presetIdx, isCinematic])

  return (
    <div className={`w-full h-full relative bg-[#030712] ${isCinematic ? 'cinematic-active' : ''}`}>
      {/* Letterbox Bars */}
      <div className="cinematic-bars-top" />
      <div className="cinematic-bars-bottom" />
      <Canvas shadows camera={{ position: [120, 100, 120], fov: 30 }}>
        <color attach="background" args={['#030712']} />
        <fog attach="fog" args={['#030712', 150, 500]} />
        
        <ambientLight intensity={0.4} />
        <hemisphereLight intensity={1.2} color="#00d4e0" groundColor="#000" />
        
        <directionalLight 
          position={[50, 100, 50]} 
          intensity={2.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-150}
          shadow-camera-right={150}
          shadow-camera-top={150}
          shadow-camera-bottom={-150}
        />

        <Suspense fallback={null}>
          <Environment preset="city" />
        </Suspense>

        <CityEnvironment emergency={signals.mode === 'EMERGENCY'} />
        <RoadSystem />
        <TrafficLights emergency={signals.mode === 'EMERGENCY'} />
        <VehicleSystem />
        
        <OrbitControls 
          ref={controlsRef}
          enableDamping 
          dampingFactor={0.05} 
          maxPolarAngle={Math.PI / 2.2} 
          minDistance={30} 
          maxDistance={400}
          autoRotate={isCinematic}
          autoRotateSpeed={isCinematic ? 1.5 : 0.4}
        />
        
        {isCinematic && (
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        )}
        
        {Object.entries(lanes || {}).map(([lane, data]) => (
          <FloatingLabel key={lane} lane={lane} data={data} />
        ))}
        
        <ContactShadows resolution={1024} scale={300} blur={2.5} opacity={0.3} far={20} />

        {isCinematic && (
          <EffectComposer disableNormalPass>
            <Bloom luminanceThreshold={0.3} luminanceSmoothing={0.9} intensity={1.5} />
            <ChromaticAberration offset={[0.0015, 0.0015]} />
          </EffectComposer>
        )}
      </Canvas>

      <div className="absolute top-5 left-5 flex items-center gap-2 pointer-events-none">
        <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
        <span className="text-[9px] font-heading font-bold tracking-[0.2em] text-cyan/60 uppercase">Nexus Junction OS · Live Feed</span>
      </div>

      <div className="absolute bottom-28 right-8 flex gap-3 z-[1100]">
        {!isCinematic && (
          <>
            <button 
              onClick={() => {
                const c = controlsRef.current
                if (c && c.object) {
                  c.object.position.set(120, 100, 120)
                  c.target.set(0, 0, 0)
                  c.update()
                }
              }}
              className="px-4 py-2 rounded-xl text-[10px] font-heading font-bold bg-black/60 text-cyan border border-cyan/20 hover:border-cyan/40 backdrop-blur-md transition-all"
            >
              ISOMETRIC
            </button>
            <button 
              onClick={() => {
                const c = controlsRef.current
                if (c && c.object) {
                  c.object.position.set(35, 5, 35)
                  c.target.set(0, 2, 0)
                  c.update()
                }
              }}
              className="px-4 py-2 rounded-xl text-[10px] font-heading font-bold bg-black/60 text-cyan border border-cyan/20 hover:border-cyan/40 backdrop-blur-md transition-all"
            >
              STREET
            </button>
          </>
        )}
        
        <button 
          onClick={() => setIsCinematic(!isCinematic)}
          className={`px-5 py-2.5 rounded-xl text-[10px] font-heading font-bold tracking-[0.2em] transition-all border shadow-lg ${
            isCinematic 
            ? 'bg-red text-white border-red animate-pulse' 
            : 'bg-cyan text-black border-cyan hover:bg-cyan-bright'
          }`}
        >
          {isCinematic ? 'EXIT CINEMATIC' : 'ENTER CINEMATIC'}
        </button>
      </div>
    </div>
  )
}
