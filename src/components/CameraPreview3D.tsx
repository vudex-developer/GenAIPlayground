import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Line } from '@react-three/drei'
import * as THREE from 'three'

interface CameraPreview3DProps {
  rotation: number    // -90 ~ 90 degrees
  tilt: number       // -45 ~ 45 degrees
  distance: number   // 0.5 ~ 2.0
  // Keyframe animation
  enableKeyframes?: boolean
  startRotation?: number
  startTilt?: number
  startDistance?: number
  endRotation?: number
  endTilt?: number
  endDistance?: number
  // Callbacks for interactive control
  onStartFrameChange?: (rotation: number, tilt: number, distance: number) => void
  onEndFrameChange?: (rotation: number, tilt: number, distance: number) => void
  // Single frame mode callbacks
  onRotationChange?: (rotation: number) => void
  onTiltChange?: (tilt: number) => void
  onDistanceChange?: (distance: number) => void
}

// Wireframe Sphere - 구형 와이어프레임 배경
function WireframeSphere({ radius = 3.5, opacity = 0.15 }: { radius?: number; opacity?: number }) {
  const latitudeLines: THREE.Vector3[][] = []
  const longitudeLines: THREE.Vector3[][] = []
  
  const segments = 32
  const latitudes = 12  // 위도 라인 개수
  const longitudes = 24 // 경도 라인 개수
  
  // Latitude lines (수평 원들)
  for (let i = 1; i < latitudes; i++) {
    const phi = (Math.PI * i) / latitudes
    const points: THREE.Vector3[] = []
    
    for (let j = 0; j <= segments; j++) {
      const theta = (2 * Math.PI * j) / segments
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.cos(phi)
      const z = radius * Math.sin(phi) * Math.sin(theta)
      points.push(new THREE.Vector3(x, y, z))
    }
    latitudeLines.push(points)
  }
  
  // Longitude lines (세로 원들)
  for (let i = 0; i < longitudes; i++) {
    const theta = (2 * Math.PI * i) / longitudes
    const points: THREE.Vector3[] = []
    
    for (let j = 0; j <= segments; j++) {
      const phi = (Math.PI * j) / segments
      const x = radius * Math.sin(phi) * Math.cos(theta)
      const y = radius * Math.cos(phi)
      const z = radius * Math.sin(phi) * Math.sin(theta)
      points.push(new THREE.Vector3(x, y, z))
    }
    longitudeLines.push(points)
  }
  
  return (
    <group>
      {/* Latitude lines */}
      {latitudeLines.map((points, i) => (
        <Line 
          key={`lat-${i}`} 
          points={points} 
          color="#94a3b8" 
          lineWidth={1} 
          opacity={opacity} 
          transparent 
        />
      ))}
      
      {/* Longitude lines */}
      {longitudeLines.map((points, i) => (
        <Line 
          key={`long-${i}`} 
          points={points} 
          color="#94a3b8" 
          lineWidth={1} 
          opacity={opacity} 
          transparent 
        />
      ))}
    </group>
  )
}

// Target object (simple point)
// 피사체 기준: 0° 카메라 = +Z 방향(정면)
function Target() {
  return (
    <mesh position={[0, 0, 0]}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial 
        color="#6366f1" 
        emissive="#6366f1"
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

// Helper function to calculate camera position
function calculateCameraPosition(rotation: number, tilt: number, distance: number) {
  // Safety checks
  if (typeof rotation !== 'number' || isNaN(rotation)) rotation = 0
  if (typeof tilt !== 'number' || isNaN(tilt)) tilt = 0
  if (typeof distance !== 'number' || isNaN(distance) || distance <= 0) distance = 1.0
  
  // 360도 시스템: 0°=정면(+Z), 90°=오른쪽(+X), 180°=뒤(-Z), 270°=왼쪽(-X)
  const rotationRad = (rotation * Math.PI) / 180
  const tiltRad = (tilt * Math.PI) / 180
  const radius = distance * 3 // Scale for visualization
  
  // 구면 좌표계: 0° = +Z (정면), 90° = +X (오른쪽)
  const x = radius * Math.sin(rotationRad) * Math.cos(tiltRad)
  const y = radius * Math.sin(tiltRad)
  const z = radius * Math.cos(rotationRad) * Math.cos(tiltRad)
  
  // Final NaN check
  if (isNaN(x) || isNaN(y) || isNaN(z)) {
    return new THREE.Vector3(0, 0, 3)
  }
  
  return new THREE.Vector3(x, y, z)
}

// Generate FIXED rail path for Rotation (360도 원형 경로)
// This rail is always at the same position, independent of tilt/distance
function generateRotationRail(fixedDistance = 3, segments = 100): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  
  if (!fixedDistance || fixedDistance <= 0) fixedDistance = 3
  if (!segments || segments <= 0) segments = 100
  
  for (let i = 0; i <= segments; i++) {
    const angle = (360 * i) / segments // 0 to 360 degrees
    const angleRad = (angle * Math.PI) / 180
    const x = fixedDistance * Math.sin(angleRad)
    const y = 0 // Always at eye level
    const z = fixedDistance * Math.cos(angleRad)
    
    // Safety check for NaN
    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
      points.push(new THREE.Vector3(x, y, z))
    }
  }
  
  return points
}

// Generate FIXED rail path for Tilt (vertical arc at origin)
// This rail is always at the same position, independent of rotation/distance
function generateTiltRail(fixedDistance = 3, segments = 50): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  
  if (!fixedDistance || fixedDistance <= 0) fixedDistance = 3
  if (!segments || segments <= 0) segments = 50
  
  for (let i = 0; i <= segments; i++) {
    const tiltAngle = (-45 + (90 * i) / segments) * (Math.PI / 180) // -45 to 45 degrees
    const x = 0 // Always facing forward
    const y = fixedDistance * Math.sin(tiltAngle)
    const z = fixedDistance * Math.cos(tiltAngle)
    
    // Safety check for NaN
    if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
      points.push(new THREE.Vector3(x, y, z))
    }
  }
  
  return points
}

// Distance is not a rail - it's a line from target to camera position
// No fixed rail needed - the point moves along the camera ray

// Helper function to convert 3D position back to rotation/tilt/distance
function positionToAngles(position: THREE.Vector3): { rotation: number; tilt: number; distance: number } {
  // Safety check
  if (!position || position.x === undefined || position.y === undefined || position.z === undefined) {
    return { rotation: 0, tilt: 0, distance: 1.0 }
  }
  
  const radius = position.length()
  
  // Safety check for zero radius
  if (radius === 0) {
    return { rotation: 0, tilt: 0, distance: 1.0 }
  }
  
  const distance = radius / 3 // Unscale
  
  // Calculate tilt (vertical angle)
  const tiltRad = Math.asin(Math.max(-1, Math.min(1, position.y / radius)))
  const tilt = (tiltRad * 180) / Math.PI
  
  // Calculate rotation (horizontal angle) in 360도 시스템
  const rotationRad = Math.atan2(position.x, position.z)
  let rotation = (rotationRad * 180) / Math.PI
  
  // Convert from -180~180 to 0~360
  if (rotation < 0) {
    rotation += 360
  }
  
  // Clamp and round to 2 decimal places
  return {
    rotation: Math.round(Math.max(0, Math.min(360, rotation)) * 100) / 100,
    tilt: Math.round(Math.max(-45, Math.min(45, tilt)) * 100) / 100,
    distance: Math.round(Math.max(0.5, Math.min(2.0, distance)) * 100) / 100
  }
}

// Camera position indicator
function CameraIndicator({ rotation, tilt, distance, enableKeyframes, startRotation, startTilt, startDistance, endRotation, endTilt, endDistance }: CameraPreview3DProps) {
  const cameraRef = useRef<THREE.Group>(null)
  const [animProgress, setAnimProgress] = useState(0)
  
  // Animation loop
  useFrame((state) => {
    if (enableKeyframes) {
      // Oscillate between 0 and 1
      const progress = (Math.sin(state.clock.elapsedTime) + 1) / 2
      setAnimProgress(progress)
    }
  })
  
  // Calculate position based on keyframe mode
  let position: THREE.Vector3
  
  if (enableKeyframes && startRotation !== undefined && endRotation !== undefined) {
    const startPos = calculateCameraPosition(startRotation, startTilt || 0, startDistance || 1.0)
    const endPos = calculateCameraPosition(endRotation, endTilt || 0, endDistance || 1.0)
    position = startPos.lerp(endPos, animProgress)
  } else {
    position = calculateCameraPosition(rotation, tilt, distance)
  }
  
  return (
    <group ref={cameraRef} position={[position.x, position.y, position.z]}>
      {/* Camera body */}
      <mesh>
        <boxGeometry args={[0.3, 0.2, 0.4]} />
        <meshStandardMaterial color="#fde047" />
      </mesh>
      
      {/* Camera lens */}
      <mesh position={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  )
}

// Rail-based draggable control point
function RailControlPoint({
  value,
  min,
  max,
  rail,
  color,
  onDrag,
  onDragStart,
  onDragEnd,
}: {
  value: number
  min: number
  max: number
  rail: THREE.Vector3[]
  color: string
  onDrag?: (value: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { camera, gl } = useThree()
  
  // Calculate position on rail based on value
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const index = Math.floor(t * (rail.length - 1))
  const position = rail[Math.min(index, rail.length - 1)] || new THREE.Vector3(0, 0, 0)
  
  // Update cursor
  useEffect(() => {
    if (hovered) {
      gl.domElement.style.cursor = 'grab'
    } else if (!isDragging) {
      gl.domElement.style.cursor = 'default'
    }
  }, [hovered, isDragging, gl])
  
  useEffect(() => {
    if (isDragging) {
      gl.domElement.style.cursor = 'grabbing'
    }
  }, [isDragging, gl])
  
  useEffect(() => {
    if (!isDragging) return
    
    const handlePointerMove = (event: PointerEvent) => {
      if (!onDrag) return
      
      event.preventDefault()
      event.stopPropagation()
      
      // Convert screen space to 3D space
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Raycast to find closest point on rail
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      
      let closestDistance = Infinity
      let closestT = 0
      
      rail.forEach((point, i) => {
        if (!point || point.x === undefined) return
        const distance = raycaster.ray.distanceToPoint(point)
        if (distance < closestDistance) {
          closestDistance = distance
          closestT = i / (rail.length - 1)
        }
      })
      
      const newValue = min + closestT * (max - min)
      const roundedValue = Math.round(newValue * 100) / 100 // Round to 2 decimal places
      onDrag(Math.max(min, Math.min(max, roundedValue)))
    }
    
    const handlePointerUp = () => {
      setIsDragging(false)
      onDragEnd?.()
    }
    
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, camera, gl, onDrag, rail, min, max, onDragEnd])
  
  return (
    <mesh
      ref={meshRef}
      position={[position.x, position.y, position.z]}
      onPointerDown={(e) => {
        e.stopPropagation()
        setIsDragging(true)
        onDragStart?.()
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <sphereGeometry args={[0.125, 16, 16]} />
      <meshStandardMaterial 
        color={color} 
        opacity={hovered || isDragging ? 1.0 : 0.8} 
        transparent 
        emissive={color}
        emissiveIntensity={hovered || isDragging ? 0.8 : 0.4}
      />
    </mesh>
  )
}

// Mini camera shape for distance control
function MiniCamera({ 
  opacity = 0.9, 
  emissiveIntensity = 0.3,
  hovered = false,
  isDragging = false
}: { 
  opacity?: number
  emissiveIntensity?: number
  hovered?: boolean
  isDragging?: boolean
}) {
  const scale = 0.6 // Smaller than main camera indicator
  const finalOpacity = hovered || isDragging ? 1.0 : opacity
  const finalEmissive = hovered || isDragging ? 0.6 : emissiveIntensity
  
  return (
    <group scale={[scale, scale, scale]}>
      {/* Camera body */}
      <mesh>
        <boxGeometry args={[0.3, 0.2, 0.4]} />
        <meshStandardMaterial 
          color="#fde047" 
          opacity={finalOpacity}
          transparent
          emissive="#fbbf24"
          emissiveIntensity={finalEmissive}
        />
      </mesh>
      
      {/* Camera lens */}
      <mesh position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
        <meshStandardMaterial 
          color="#1e293b"
          opacity={finalOpacity}
          transparent
          emissive="#1e293b"
          emissiveIntensity={finalEmissive * 0.5}
        />
      </mesh>
    </group>
  )
}

// Draggable distance control point with camera shape
// This moves along the camera-target ray (not a fixed circular rail)
function DistanceControlPoint({
  rotation,
  tilt,
  distance,
  color,
  opacity = 0.9,
  emissiveIntensity = 0.3,
  onDrag,
  onDragStart,
  onDragEnd
}: {
  rotation: number
  tilt: number
  distance: number
  color: string
  opacity?: number
  emissiveIntensity?: number
  onDrag?: (distance: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  const groupRef = useRef<THREE.Group>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { camera, gl } = useThree()
  
  // Update cursor based on hover state
  useEffect(() => {
    if (hovered) {
      gl.domElement.style.cursor = 'grab'
    } else if (!isDragging) {
      gl.domElement.style.cursor = 'default'
    }
  }, [hovered, isDragging, gl])
  
  // Update cursor during drag
  useEffect(() => {
    if (isDragging) {
      gl.domElement.style.cursor = 'grabbing'
    }
  }, [isDragging, gl])
  
  const position = calculateCameraPosition(rotation, tilt, distance)
  
  useEffect(() => {
    if (!isDragging) return
    
    const handlePointerMove = (event: PointerEvent) => {
      if (!groupRef.current || !onDrag) return
      
      event.preventDefault()
      event.stopPropagation()
      
      // Convert screen space to 3D space
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Calculate the ray direction from target to camera
      const rotationRad = (rotation * Math.PI) / 180
      const tiltRad = (tilt * Math.PI) / 180
      
      const rayDir = new THREE.Vector3(
        Math.sin(rotationRad) * Math.cos(tiltRad),
        Math.sin(tiltRad),
        Math.cos(rotationRad) * Math.cos(tiltRad)
      ).normalize()
      
      // Create raycaster from mouse
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      
      // Find the point on the ray that is closest to the mouse ray
      // This projects the mouse ray onto the camera-target ray
      const origin = new THREE.Vector3(0, 0, 0)
      const mouseRay = raycaster.ray
      
      // Calculate closest point on camera-target ray to mouse ray
      // Using the formula for closest point between two lines
      const w0 = origin.clone().sub(mouseRay.origin)
      const a = rayDir.dot(rayDir)
      const b = rayDir.dot(mouseRay.direction)
      const c = mouseRay.direction.dot(mouseRay.direction)
      const d = rayDir.dot(w0)
      const e = mouseRay.direction.dot(w0)
      
      const denom = a * c - b * b
      const t = (b * e - c * d) / denom
      
      // Calculate new distance (constrained to valid range)
      const newDistance = Math.max(0.5, Math.min(2.0, t / 3)) // Divide by 3 to convert back from visualization scale
      const roundedDistance = Math.round(newDistance * 100) / 100 // Round to 2 decimal places
      
      onDrag(roundedDistance)
    }
    
    const handlePointerUp = () => {
      setIsDragging(false)
      onDragEnd?.()
    }
    
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, camera, gl, rotation, tilt, onDrag, onDragEnd])
  
  // Calculate rotation to look at target
  const lookAtTarget = () => {
    const direction = new THREE.Vector3(0, 0, 0).sub(position).normalize()
    const quaternion = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    const matrix = new THREE.Matrix4()
    matrix.lookAt(position, new THREE.Vector3(0, 0, 0), up)
    quaternion.setFromRotationMatrix(matrix)
    return quaternion
  }
  
  return (
    <group
      ref={groupRef}
      position={[position.x, position.y, position.z]}
      quaternion={lookAtTarget()}
      onPointerDown={(e) => {
        e.stopPropagation()
        setIsDragging(true)
        onDragStart?.()
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <MiniCamera 
        opacity={opacity}
        emissiveIntensity={emissiveIntensity}
        hovered={hovered}
        isDragging={isDragging}
      />
    </group>
  )
}

// Draggable Start frame camera indicator
function StartFrameIndicator({ 
  startRotation, 
  startTilt, 
  startDistance,
  onDrag,
  onDragStart,
  onDragEnd
}: { 
  startRotation: number
  startTilt: number
  startDistance: number
  onDrag?: (rotation: number, tilt: number, distance: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { camera, gl } = useThree()
  
  // Update cursor based on hover state
  useEffect(() => {
    if (hovered) {
      gl.domElement.style.cursor = 'grab'
    } else if (!isDragging) {
      gl.domElement.style.cursor = 'default'
    }
  }, [hovered, isDragging, gl])
  
  // Update cursor during drag
  useEffect(() => {
    if (isDragging) {
      gl.domElement.style.cursor = 'grabbing'
    }
  }, [isDragging, gl])
  
  const position = calculateCameraPosition(startRotation, startTilt, startDistance)
  
  useEffect(() => {
    if (!isDragging) return
    
    const handlePointerMove = (event: PointerEvent) => {
      if (!meshRef.current || !onDrag) return
      
      event.preventDefault()
      event.stopPropagation()
      
      // Convert screen space to 3D space
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Raycast to find intersection with sphere around origin
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      
      // Create invisible sphere for raycasting
      const sphereRadius = startDistance * 3
      const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), sphereRadius)
      const ray = raycaster.ray
      const intersectPoint = new THREE.Vector3()
      
      if (ray.intersectSphere(sphere, intersectPoint)) {
        const angles = positionToAngles(intersectPoint)
        onDrag(angles.rotation, angles.tilt, angles.distance)
      }
    }
    
    const handlePointerUp = () => {
      setIsDragging(false)
      onDragEnd?.()
    }
    
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, camera, gl, onDrag, startDistance, onDragEnd])
  
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh
        ref={meshRef}
        onPointerDown={(e) => {
          e.stopPropagation()
          setIsDragging(true)
          onDragStart?.()
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#4ade80" 
          opacity={hovered ? 0.9 : 0.7} 
          transparent 
          emissive="#34d399"
          emissiveIntensity={hovered ? 0.7 : 0.3}
        />
      </mesh>
      {/* Label */}
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
      {/* Drag hint when hovered */}
      {hovered && (
        <sprite position={[0, 1, 0]} scale={[2, 0.5, 1]}>
          <spriteMaterial color="#4ade80" opacity={0.8} transparent />
        </sprite>
      )}
    </group>
  )
}

// Draggable End frame camera indicator
function EndFrameIndicator({ 
  endRotation, 
  endTilt, 
  endDistance,
  onDrag,
  onDragStart,
  onDragEnd
}: { 
  endRotation: number
  endTilt: number
  endDistance: number
  onDrag?: (rotation: number, tilt: number, distance: number) => void
  onDragStart?: () => void
  onDragEnd?: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hovered, setHovered] = useState(false)
  const { camera, gl } = useThree()
  
  // Update cursor based on hover state
  useEffect(() => {
    if (hovered) {
      gl.domElement.style.cursor = 'grab'
    } else if (!isDragging) {
      gl.domElement.style.cursor = 'default'
    }
  }, [hovered, isDragging, gl])
  
  // Update cursor during drag
  useEffect(() => {
    if (isDragging) {
      gl.domElement.style.cursor = 'grabbing'
    }
  }, [isDragging, gl])
  
  const position = calculateCameraPosition(endRotation, endTilt, endDistance)
  
  useEffect(() => {
    if (!isDragging) return
    
    const handlePointerMove = (event: PointerEvent) => {
      if (!meshRef.current || !onDrag) return
      
      event.preventDefault()
      event.stopPropagation()
      
      // Convert screen space to 3D space
      const rect = gl.domElement.getBoundingClientRect()
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1
      
      // Raycast to find intersection with sphere around origin
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera)
      
      // Create invisible sphere for raycasting
      const sphereRadius = endDistance * 3
      const sphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), sphereRadius)
      const ray = raycaster.ray
      const intersectPoint = new THREE.Vector3()
      
      if (ray.intersectSphere(sphere, intersectPoint)) {
        const angles = positionToAngles(intersectPoint)
        onDrag(angles.rotation, angles.tilt, angles.distance)
      }
    }
    
    const handlePointerUp = () => {
      setIsDragging(false)
      onDragEnd?.()
    }
    
    window.addEventListener('pointermove', handlePointerMove, { passive: false })
    window.addEventListener('pointerup', handlePointerUp)
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [isDragging, camera, gl, onDrag, endDistance, onDragEnd])
  
  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh
        ref={meshRef}
        onPointerDown={(e) => {
          e.stopPropagation()
          setIsDragging(true)
          onDragStart?.()
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial 
          color="#f87171" 
          opacity={hovered ? 0.9 : 0.7} 
          transparent 
          emissive="#ef4444"
          emissiveIntensity={hovered ? 0.7 : 0.3}
        />
      </mesh>
      {/* Label */}
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#f87171" />
      </mesh>
      {/* Drag hint when hovered */}
      {hovered && (
        <sprite position={[0, 1, 0]} scale={[2, 0.5, 1]}>
          <spriteMaterial color="#f87171" opacity={0.8} transparent />
        </sprite>
      )}
    </group>
  )
}

// Grid floor
function GridFloor() {
  return (
    <gridHelper args={[10, 10, '#6b7280', '#4b5563']} position={[0, -3, 0]} />
  )
}

// Scene content wrapper to manage OrbitControls state
function SceneContent({ 
  rotation, 
  tilt, 
  distance, 
  enableKeyframes,
  startRotation,
  startTilt,
  startDistance,
  endRotation,
  endTilt,
  endDistance,
  onStartFrameChange,
  onEndFrameChange,
  onRotationChange,
  onTiltChange,
  onDistanceChange
}: Omit<CameraPreview3DProps, 'onStartFrameChange' | 'onEndFrameChange' | 'onRotationChange' | 'onTiltChange' | 'onDistanceChange'> & {
  onStartFrameChange?: (rotation: number, tilt: number, distance: number) => void
  onEndFrameChange?: (rotation: number, tilt: number, distance: number) => void
  onRotationChange?: (rotation: number) => void
  onTiltChange?: (tilt: number) => void
  onDistanceChange?: (distance: number) => void
}) {
  const controlsRef = useRef<any>(null)
  
  const handleDragStart = () => {
    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }
  }
  
  const handleDragEnd = () => {
    if (controlsRef.current) {
      controlsRef.current.enabled = true
    }
  }
  
  return (
    <>
      <OrbitControls 
        ref={controlsRef}
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
      />
      
      {/* Scene objects */}
      {/* Wireframe sphere background */}
      <WireframeSphere radius={3.5} opacity={0.12} />
      
      <Target />
      
      {/* Only show CameraIndicator in keyframe mode (for animation) */}
      {enableKeyframes && (
        <CameraIndicator 
          rotation={rotation} 
          tilt={tilt} 
          distance={distance}
          enableKeyframes={enableKeyframes}
          startRotation={startRotation}
          startTilt={startTilt}
          startDistance={startDistance}
          endRotation={endRotation}
          endTilt={endTilt}
          endDistance={endDistance}
        />
      )}
      
      {/* Rail-based controls */}
      {enableKeyframes ? (
        <>
          {/* Keyframe Mode: Fixed Rails with Start & End Points */}
          {(() => {
            // Same fixed rails for both start and end
            const rotRail = generateRotationRail()
            const tiltRail = generateTiltRail()
            
            return (
              <>
                {/* Rotation Rail (Green) - Single fixed rail */}
                <Line points={rotRail} color="#4ade80" lineWidth={1.5} opacity={0.8} transparent />
                
                {/* Start point on rotation rail */}
                <RailControlPoint
                  value={startRotation || 0}
                  min={0}
                  max={360}
                  rail={rotRail}
                  color="#4ade80"
                  onDrag={(value) => onStartFrameChange?.(value, startTilt || 0, startDistance || 1.0)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
                
                {/* End point on rotation rail (smaller, semi-transparent) */}
                <RailControlPoint
                  value={endRotation || 0}
                  min={0}
                  max={360}
                  rail={rotRail}
                  color="#4ade80"
                  onDrag={(value) => onEndFrameChange?.(value, endTilt || 0, endDistance || 1.0)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
                
                {/* Tilt Rail (Pink) - Single fixed rail */}
                <Line points={tiltRail} color="#ec4899" lineWidth={1.5} opacity={0.8} transparent />
                
                {/* Start point on tilt rail */}
                <RailControlPoint
                  value={startTilt || 0}
                  min={-45}
                  max={45}
                  rail={tiltRail}
                  color="#ec4899"
                  onDrag={(value) => onStartFrameChange?.(startRotation || 0, value, startDistance || 1.0)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
                
                {/* End point on tilt rail */}
                <RailControlPoint
                  value={endTilt || 0}
                  min={-45}
                  max={45}
                  rail={tiltRail}
                  color="#ec4899"
                  onDrag={(value) => onEndFrameChange?.(endRotation || 0, value, endDistance || 1.0)}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
                
                {/* Distance: Lines from target to both cameras */}
                {(() => {
                  const startCamPos = calculateCameraPosition(startRotation || 0, startTilt || 0, startDistance || 1.0)
                  const endCamPos = calculateCameraPosition(endRotation || 0, endTilt || 0, endDistance || 1.0)
                  
                  return (
                    <>
                      {/* Start distance line */}
                      <Line 
                        points={[new THREE.Vector3(0, 0, 0), startCamPos]} 
                        color="#fde047" 
                        lineWidth={1.5} 
                        opacity={0.8} 
                        transparent 
                      />
                      <DistanceControlPoint
                        rotation={startRotation || 0}
                        tilt={startTilt || 0}
                        distance={startDistance || 1.0}
                        color="#fde047"
                        opacity={0.9}
                        emissiveIntensity={0.3}
                        onDrag={(newDist) => onStartFrameChange?.(startRotation || 0, startTilt || 0, newDist)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                      
                      {/* End distance line */}
                      <Line 
                        points={[new THREE.Vector3(0, 0, 0), endCamPos]} 
                        color="#fde047" 
                        lineWidth={1.5} 
                        opacity={0.5} 
                        transparent 
                        dashed
                        dashScale={2}
                      />
                      <DistanceControlPoint
                        rotation={endRotation || 0}
                        tilt={endTilt || 0}
                        distance={endDistance || 1.0}
                        color="#fde047"
                        opacity={0.5}
                        emissiveIntensity={0.2}
                        onDrag={(newDist) => onEndFrameChange?.(endRotation || 0, endTilt || 0, newDist)}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    </>
                  )
                })()}
              </>
            )
          })()}
        </>
      ) : (
        <>
          {/* Single Frame Mode: Fixed Rails */}
          {(() => {
            // Fixed rails at origin
            const rotRail = generateRotationRail()
            const tiltRail = generateTiltRail()
            
            return (
              <>
                {/* Rotation Rail (Green) - Fixed horizontal circle */}
                <Line points={rotRail} color="#4ade80" lineWidth={1.5} opacity={0.8} transparent />
                <RailControlPoint
                  value={rotation}
                  min={0}
                  max={360}
                  rail={rotRail}
                  color="#4ade80"
                  onDrag={onRotationChange}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
                
                {/* Tilt Rail (Pink) - Fixed vertical arc */}
                <Line points={tiltRail} color="#ec4899" lineWidth={1.5} opacity={0.8} transparent />
                <RailControlPoint
                  value={tilt}
                  min={-45}
                  max={45}
                  rail={tiltRail}
                  color="#ec4899"
                  onDrag={onTiltChange}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                />
                
                {/* Distance: Line from target to camera (no fixed rail) */}
                {(() => {
                  const camPos = calculateCameraPosition(rotation, tilt, distance)
                  const distLine = [
                    new THREE.Vector3(0, 0, 0), // Target
                    camPos // Camera
                  ]
                  return (
                    <>
                      <Line points={distLine} color="#fde047" lineWidth={1.5} opacity={0.6} transparent />
                      {/* Draggable distance control point */}
                      <DistanceControlPoint
                        rotation={rotation}
                        tilt={tilt}
                        distance={distance}
                        color="#fde047"
                        opacity={0.8}
                        emissiveIntensity={0.2}
                        onDrag={onDistanceChange}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    </>
                  )
                })()}
              </>
            )
          })()}
        </>
      )}
      
      <GridFloor />
      
      {/* Axis helper */}
      <axesHelper args={[3]} />
    </>
  )
}

export default function CameraPreview3D({ 
  rotation, 
  tilt, 
  distance, 
  enableKeyframes = false,
  startRotation = 0,
  startTilt = 0,
  startDistance = 1.0,
  endRotation = 0,
  endTilt = 0,
  endDistance = 1.0,
  onStartFrameChange,
  onEndFrameChange,
  onRotationChange,
  onTiltChange,
  onDistanceChange
}: CameraPreview3DProps) {
  return (
    <div className="w-full h-64 rounded-lg overflow-hidden bg-[#0f1419] border border-white/10 relative">
      <Canvas style={{ cursor: 'default' }}>
        <color attach="background" args={['#0f1419']} />
        
        {/* Lights */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        
        {/* Camera setup */}
        <PerspectiveCamera makeDefault position={[8, 6, 8]} fov={50} />
        
        <SceneContent
          rotation={rotation}
          tilt={tilt}
          distance={distance}
          enableKeyframes={enableKeyframes}
          startRotation={startRotation}
          startTilt={startTilt}
          startDistance={startDistance}
          endRotation={endRotation}
          endTilt={endTilt}
          endDistance={endDistance}
          onStartFrameChange={onStartFrameChange}
          onEndFrameChange={onEndFrameChange}
          onRotationChange={onRotationChange}
          onTiltChange={onTiltChange}
          onDistanceChange={onDistanceChange}
        />
      </Canvas>
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-black/70 rounded px-2 py-1 z-10">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-green-400"></div>
            <span>🟢 Rotation (좌우)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-pink-400"></div>
            <span>🟣 Tilt (상하)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-0.5 bg-yellow-400"></div>
            <span>🟡 Distance (거리)</span>
          </div>
          {enableKeyframes && (
            <div className="text-[9px] text-slate-500 mt-1 border-t border-white/10 pt-1">
              Bright: Start • Dim: End
            </div>
          )}
        </div>
      </div>
      
      {/* Animation status */}
      {enableKeyframes && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-xs text-blue-400 bg-black/70 rounded px-3 py-1 font-mono z-10">
          🎬 Keyframe Animation
        </div>
      )}
      
      {/* Drag hint */}
      <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 bg-black/70 rounded px-2 py-1 z-10">
        💡 Drag spheres along rails
      </div>
      
      {/* No camera movement indicator */}
      {!enableKeyframes && rotation === 0 && tilt === 0 && distance === 1.0 && (
        <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-xs text-green-400 bg-black/70 rounded px-3 py-1 font-mono z-10">
          No camera movement
        </div>
      )}
    </div>
  )
}
