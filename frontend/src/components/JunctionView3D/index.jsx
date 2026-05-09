import React, { useRef, useMemo, useState, useCallback, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useJunctionStore } from '../../store/junctionStore'

const LANE_COLORS = {
  NORTH: '#00F5FF', EAST: '#00FF88', SOUTH: '#FFB800', WEST: '#A855F7'
}
const LANE_DIRS  = { NORTH: [0,1], EAST:[1,0], SOUTH:[0,-1], WEST:[-1,0] }
const SIG_COLORS = { GREEN:'#00FF88', YELLOW:'#FFB800', RED:'#FF4444' }
const LANE_SPAWN = {
  NORTH: { axis:'z', entry: 11, exit:-11, lateral:[[-1.5],[1.5]] },
  SOUTH: { axis:'z', entry:-11, exit: 11, lateral:[[-1.5],[1.5]] },
  EAST:  { axis:'x', entry: 11, exit:-11, lateral:[[-1.5],[1.5]] },
  WEST:  { axis:'x', entry:-11, exit: 11, lateral:[[-1.5],[1.5]] },
}

// ── Road geometry with texture ────────────────────────────────────────────────
function Road() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024; c.height = 1024
    const ctx = c.getContext('2d')
    // Asphalt
    ctx.fillStyle = '#141b2d'
    ctx.fillRect(0,0,1024,1024)
    // Lane centre lines
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 4
    ctx.setLineDash([60,40])
    ctx.beginPath(); ctx.moveTo(512,0); ctx.lineTo(512,1024); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0,512); ctx.lineTo(1024,512); ctx.stroke()
    ctx.setLineDash([])
    // Edge lines
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 6
    ;[[260,0,260,380],[760,0,760,380],[260,644,260,1024],[760,644,760,1024],
      [0,260,380,260],[644,260,1024,260],[0,760,380,760],[644,760,1024,760]].forEach(([x1,y1,x2,y2])=>{
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke()
    })
    // Zebra crossings
    ctx.fillStyle = 'rgba(255,255,255,0.72)'
    for(let i=0;i<7;i++){
      ctx.fillRect(280+i*26,180,14,70)
      ctx.fillRect(280+i*26,774,14,70)
      ctx.fillRect(180,280+i*26,70,14)
      ctx.fillRect(774,280+i*26,70,14)
    }
    // Glow centre cross
    const grad = ctx.createRadialGradient(512,512,10,512,512,180)
    grad.addColorStop(0,'rgba(0,245,255,0.12)')
    grad.addColorStop(1,'rgba(0,245,255,0)')
    ctx.fillStyle = grad
    ctx.fillRect(0,0,1024,1024)
    const t = new THREE.CanvasTexture(c)
    return t
  }, [])

  return (
    <mesh rotation={[-Math.PI/2,0,0]} receiveShadow position={[0,0,0]}>
      <planeGeometry args={[26,26]} />
      <meshStandardMaterial map={tex} roughness={0.85} metalness={0.1}/>
    </mesh>
  )
}

// ── Congestion heatmap (only visible at higher densities) ─────────────────────
function HeatmapOverlay() {
  const lanes  = useJunctionStore(s=>s.lanes)
  const ref    = useRef()
  useFrame(()=>{
    if(!ref.current) return
    const avg = Object.values(lanes).reduce((a,l)=>a+l.density_score,0)/4
    const t   = avg/100
    const col = new THREE.Color()
    if(t < 0.5) col.lerpColors(new THREE.Color('#003388'), new THREE.Color('#886600'), t*2)
    else        col.lerpColors(new THREE.Color('#886600'), new THREE.Color('#881100'), (t-0.5)*2)
    ref.current.material.color = col
    ref.current.material.opacity = Math.max(0, t*0.22 - 0.01)
  })
  return (
    <mesh ref={ref} rotation={[-Math.PI/2,0,0]} position={[0,0.04,0]}>
      <planeGeometry args={[26,26]}/>
      <meshBasicMaterial transparent side={THREE.DoubleSide}/>
    </mesh>
  )
}

// ── Traffic light at corner ───────────────────────────────────────────────────
function TrafficLight({ pos, lane }) {
  const phase = useJunctionStore(s=>s.signals.phases?.[lane]) || {}
  const state = phase.state || 'RED'
  return (
    <group position={pos}>
      <mesh position={[0,1.5,0]}>
        <cylinderGeometry args={[0.07,0.07,3,8]}/>
        <meshStandardMaterial color="#1c2230" metalness={0.9} roughness={0.2}/>
      </mesh>
      <mesh position={[0,3.2,0]}>
        <boxGeometry args={[0.38,1.0,0.38]}/>
        <meshStandardMaterial color="#0a0f1a" metalness={0.5}/>
      </mesh>
      {[['RED',3.55],['YELLOW',3.2],['GREEN',2.85]].map(([s,y])=>(
        <mesh key={s} position={[0,y,0.2]}>
          <sphereGeometry args={[0.11,12,12]}/>
          <meshStandardMaterial
            color={state===s ? SIG_COLORS[s] : '#0d1220'}
            emissive={state===s ? SIG_COLORS[s] : '#000'}
            emissiveIntensity={state===s ? 4 : 0}
          />
        </mesh>
      ))}
      {state!=='RED' && (
        <pointLight position={[0,3.2,0.6]} color={SIG_COLORS[state]} intensity={3} distance={6}/>
      )}
    </group>
  )
}

// ── Single animated vehicle ───────────────────────────────────────────────────
function AnimVehicle({ lane, idx, total, isEmg, isTruck }) {
  const ref  = useRef()
  const color = isEmg ? '#FF4444' : LANE_COLORS[lane]
  const sp = LANE_SPAWN[lane]
  const lateral = (idx%2===0 ? 1.8 : -1.8) * (lane==='NORTH'||lane==='SOUTH'?1:-1)
  const spread  = 18 / Math.max(total,1)
  const baseOffset = -9 + (idx+0.5)*spread
  const speed  = isEmg ? 3.5 : 1.2 + Math.random()*1.2
  const len    = 22

  useFrame((_,dt)=>{
    if(!ref.current) return
    if(sp.axis==='z') {
      ref.current.position.z -= (sp.entry>0?1:-1)*speed*dt
      if(sp.entry>0 && ref.current.position.z < sp.exit) ref.current.position.z = sp.entry
      if(sp.entry<0 && ref.current.position.z > sp.exit) ref.current.position.z = sp.entry
    } else {
      ref.current.position.x -= (sp.entry>0?1:-1)*speed*dt
      if(sp.entry>0 && ref.current.position.x < sp.exit) ref.current.position.x = sp.entry
      if(sp.entry<0 && ref.current.position.x > sp.exit) ref.current.position.x = sp.entry
    }
    if(isEmg) {
      const t = Date.now()*0.005
      ref.current.material.emissiveIntensity = 1.5+Math.sin(t)*0.8
    }
  })

  const initPos = sp.axis==='z'
    ? [lateral, 0.22, sp.entry - (idx/(total||1))*len*(sp.entry>0?1:-1)]
    : [sp.entry - (idx/(total||1))*len*(sp.entry>0?1:-1), 0.22, lateral]

  const rot = sp.axis==='z' ? [0,0,0] : [0,Math.PI/2,0]
  const geom = isTruck ? [0.75,0.42,2.4] : isEmg ? [0.80,0.38,2.0] : [0.65,0.28,1.5]

  return (
    <mesh ref={ref} position={initPos} rotation={rot} castShadow>
      <boxGeometry args={geom}/>
      <meshStandardMaterial
        color={color} emissive={color}
        emissiveIntensity={isEmg?2.0:0.35} roughness={0.4} metalness={0.6}
      />
    </mesh>
  )
}

function LaneVehicles({ lane }) {
  const d = useJunctionStore(s=>s.lanes[lane]) || {}
  const count = Math.min(d.vehicle_count||0, 10)
  const trucks = d.vehicle_types?.truck||0
  const hasEmg = d.has_emergency||false
  return (
    <group>
      {hasEmg && <AnimVehicle key="emg" lane={lane} idx={0} total={Math.max(count,1)} isEmg isTruck={false}/>}
      {Array.from({length:count},(_,i)=>(
        <AnimVehicle key={i} lane={lane} idx={hasEmg?i+1:i} total={count+1} isEmg={false} isTruck={i<trucks}/>
      ))}
    </group>
  )
}

// ── Sound wave rings ──────────────────────────────────────────────────────────
function SoundWaves() {
  const audio = useJunctionStore(s=>s.audio)
  const rings = useRef([])
  useFrame(({clock})=>{
    rings.current.forEach((r,i)=>{
      if(!r) return
      const t = (clock.elapsedTime*0.65+i*0.35)%1
      r.scale.set(1+t*4,1,1+t*4)
      r.material.opacity = audio.siren_detected?(1-t)*0.7:0
    })
  })
  return (
    <group position={[0,0.15,0]} rotation={[-Math.PI/2,0,0]}>
      {[0,1,2].map(i=>(
        <mesh key={i} ref={el=>rings.current[i]=el}>
          <ringGeometry args={[2,2.25,48]}/>
          <meshBasicMaterial color="#FF4444" transparent side={THREE.DoubleSide}/>
        </mesh>
      ))}
    </group>
  )
}

// ── City skyline ──────────────────────────────────────────────────────────────
function CityBuildings() {
  const buildings = useMemo(()=>{
    const pts = [
      [-20,-20],[-16,-20],[-12,-20],[-8,-22],[-20,-16],[-20,-12],[-22,-8],
      [20,-20],[16,-20],[12,-20],[8,-22],[20,-16],[20,-12],[22,-8],
      [-20,20],[-16,20],[-12,20],[-8,22],[-20,16],[-20,12],[-22,8],
      [20,20],[16,20],[12,20],[8,22],[20,16],[20,12],[22,8],
    ]
    return pts.map(([x,z],i)=>{
      const h=3+Math.abs(Math.sin(i*2.3))*9
      return { x,z,h,w:1.8+Math.abs(Math.sin(i))*1.2,d:1.8+Math.abs(Math.cos(i))*1.2,key:i }
    })
  },[])
  return (
    <group>
      {buildings.map(b=>(
        <group key={b.key} position={[b.x,0,b.z]}>
          <mesh position={[0,b.h/2,0]} castShadow>
            <boxGeometry args={[b.w,b.h,b.d]}/>
            <meshStandardMaterial color="#0c1220" emissive="#1a2a40" emissiveIntensity={0.4} roughness={0.9}/>
          </mesh>
          {/* Window lights */}
          {Array.from({length:Math.floor(b.h/2)},(_,j)=>(
            <mesh key={j} position={[0,1.5+j*2,b.d/2+0.01]}>
              <planeGeometry args={[b.w*0.6,0.4]}/>
              <meshBasicMaterial color={j%3===0?'#FFB800':j%3===1?'#00F5FF':'#ffffff'} transparent opacity={0.3}/>
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// ── Lane label ────────────────────────────────────────────────────────────────
function LaneLabel({ lane }) {
  const [dx,dz] = LANE_DIRS[lane]
  return (
    <Text position={[dx*12,0.6,dz*12]} rotation={[-Math.PI/2,0,0]}
      fontSize={0.8} color={LANE_COLORS[lane]} anchorX="center" anchorY="middle"
      outlineWidth={0.04} outlineColor="#000">
      {lane}
    </Text>
  )
}

// ── Ground grid ───────────────────────────────────────────────────────────────
function GroundGrid() {
  const ref = useRef()
  return (
    <gridHelper ref={ref} args={[60,40,'#001a2a','#001a2a']} position={[0,-0.01,0]}/>
  )
}

// ── Camera views ──────────────────────────────────────────────────────────────
const VIEWS = {
  TOP:    { pos:[0,28,0.01],   target:[0,0,0] },
  ISO:    { pos:[0,22,18],     target:[0,0,0] },
  STREET: { pos:[0,3,16],      target:[0,1,0] },
}

function CameraController({ view, controlsRef }) {
  useFrame(({ camera }) => {
    const v = VIEWS[view]
    camera.position.lerp(new THREE.Vector3(...v.pos), 0.05)
    if(controlsRef.current) controlsRef.current.target.lerp(new THREE.Vector3(...v.target), 0.05)
  })
  return null
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function JunctionView3D() {
  const [view, setView] = useState('ISO')
  const controlsRef = useRef()

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <Canvas shadows={{ type: THREE.PCFShadowMap }} camera={{ position:[0,22,18], fov:44 }} style={{ background:'#050810' }}>
        {/* Lighting */}
        <ambientLight intensity={0.12}/>
        <directionalLight position={[15,25,10]} intensity={0.5} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024}/>
        <pointLight position={[0,10,0]} color="#00F5FF" intensity={0.8} distance={25}/>
        <pointLight position={[0,6,0]} color="#A855F7" intensity={0.15} distance={15}/>

        <Suspense fallback={null}>
          <CityBuildings/>
          <GroundGrid/>
          <Road/>
          <HeatmapOverlay/>

          {/* Traffic lights */}
          <TrafficLight pos={[ 6.5,0, 6.5]} lane="NORTH"/>
          <TrafficLight pos={[-6.5,0, 6.5]} lane="EAST"/>
          <TrafficLight pos={[ 6.5,0,-6.5]} lane="SOUTH"/>
          <TrafficLight pos={[-6.5,0,-6.5]} lane="WEST"/>

          {/* Vehicles */}
          {['NORTH','EAST','SOUTH','WEST'].map(l=><LaneVehicles key={l} lane={l}/>)}

          {/* Lane labels */}
          {['NORTH','EAST','SOUTH','WEST'].map(l=><LaneLabel key={l} lane={l}/>)}

          {/* Sound waves */}
          <SoundWaves/>

          <EffectComposer>
            <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.85} intensity={1.4} radius={0.9}/>
          </EffectComposer>
        </Suspense>

        <CameraController view={view} controlsRef={controlsRef}/>
        <OrbitControls ref={controlsRef} enablePan={false} maxPolarAngle={Math.PI/2.1} minDistance={6} maxDistance={45}/>
      </Canvas>

      {/* View controls overlay */}
      <div style={{ position:'absolute', bottom:12, left:12, display:'flex', gap:6, zIndex:10 }}>
        {Object.keys(VIEWS).map(v=>(
          <button key={v} onClick={()=>setView(v)}
            style={{
              fontSize:10, padding:'4px 10px', borderRadius:8, cursor:'pointer',
              background: view===v ? 'rgba(0,245,255,0.15)' : 'rgba(10,14,26,0.85)',
              border:`1px solid ${view===v?'rgba(0,245,255,0.5)':'rgba(255,255,255,0.1)'}`,
              color: view===v ? '#00F5FF' : '#4A6080',
              backdropFilter:'blur(8px)', transition:'all 0.2s',
            }}>
            {v==='TOP'?'⊙ TOP':v==='ISO'?'◎ ISO':'👁 STREET'}
          </button>
        ))}
      </div>

      {/* Mode badge */}
      <div style={{ position:'absolute', top:12, right:12, zIndex:10 }}>
        <div style={{
          fontSize:10, padding:'4px 10px', borderRadius:8, fontFamily:'JetBrains Mono',
          background:'rgba(10,14,26,0.85)', border:'1px solid rgba(0,245,255,0.3)',
          color:'#00F5FF', backdropFilter:'blur(8px)', letterSpacing:'0.1em',
        }}>3D LIVE</div>
      </div>
    </div>
  )
}
