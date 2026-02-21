import React, { useRef, useState, useEffect, useCallback } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { useIMEInput } from '../hooks/useIMEInput'
import { GeminiAPIClient, MockGeminiAPI } from '../services/geminiAPI'
import { getImage, saveImage } from '../utils/indexedDB'
import { X, Upload } from 'lucide-react'
import CameraPreview3D from './CameraPreview3D'
import { getCharacterPresets, getStoryboardPresets, applyPreset } from '../utils/gridPresets'
import type { GridPreset } from '../types/nodes'
import type {
  TextPromptNodeData,
  MotionPromptNodeData,
  ImageImportNodeData,
  GenImageNodeData,
  MovieNodeData,
  GridNodeData,
  CellRegeneratorNodeData,
  GridComposerNodeData,
  GridSlot,
  GridLayout,
  GenImageModel,
  GenImageResolution,
  ImageProvider,
} from '../types/nodes'

const NodeInspector = () => {
  const { nodes, selectedNodeId, setSelectedNodeId, updateNodeData } = useFlowStore()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)
  
  // 🎨 크기 조절 기능 (hooks는 항상 최상단에!)
  const [width, setWidth] = useState(400) // 기본 너비 400px
  const [isResizing, setIsResizing] = useState(false)
  const resizeRef = useRef<HTMLDivElement>(null)

  // 🎯 Resize 핸들러 (useEffect는 조건부 return 이전에!)
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = window.innerWidth - e.clientX
      // 최소 300px, 최대 800px
      setWidth(Math.min(Math.max(newWidth, 300), 800))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'ew-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // 노드가 선택되지 않았을 때는 패널을 완전히 숨김
  if (!selectedNode) {
    return null
  }

  const handleClose = () => {
    setSelectedNodeId(null)
  }

  // 🎯 Resize 시작
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const renderNodeSettings = () => {
    switch (selectedNode.type) {
      case 'textPrompt':
        return <TextPromptSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'motionPrompt':
        return <MotionPromptSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'imageImport':
        return <ImageImportSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'genImage':
        return <GenImageSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'movie':
        return <MovieSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'gridNode':
        return <GridNodeSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'cellRegenerator':
        return <CellRegeneratorSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'gridComposer':
        return <GridComposerSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'llmPrompt':
        return <LLMPromptSettings node={selectedNode} updateNodeData={updateNodeData} />
      default:
        return <div className="text-slate-400 text-sm">Unknown node type</div>
    }
  }

  return (
    <div 
      ref={resizeRef}
      className="relative flex h-full flex-col border border-white/10 bg-[#0f141a]/95 backdrop-blur-sm shadow-2xl rounded-l-2xl overflow-hidden"
      style={{ width: `${width}px` }}
    >
      {/* 🎯 Resize Handle (좌측 경계) */}
      <div
        onMouseDown={handleMouseDown}
        className="absolute left-0 top-0 h-full w-2 cursor-ew-resize hover:bg-blue-400/50 transition-colors z-10 group"
      >
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-16 bg-blue-400/30 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-white/5 p-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-200">Node Inspector</h2>
        </div>
        <button
          onClick={handleClose}
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-slate-200"
          title="닫기"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {renderNodeSettings()}
      </div>
    </div>
  )
}

// Settings components for each node type
const TextPromptSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as TextPromptNodeData

  const promptIME = useIMEInput(data.prompt, (value) => {
    updateNodeData(node.id, { prompt: value })
  })

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Prompt Text</label>
        <textarea
          {...promptIME}
          className="h-32 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          placeholder="Enter your prompt..."
        />
      </div>
    </div>
  )
}

const MotionPromptSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as MotionPromptNodeData
  const nodes = useFlowStore((state) => state.nodes)
  const edges = useFlowStore((state) => state.edges)
  
  // Check for incoming text prompt (on basePrompt handle or any target handle)
  const incomingPromptEdge = edges.find((e) => 
    e.target === node.id && 
    (!e.targetHandle || e.targetHandle === 'basePrompt')
  )
  const incomingPromptNode = incomingPromptEdge 
    ? nodes.find((n) => n.id === incomingPromptEdge.source)
    : null
  const incomingPromptText = incomingPromptNode?.type === 'textPrompt'
    ? (incomingPromptNode.data as TextPromptNodeData).prompt
    : ''
  
  // Use incoming prompt if available and basePrompt is empty
  const effectiveBasePrompt = data.basePrompt || incomingPromptText

  const updateCombined = (updates: Partial<MotionPromptNodeData>) => {
    const updated = { ...data, ...updates }
    
    // Use incoming prompt if basePrompt is empty
    if (!updated.basePrompt && incomingPromptText) {
      updated.basePrompt = incomingPromptText
    }
    
    // Camera angle descriptors
    const cameraAngles: string[] = []
    
    // Rotation
    // Rotation (360도 시스템)
    if (updated.cameraRotation !== undefined && updated.cameraRotation !== 0) {
      const angle = updated.cameraRotation
      
      // 360도를 0~360 범위로 정규화하고 반올림
      const normalizedAngle = Math.round(((angle % 360) + 360) % 360)
      
      if (normalizedAngle === 0 || normalizedAngle === 360) {
        // 0° = Front view (프롬프트에 추가 안 함)
      } else if (normalizedAngle > 0 && normalizedAngle <= 30) {
        cameraAngles.push(`slight three-quarter left view`)
      } else if (normalizedAngle > 30 && normalizedAngle < 60) {
        cameraAngles.push(`three-quarter left view`)
      } else if (normalizedAngle >= 60 && normalizedAngle < 90) {
        cameraAngles.push(`left side three-quarter view`)
      } else if (normalizedAngle === 90) {
        cameraAngles.push(`left side profile`)
      } else if (normalizedAngle > 90 && normalizedAngle < 120) {
        cameraAngles.push(`left three-quarter back view`)
      } else if (normalizedAngle >= 120 && normalizedAngle < 165) {
        cameraAngles.push(`three-quarter back view from left`)
      } else if (normalizedAngle >= 165 && normalizedAngle <= 195) {
        cameraAngles.push(`back view`)
      } else if (normalizedAngle > 195 && normalizedAngle < 240) {
        cameraAngles.push(`three-quarter back view from right`)
      } else if (normalizedAngle >= 240 && normalizedAngle < 270) {
        cameraAngles.push(`right three-quarter back view`)
      } else if (normalizedAngle === 270) {
        cameraAngles.push(`right side profile`)
      } else if (normalizedAngle > 270 && normalizedAngle < 300) {
        cameraAngles.push(`right side three-quarter view`)
      } else if (normalizedAngle >= 300 && normalizedAngle < 330) {
        cameraAngles.push(`three-quarter right view`)
      } else {
        cameraAngles.push(`slight three-quarter right view`)
      }
    }
    
    // Tilt
    if (updated.cameraTilt && updated.cameraTilt !== 0) {
      const roundedTilt = Math.round(Math.abs(updated.cameraTilt))
      if (updated.cameraTilt > 0) {
        cameraAngles.push(`high angle ${roundedTilt}°`)
      } else {
        cameraAngles.push(`low angle ${roundedTilt}°`)
      }
    }
    
    // Distance
    if (updated.cameraDistance && updated.cameraDistance !== 1.0) {
      const roundedDistance = Math.round(updated.cameraDistance * 100) / 100
      if (updated.cameraDistance > 1.0) {
        cameraAngles.push(`zoom out ${roundedDistance}x`)
      } else {
        cameraAngles.push(`zoom in ${roundedDistance}x`)
      }
    }
    
    // Add rotation subject context with Gemini-optimized terminology
    if (updated.cameraRotation && updated.cameraRotation !== 0) {
      if (updated.rotationSubject === 'camera-orbit') {
        cameraAngles.push('camera positioned around subject')
        cameraAngles.push('85mm portrait lens')
      } else if (updated.rotationSubject === 'character-turn') {
        cameraAngles.push('subject turns (background fixed)')
        cameraAngles.push('50mm standard lens')
      }
    }
    
    // Use effective base prompt (incoming or manual)
    const finalBasePrompt = updated.basePrompt || incomingPromptText
    
    const combined = [
      finalBasePrompt,
      updated.cameraMovement,
      updated.subjectMotion,
      updated.lighting,
      ...cameraAngles,
    ]
      .filter(Boolean)
      .join(', ')
    updateNodeData(node.id, { ...updated, combinedPrompt: combined })
  }

  const basePromptIME = useIMEInput(data.basePrompt, (value) => {
    updateCombined({ basePrompt: value })
  })
  
  // Auto-update combined prompt when incoming prompt or camera values change
  useEffect(() => {
    // Only update if incoming prompt exists and basePrompt is empty
    if (incomingPromptText && !data.basePrompt) {
      // Create combined with current camera values
      const cameraAngles: string[] = []
      
      // Rotation (360도 시스템)
      if (data.cameraRotation !== undefined && data.cameraRotation !== 0) {
        const angle = data.cameraRotation
        const normalizedAngle = Math.round(((angle % 360) + 360) % 360)
        
        if (normalizedAngle === 0 || normalizedAngle === 360) {
          // Front view
        } else if (normalizedAngle > 0 && normalizedAngle <= 30) {
          cameraAngles.push(`slight three-quarter left view`)
        } else if (normalizedAngle > 30 && normalizedAngle < 60) {
          cameraAngles.push(`three-quarter left view`)
        } else if (normalizedAngle >= 60 && normalizedAngle < 90) {
          cameraAngles.push(`left side three-quarter view`)
        } else if (normalizedAngle === 90) {
          cameraAngles.push(`left side profile`)
        } else if (normalizedAngle > 90 && normalizedAngle < 120) {
          cameraAngles.push(`left three-quarter back view`)
        } else if (normalizedAngle >= 120 && normalizedAngle < 165) {
          cameraAngles.push(`three-quarter back view from left`)
        } else if (normalizedAngle >= 165 && normalizedAngle <= 195) {
          cameraAngles.push(`back view`)
        } else if (normalizedAngle > 195 && normalizedAngle < 240) {
          cameraAngles.push(`three-quarter back view from right`)
        } else if (normalizedAngle >= 240 && normalizedAngle < 270) {
          cameraAngles.push(`right three-quarter back view`)
        } else if (normalizedAngle === 270) {
          cameraAngles.push(`right side profile`)
        } else if (normalizedAngle > 270 && normalizedAngle < 300) {
          cameraAngles.push(`right side three-quarter view`)
        } else if (normalizedAngle >= 300 && normalizedAngle < 330) {
          cameraAngles.push(`three-quarter right view`)
        } else {
          cameraAngles.push(`slight three-quarter right view`)
        }
      }
      
      if (data.cameraTilt && data.cameraTilt !== 0) {
        const roundedTilt = Math.round(Math.abs(data.cameraTilt))
        if (data.cameraTilt > 0) {
          cameraAngles.push(`high angle ${roundedTilt}°`)
        } else {
          cameraAngles.push(`low angle ${roundedTilt}°`)
        }
      }
      
      if (data.cameraDistance && data.cameraDistance !== 1.0) {
        const roundedDistance = Math.round(data.cameraDistance * 100) / 100
        if (data.cameraDistance > 1.0) {
          cameraAngles.push(`zoom out ${roundedDistance}x`)
        } else {
          cameraAngles.push(`zoom in ${roundedDistance}x`)
        }
      }
      
      // Add rotation subject context with Gemini-optimized terminology (only if there's rotation)
      if (data.cameraRotation && data.cameraRotation !== 0) {
        if (data.rotationSubject === 'camera-orbit') {
          cameraAngles.push('camera positioned around subject')
          cameraAngles.push('85mm portrait lens')
        } else if (data.rotationSubject === 'character-turn') {
          cameraAngles.push('subject turns (background fixed)')
          cameraAngles.push('50mm standard lens')
        }
      }
      
      const combined = [
        incomingPromptText,
        data.cameraMovement,
        data.subjectMotion,
        data.lighting,
        ...cameraAngles,
      ]
        .filter(Boolean)
        .join(', ')
      
      // Only update if combined actually changed
      if (combined !== data.combinedPrompt) {
        updateNodeData(node.id, { combinedPrompt: combined })
      }
    }
  }, [incomingPromptText, data.basePrompt, data.cameraRotation, data.cameraTilt, data.cameraDistance, data.rotationSubject, data.cameraMovement, data.subjectMotion, data.lighting])

  const presets = {
    camera: ['Zoom In', 'Zoom Out', 'Pan Left', 'Pan Right', 'Orbit', 'Static'],
    motion: ['Gentle', 'Dynamic', 'Flowing', 'Wind', 'Water'],
    lighting: ['Sunrise', 'Sunset', 'Clouds', 'Light Rays', 'Flicker'],
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Base Prompt</label>
        
        {/* Show connected prompt info */}
        {incomingPromptText && !data.basePrompt && (
          <div className="mb-2 rounded-lg border border-violet-400/30 bg-violet-500/10 p-2 text-xs text-violet-300">
            <div className="flex items-center gap-2">
              <span>🔗</span>
              <span className="font-medium">연결된 프롬프트 사용 중</span>
            </div>
            <div className="mt-1 text-[10px] text-violet-400/80 line-clamp-2">
              "{incomingPromptText}"
            </div>
            <div className="mt-1 text-[9px] text-violet-400/60">
              💡 직접 입력하면 연결된 프롬프트를 덮어씁니다
            </div>
          </div>
        )}
        
        <textarea
          {...basePromptIME}
          className="h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          placeholder={incomingPromptText ? "연결된 프롬프트 사용 중 (입력하면 오버라이드)" : "Enter base prompt..."}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Camera Movement</label>
        <select
          value={data.cameraMovement}
          onChange={(e) => updateCombined({ cameraMovement: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="">Select...</option>
          {presets.camera.map((item) => (
            <option key={item} value={item.toLowerCase()}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Subject Motion</label>
        <select
          value={data.subjectMotion}
          onChange={(e) => updateCombined({ subjectMotion: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="">Select...</option>
          {presets.motion.map((item) => (
            <option key={item} value={item.toLowerCase()}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Lighting</label>
        <select
          value={data.lighting}
          onChange={(e) => updateCombined({ lighting: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="">Select...</option>
          {presets.lighting.map((item) => (
            <option key={item} value={item.toLowerCase()}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* 🎥 Camera Control Section */}
      <div className="border-t border-white/10 pt-4 mt-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-fuchsia-400">🎥 Camera Control</span>
          
          {/* Keyframe Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={data.enableKeyframes || false}
              onChange={(e) => updateCombined({ enableKeyframes: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
            />
            <span className="text-xs text-slate-300">🎬 Keyframes</span>
          </label>
        </div>

        {/* Rotation Subject Selection */}
        <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
          <label className="mb-2 block text-xs font-medium text-slate-400">Rotation Subject (회전 기준)</label>
          <div className="mb-3 text-[10px] text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded px-2 py-1">
            💡 대부분의 AI 모델은 Character Turn을 더 잘 이해합니다
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="rotationSubject"
                value="camera-orbit"
                checked={data.rotationSubject === 'camera-orbit'}
                onChange={(e) => updateCombined({ rotationSubject: e.target.value as 'camera-orbit' | 'character-turn' })}
                className="w-4 h-4 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
              />
              <div className="flex-1">
                <div className="text-sm text-slate-200 group-hover:text-white transition">🎬 Camera Orbit</div>
                <div className="text-[10px] text-slate-500">카메라가 인물 주위를 회전 (배경도 회전)</div>
                <div className="text-[9px] text-slate-600 mt-0.5">⚠️ AI가 오해할 수 있음 - 고급 기능</div>
              </div>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="radio"
                name="rotationSubject"
                value="character-turn"
                checked={data.rotationSubject === 'character-turn'}
                onChange={(e) => updateCombined({ rotationSubject: e.target.value as 'camera-orbit' | 'character-turn' })}
                className="w-4 h-4 text-blue-500 focus:ring-2 focus:ring-blue-500/50"
              />
              <div className="flex-1">
                <div className="text-sm text-slate-200 group-hover:text-white transition">🧍 Character Turn <span className="text-[9px] text-green-400">✓ 권장</span></div>
                <div className="text-[10px] text-slate-500">인물만 회전 (배경 고정)</div>
                <div className="text-[9px] text-green-600 mt-0.5">✓ AI가 가장 잘 이해하는 방식</div>
              </div>
            </label>
          </div>
        </div>

        {/* 3D Preview */}
        <div className="mb-4">
          <CameraPreview3D
            rotation={data.cameraRotation || 0}
            tilt={data.cameraTilt || 0}
            distance={data.cameraDistance || 1.0}
            enableKeyframes={data.enableKeyframes || false}
            startRotation={data.startRotation || 0}
            startTilt={data.startTilt || 0}
            startDistance={data.startDistance || 1.0}
            endRotation={data.endRotation || 0}
            endTilt={data.endTilt || 0}
            endDistance={data.endDistance || 1.0}
            onStartFrameChange={(rotation, tilt, distance) => {
              updateCombined({ 
                startRotation: rotation, 
                startTilt: tilt, 
                startDistance: distance 
              })
            }}
            onEndFrameChange={(rotation, tilt, distance) => {
              updateCombined({ 
                endRotation: rotation, 
                endTilt: tilt, 
                endDistance: distance 
              })
            }}
            onRotationChange={(rotation) => {
              updateCombined({ cameraRotation: rotation })
            }}
            onTiltChange={(tilt) => {
              updateCombined({ cameraTilt: tilt })
            }}
            onDistanceChange={(distance) => {
              updateCombined({ cameraDistance: distance })
            }}
          />
        </div>

        {/* Preset Buttons (360도 시스템) */}
        <div className="mb-4">
          <label className="mb-2 block text-xs font-medium text-slate-400">Quick Presets</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => updateCombined({ cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.0 })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
            >
              🎬 Front (0°)
            </button>
            <button
              onClick={() => updateCombined({ cameraRotation: 90, cameraTilt: 0, cameraDistance: 1.0 })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
            >
              ▶️ Right Side (90°)
            </button>
            <button
              onClick={() => updateCombined({ cameraRotation: 180, cameraTilt: 0, cameraDistance: 1.0 })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
            >
              🔄 Back (180°)
            </button>
            <button
              onClick={() => updateCombined({ cameraRotation: 270, cameraTilt: 0, cameraDistance: 1.0 })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
            >
              ◀️ Left Side (270°)
            </button>
            <button
              onClick={() => updateCombined({ cameraRotation: 45, cameraTilt: 0, cameraDistance: 1.0 })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
            >
              📐 3/4 Right (45°)
            </button>
            <button
              onClick={() => updateCombined({ cameraRotation: 315, cameraTilt: 0, cameraDistance: 1.0 })}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
            >
              📐 3/4 Left (315°)
            </button>
          </div>
        </div>

        {/* Keyframe Controls or Single Controls */}
        {data.enableKeyframes ? (
          <>
            {/* Start Frame Controls */}
            <div className="border border-green-500/30 rounded-lg p-3 mb-4 bg-green-500/5">
              <div className="text-xs font-semibold text-green-400 mb-3">🟢 Start Frame</div>
              
              {/* Start Rotation */}
              <div className="mb-3">
                <label className="mb-1 block text-[10px] font-medium text-slate-300 flex justify-between">
                  <span>Rotation</span>
                  <span className="text-green-400">{(data.startRotation || 0).toFixed(2)}°</span>
                </label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="5"
                  value={data.startRotation || 0}
                  onChange={(e) => updateCombined({ startRotation: Number(e.target.value) })}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
                />
              </div>

              {/* Start Tilt */}
              <div className="mb-3">
                <label className="mb-1 block text-[10px] font-medium text-slate-300 flex justify-between">
                  <span>Tilt</span>
                  <span className="text-green-400">{(data.startTilt || 0).toFixed(2)}°</span>
                </label>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="5"
                  value={data.startTilt || 0}
                  onChange={(e) => updateCombined({ startTilt: Number(e.target.value) })}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
                />
              </div>

              {/* Start Distance */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-300 flex justify-between">
                  <span>Distance</span>
                  <span className="text-green-400">{(data.startDistance || 1.0).toFixed(2)}x</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={data.startDistance || 1.0}
                  onChange={(e) => updateCombined({ startDistance: Number(e.target.value) })}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
                />
              </div>
            </div>

            {/* End Frame Controls */}
            <div className="border border-red-500/30 rounded-lg p-3 mb-4 bg-red-500/5">
              <div className="text-xs font-semibold text-red-400 mb-3">🔴 End Frame</div>
              
              {/* End Rotation */}
              <div className="mb-3">
                <label className="mb-1 block text-[10px] font-medium text-slate-300 flex justify-between">
                  <span>Rotation</span>
                  <span className="text-red-400">{(data.endRotation || 0).toFixed(2)}°</span>
                </label>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  step="5"
                  value={data.endRotation || 0}
                  onChange={(e) => updateCombined({ endRotation: Number(e.target.value) })}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
                />
              </div>

              {/* End Tilt */}
              <div className="mb-3">
                <label className="mb-1 block text-[10px] font-medium text-slate-300 flex justify-between">
                  <span>Tilt</span>
                  <span className="text-red-400">{(data.endTilt || 0).toFixed(2)}°</span>
                </label>
                <input
                  type="range"
                  min="-45"
                  max="45"
                  step="5"
                  value={data.endTilt || 0}
                  onChange={(e) => updateCombined({ endTilt: Number(e.target.value) })}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
                />
              </div>

              {/* End Distance */}
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-300 flex justify-between">
                  <span>Distance</span>
                  <span className="text-red-400">{(data.endDistance || 1.0).toFixed(2)}x</span>
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={data.endDistance || 1.0}
                  onChange={(e) => updateCombined({ endDistance: Number(e.target.value) })}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-500"
                />
              </div>
            </div>

            {/* Keyframe Presets */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-slate-400">Animation Presets</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateCombined({ 
                    startRotation: -45, startTilt: 0, startDistance: 1.0,
                    endRotation: 45, endTilt: 0, endDistance: 1.0
                  })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                >
                  Pan Left→Right
                </button>
                <button
                  onClick={() => updateCombined({ 
                    startRotation: 0, startTilt: 30, startDistance: 1.5,
                    endRotation: 0, endTilt: -30, endDistance: 1.0
                  })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                >
                  Crane Shot
                </button>
                <button
                  onClick={() => updateCombined({ 
                    startRotation: 0, startTilt: 0, startDistance: 2.0,
                    endRotation: 0, endTilt: 0, endDistance: 0.8
                  })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                >
                  Zoom In
                </button>
                <button
                  onClick={() => updateCombined({ 
                    startRotation: -30, startTilt: -15, startDistance: 1.2,
                    endRotation: 30, endTilt: 15, endDistance: 0.9
                  })}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 hover:bg-white/10 transition-colors"
                >
                  Orbit
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Single Frame Controls (Original) */}
            {/* Rotation Slider (360도 시스템) */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-slate-300 flex justify-between">
                <span>🔄 Rotation (360° 회전)</span>
                <span className="text-fuchsia-400">{(data.cameraRotation || 0).toFixed(0)}°</span>
              </label>
              <input
                type="range"
                min="0"
                max="360"
                step="15"
                value={data.cameraRotation || 0}
                onChange={(e) => updateCombined({ cameraRotation: Number(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fuchsia-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0° Front</span>
                <span>90° Right</span>
                <span>180° Back</span>
                <span>270° Left</span>
                <span>360°</span>
              </div>
            </div>

            {/* Tilt Slider */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-slate-300 flex justify-between">
                <span>🟣 Tilt (상하)</span>
                <span className="text-fuchsia-400">{(data.cameraTilt || 0).toFixed(2)}°</span>
              </label>
              <input
                type="range"
                min="-45"
                max="45"
                step="5"
                value={data.cameraTilt || 0}
                onChange={(e) => updateCombined({ cameraTilt: Number(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fuchsia-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>↑ Low -45°</span>
                <span>Eye Level</span>
                <span>High +45° ↓</span>
              </div>
            </div>

            {/* Distance Slider */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-medium text-slate-300 flex justify-between">
                <span>🟡 Distance (거리/줌)</span>
                <span className="text-fuchsia-400">{(data.cameraDistance || 1.0).toFixed(2)}x</span>
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={data.cameraDistance || 1.0}
                onChange={(e) => updateCombined({ cameraDistance: Number(e.target.value) })}
                className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-fuchsia-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Close 0.5x</span>
                <span>Normal</span>
                <span>Wide 2.0x</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Combined Prompt (Output)</label>
        <textarea
          value={data.combinedPrompt}
          readOnly
          className="h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 opacity-80"
        />
      </div>
    </div>
  )
}

const ImageImportSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as ImageImportNodeData
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [displayUrl, setDisplayUrl] = React.useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = React.useState(false)
  const [loadFailed, setLoadFailed] = React.useState(false)

  // idb:/s3: 참조를 실제 DataURL로 변환하여 표시
  const loadImageForDisplay = React.useCallback(async () => {
    const ref = data.imageDataUrl || data.imageUrl
    if (!ref) {
      // 참조가 없지만 nodeId로 IndexedDB 검색 시도
      setIsLoading(true)
      setLoadFailed(false)
      try {
        const { initDB, blobToDataURL } = await import('../utils/indexedDB')
        const db = await initDB()
        const allMeta = await db.getAll('metadata')
        const nodeMeta = allMeta
          .filter((m: any) => m.nodeId === node.id && m.type === 'image')
          .sort((a: any, b: any) => b.createdAt - a.createdAt)

        if (nodeMeta.length > 0) {
          const blob = await db.get('images', nodeMeta[0].id)
          if (blob) {
            const dataURL = await blobToDataURL(blob)
            console.log('✅ Inspector: nodeId로 이미지 복구 성공:', nodeMeta[0].id)
            setDisplayUrl(dataURL)
            setLoadFailed(false)
            // 참조 복원
            updateNodeData(node.id, { imageDataUrl: `idb:${nodeMeta[0].id}` })
            return
          }
        }
      } catch (error) {
        console.warn('⚠️ Inspector: nodeId 검색 실패:', error)
      } finally {
        setIsLoading(false)
      }
      setDisplayUrl(undefined)
      setLoadFailed(true)
      return
    }

    if (typeof ref === 'string' && (ref.startsWith('idb:') || ref.startsWith('s3:'))) {
      setIsLoading(true)
      setLoadFailed(false)
      try {
        const { getImage } = await import('../utils/indexedDB')
        const dataURL = await getImage(ref)
        if (dataURL) {
          setDisplayUrl(dataURL)
          setLoadFailed(false)
        } else {
          setDisplayUrl(undefined)
          setLoadFailed(true)
        }
      } catch (error) {
        console.error('❌ Inspector: 이미지 로드 실패:', error)
        setDisplayUrl(undefined)
        setLoadFailed(true)
      } finally {
        setIsLoading(false)
      }
    } else if (typeof ref === 'string' && ref.startsWith('data:')) {
      setDisplayUrl(ref)
      setLoadFailed(false)
    } else {
      setDisplayUrl(ref)
      setLoadFailed(false)
    }
  }, [data.imageDataUrl, data.imageUrl, node.id, updateNodeData])

  React.useEffect(() => {
    loadImageForDisplay()
  }, [loadImageForDisplay])

  const readAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      return
    }
    const url = URL.createObjectURL(file)
    const dataUrl = await readAsDataUrl(file)
    const img = new Image()
    img.onload = async () => {
      try {
        const { saveImage } = await import('../utils/indexedDB')
        const imageId = `img-import-${Date.now()}-${Math.random().toString(36).substring(7)}`
        const savedRef = await saveImage(imageId, dataUrl, node.id, true)
        updateNodeData(node.id, {
          imageUrl: url,
          imageDataUrl: savedRef,
          fileName: file.name,
          filePath: file.webkitRelativePath || file.name,
          width: img.width,
          height: img.height,
        })
        setDisplayUrl(dataUrl)
        setLoadFailed(false)
      } catch (error) {
        console.error('❌ Inspector: 이미지 저장 실패', error)
        updateNodeData(node.id, {
          imageUrl: url,
          imageDataUrl: dataUrl,
          fileName: file.name,
          filePath: file.webkitRelativePath || file.name,
          width: img.width,
          height: img.height,
        })
        setDisplayUrl(dataUrl)
      }
    }
    img.src = url
  }

  const hasImageRef = !!(data.imageDataUrl || data.imageUrl)
  const [isDragOver, setIsDragOver] = React.useState(false)

  const handleDrop = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      void handleFileUpload(file)
    }
  }, [handleFileUpload])

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void handleFileUpload(file)
          }
        }}
      />

      {isLoading ? (
        <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
          <div className="text-xs text-slate-400">이미지 로딩 중...</div>
        </div>
      ) : displayUrl ? (
        <>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Preview</span>
              <button
                onClick={() => loadImageForDisplay()}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-400 transition hover:bg-white/10 hover:text-cyan-400"
                title="이미지 다시 로드"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
                Reload
              </button>
            </div>
            <div className="max-h-[600px] overflow-auto rounded-lg border border-white/10">
              <img
                src={displayUrl}
                alt="Imported"
                className="w-full"
                onError={() => {
                  setDisplayUrl(undefined)
                  setLoadFailed(true)
                }}
              />
            </div>
            {data.fileName && (
              <div className="mt-2 text-xs text-slate-400">
                {data.fileName}
              </div>
            )}
          </div>
          
          <div>
            <div className="mb-2 text-sm font-medium text-slate-300">Dimensions</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              {data.width ?? '-'} x {data.height ?? '-'} px
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-400 transition hover:bg-cyan-500/20"
          >
            Change Image
          </button>

          <button
            onClick={() => {
              updateNodeData(node.id, { imageUrl: undefined, imageDataUrl: undefined, fileName: undefined, filePath: undefined, width: undefined, height: undefined })
              setDisplayUrl(undefined)
            }}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/20"
          >
            Remove Image
          </button>
        </>
      ) : (loadFailed || !displayUrl) && hasImageRef ? (
        <div
          className={`rounded-lg border-2 border-dashed p-4 text-center transition ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-amber-500/30 bg-amber-500/5'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
        >
          {isDragOver ? (
            <div className="py-6 text-cyan-400">
              <Upload className="mx-auto mb-2 h-8 w-8" />
              <div className="text-sm font-medium">여기에 놓기</div>
            </div>
          ) : (
            <>
              <div className="mb-3 text-sm text-amber-400">이미지를 불러올 수 없습니다</div>
              <div className="mb-3 text-xs text-slate-400">
                이미지를 여기로 드래그하거나 버튼을 클릭하세요
              </div>
              {data.fileName && (
                <div className="mb-3 rounded bg-white/5 px-2 py-1 text-xs text-slate-500">
                  {data.fileName}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400 transition hover:bg-blue-500/20"
              >
                파일 선택
              </button>
            </>
          )}
        </div>
      ) : data.fileName ? (
        <div
          className={`rounded-lg border-2 border-dashed p-4 text-center transition ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-yellow-500/30 bg-yellow-500/5'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
        >
          {isDragOver ? (
            <div className="py-6 text-cyan-400">
              <Upload className="mx-auto mb-2 h-8 w-8" />
              <div className="text-sm font-medium">여기에 놓기</div>
            </div>
          ) : (
            <>
              <div className="mb-2 text-sm text-yellow-400">이미지가 정리되었습니다</div>
              <div className="mb-3 rounded bg-white/5 px-2 py-1 text-xs text-slate-500">
                {data.fileName}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400 transition hover:bg-blue-500/20"
              >
                파일 선택
              </button>
            </>
          )}
        </div>
      ) : (
        <div
          className={`rounded-lg border-2 border-dashed p-4 text-center transition ${
            isDragOver
              ? 'border-cyan-400 bg-cyan-400/10'
              : 'border-white/10 bg-white/5'
          }`}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
        >
          {isDragOver ? (
            <div className="py-6 text-cyan-400">
              <Upload className="mx-auto mb-2 h-8 w-8" />
              <div className="text-sm font-medium">여기에 놓기</div>
            </div>
          ) : (
            <>
              <div className="mb-3 text-sm text-slate-400">이미지를 드래그하거나 선택하세요</div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400 transition hover:bg-blue-500/20"
              >
                파일 선택
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

const GenImageSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as GenImageNodeData
  const runGenImageNode = useFlowStore((state) => state.runGenImageNode)
  const cancelNodeExecution = useFlowStore((state) => state.cancelNodeExecution)
  const [displayImageUrl, setDisplayImageUrl] = useState<string | undefined>(
    data.outputImageUrl
  )
  
  // Ensure resolution and aspectRatio have valid values (for backward compatibility with old nodes)
  const safeResolution = data.resolution || '2K'
  const safeAspectRatio = data.aspectRatio || '1:1'

  // 🔄 IndexedDB/S3에서 이미지 복원
  useEffect(() => {
    const loadImage = async () => {
      if (!data.outputImageUrl) {
        setDisplayImageUrl(undefined)
        return
      }

      // idb: 또는 s3: 참조인 경우
      if (
        typeof data.outputImageUrl === 'string' &&
        (data.outputImageUrl.startsWith('idb:') || data.outputImageUrl.startsWith('s3:'))
      ) {
        try {
          const dataURL = await getImage(data.outputImageUrl)
          if (dataURL) {
            setDisplayImageUrl(dataURL)
          } else {
            setDisplayImageUrl(undefined)
          }
        } catch (error) {
          console.error('❌ Inspector 이미지 복원 실패:', error)
          setDisplayImageUrl(undefined)
        }
      } else {
        // 일반 DataURL 또는 HTTP URL
        setDisplayImageUrl(data.outputImageUrl)
      }
    }

    loadImage()
  }, [data.outputImageUrl])

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing': return 'Generating...'
      case 'completed': return 'Completed'
      case 'error': return 'Error'
      default: return 'Ready'
    }
  }

  const getResolutionDetails = (resolution: string, aspectRatio: string) => {
    const resolutions: Record<string, Record<string, { size: string; pixels: string; time: string; cost: string }>> = {
      '1K': {
        '1:1': { size: '1024 × 1024', pixels: '~1.0MP', time: '5~10s', cost: 'Low' },
        '16:9': { size: '1024 × 576', pixels: '~0.6MP', time: '5~10s', cost: 'Low' },
        '9:16': { size: '576 × 1024', pixels: '~0.6MP', time: '5~10s', cost: 'Low' },
        '4:3': { size: '1024 × 768', pixels: '~0.8MP', time: '5~10s', cost: 'Low' },
        '3:4': { size: '768 × 1024', pixels: '~0.8MP', time: '5~10s', cost: 'Low' },
        '21:9': { size: '1024 × 439', pixels: '~0.4MP', time: '5~10s', cost: 'Low' },
        '3:2': { size: '1024 × 683', pixels: '~0.7MP', time: '5~10s', cost: 'Low' },
        '2:3': { size: '683 × 1024', pixels: '~0.7MP', time: '5~10s', cost: 'Low' },
        '5:4': { size: '1024 × 819', pixels: '~0.8MP', time: '5~10s', cost: 'Low' },
        '4:5': { size: '819 × 1024', pixels: '~0.8MP', time: '5~10s', cost: 'Low' }
      },
      '2K': {
        '1:1': { size: '2048 × 2048', pixels: '~4.2MP', time: '10~20s', cost: 'Medium' },
        '16:9': { size: '2048 × 1152', pixels: '~2.4MP', time: '10~20s', cost: 'Medium' },
        '9:16': { size: '1152 × 2048', pixels: '~2.4MP', time: '10~20s', cost: 'Medium' },
        '4:3': { size: '2048 × 1536', pixels: '~3.1MP', time: '10~20s', cost: 'Medium' },
        '3:4': { size: '1536 × 2048', pixels: '~3.1MP', time: '10~20s', cost: 'Medium' },
        '21:9': { size: '2048 × 878', pixels: '~1.8MP', time: '10~20s', cost: 'Medium' },
        '3:2': { size: '2048 × 1365', pixels: '~2.8MP', time: '10~20s', cost: 'Medium' },
        '2:3': { size: '1365 × 2048', pixels: '~2.8MP', time: '10~20s', cost: 'Medium' },
        '5:4': { size: '2048 × 1638', pixels: '~3.4MP', time: '10~20s', cost: 'Medium' },
        '4:5': { size: '1638 × 2048', pixels: '~3.4MP', time: '10~20s', cost: 'Medium' }
      },
      '4K': {
        '1:1': { size: '4096 × 4096', pixels: '~16.8MP', time: '25~45s', cost: 'High' },
        '16:9': { size: '4096 × 2304', pixels: '~9.4MP', time: '25~45s', cost: 'High' },
        '9:16': { size: '2304 × 4096', pixels: '~9.4MP', time: '25~45s', cost: 'High' },
        '4:3': { size: '4096 × 3072', pixels: '~12.6MP', time: '25~45s', cost: 'High' },
        '3:4': { size: '3072 × 4096', pixels: '~12.6MP', time: '25~45s', cost: 'High' },
        '21:9': { size: '4096 × 1755', pixels: '~7.2MP', time: '25~45s', cost: 'High' },
        '3:2': { size: '4096 × 2731', pixels: '~11.2MP', time: '25~45s', cost: 'High' },
        '2:3': { size: '2731 × 4096', pixels: '~11.2MP', time: '25~45s', cost: 'High' },
        '5:4': { size: '4096 × 3277', pixels: '~13.4MP', time: '25~45s', cost: 'High' },
        '4:5': { size: '3277 × 4096', pixels: '~13.4MP', time: '25~45s', cost: 'High' }
      }
    }
    return resolutions[resolution]?.[aspectRatio] || resolutions['2K']['1:1']
  }

  const resolutionDetails = getResolutionDetails(safeResolution, safeAspectRatio)
  
  const getAspectRatioDescription = (ratio: string) => {
    switch (ratio) {
      case '1:1': return 'Square - Instagram posts, profile pictures, general use'
      case '16:9': return 'Landscape - YouTube, presentations, desktop wallpapers'
      case '9:16': return 'Portrait - Mobile, Instagram/TikTok stories, vertical videos'
      case '4:3': return 'Standard - Traditional TV, photography, print media'
      case '3:4': return 'Portrait Standard - Portraits, posters, traditional media'
      case '21:9': return 'Ultra-wide - Cinematic, panoramic views, banners'
      case '3:2': return 'Classic - 35mm photography, DSLR standard, natural feel'
      case '2:3': return 'Portrait Classic - Magazine covers, art prints, portraits'
      case '5:4': return 'Medium Format - Large format photography, fine art prints'
      case '4:5': return 'Portrait Medium - Pinterest pins, product photos, tall posters'
      default: return 'Select an aspect ratio to see details'
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Provider</label>
        <select
          value={data.provider || 'nanoBanana'}
          onChange={(e) => updateNodeData(node.id, { provider: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="nanoBanana">🍌 Nano Banana (Gemini)</option>
        </select>
        <div className="mt-1 text-[10px] text-slate-500">추후 DALL·E, Flux 등 추가 예정</div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(node.id, { model: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="gemini-3-pro-image-preview">Gemini Pro (High Quality)</option>
          <option value="gemini-2.5-flash-image">Gemini Flash (Fast)</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Resolution</label>
        <select
          value={safeResolution}
          onChange={(e) => updateNodeData(node.id, { resolution: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="1K">1K - Fast & Economical</option>
          <option value="2K">2K - Balanced Quality</option>
          <option value="4K">4K - Maximum Quality</option>
        </select>
        <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3 space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Dimensions:</span>
            <span className="text-slate-200 font-medium">{resolutionDetails.size}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Total Pixels:</span>
            <span className="text-slate-200 font-medium">{resolutionDetails.pixels}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Est. Time:</span>
            <span className="text-slate-200 font-medium">{resolutionDetails.time}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Cost:</span>
            <span className={`font-medium ${
              resolutionDetails.cost === 'High' ? 'text-red-400' : 
              resolutionDetails.cost === 'Medium' ? 'text-yellow-400' : 
              'text-green-400'
            }`}>{resolutionDetails.cost}</span>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Reference Images</label>
        <select
          value={data.maxReferences || 3}
          onChange={(e) => updateNodeData(node.id, { maxReferences: parseInt(e.target.value) })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="1">1 Reference</option>
          <option value="2">2 References</option>
          <option value="3">3 References (Default)</option>
          <option value="4">4 References</option>
          <option value="5">5 References</option>
        </select>
        <div className="mt-2 rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-3 text-xs text-cyan-300">
          💡 <strong>Multi-Reference:</strong> 각 reference를 연결하고 프롬프트에서 "reference 1", "reference 2" 등으로 참조하세요.
          <div className="mt-1 text-[10px] text-cyan-400">
            예: "Use reference 1 as background, reference 2 for character"
          </div>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Aspect Ratio</label>
        <select
          value={safeAspectRatio}
          onChange={(e) => updateNodeData(node.id, { aspectRatio: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="1:1">1:1 - Square</option>
          <option value="16:9">16:9 - Landscape</option>
          <option value="9:16">9:16 - Portrait</option>
          <option value="4:3">4:3 - Standard</option>
          <option value="3:4">3:4 - Portrait Standard</option>
          <option value="21:9">21:9 - Ultra-wide</option>
          <option value="3:2">3:2 - Classic Photography</option>
          <option value="2:3">2:3 - Portrait Classic</option>
          <option value="5:4">5:4 - Medium Format</option>
          <option value="4:5">4:5 - Portrait Medium</option>
        </select>
        <div className="mt-2 rounded-lg border border-white/10 bg-white/5 p-3">
          <div className="text-xs text-slate-400 leading-relaxed">
            {getAspectRatioDescription(safeAspectRatio)}
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-300">Status</div>
        <div className={`rounded-lg border p-3 text-sm ${
          data.status === 'completed' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
          data.status === 'processing' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
          data.status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
          'border-white/10 bg-white/5 text-slate-400'
        }`}>
          {getStatusText(data.status)}
        </div>
      </div>

      {data.error && (
        <div className={`rounded-lg border p-3 text-sm ${
          data.error.includes('할당량') || data.error.includes('quota')
            ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
            : 'border-red-500/30 bg-red-500/10 text-red-400'
        }`}>
          {data.error}
        </div>
      )}

      {data.status === 'completed' && data.outputImageUrl && (() => {
        // Use generated settings if available, otherwise fall back to current settings
        const displayModel = data.generatedModel || data.model
        const displayResolution = data.generatedResolution || safeResolution
        const displayAspectRatio = data.generatedAspectRatio || safeAspectRatio
        const generatedDetails = getResolutionDetails(displayResolution, displayAspectRatio)
        
        return (
          <div>
            <div className="mb-2 text-sm font-medium text-slate-300">Generated Image Info</div>
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3 space-y-2">
              <div className="flex items-center gap-2 pb-2 border-b border-green-500/10">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs font-medium text-green-400">Successfully Generated</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Model</div>
                  <div className="text-xs font-medium text-slate-200">
                    {displayModel === 'gemini-3-pro-image-preview' ? 'Gemini Pro' : 'Gemini Flash'}
                  </div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Resolution</div>
                  <div className="text-xs font-medium text-slate-200">{displayResolution}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Aspect Ratio</div>
                  <div className="text-xs font-medium text-slate-200">{displayAspectRatio}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Dimensions</div>
                  <div className="text-xs font-medium text-slate-200">{generatedDetails.size}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Total Pixels</div>
                  <div className="text-xs font-medium text-slate-200">{generatedDetails.pixels}</div>
                </div>
                
                <div>
                  <div className="text-xs text-slate-400 mb-1">Quality Tier</div>
                  <div className={`text-xs font-medium ${
                    generatedDetails.cost === 'High' ? 'text-red-400' : 
                    generatedDetails.cost === 'Medium' ? 'text-yellow-400' : 
                    'text-green-400'
                  }`}>{generatedDetails.cost}</div>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {displayImageUrl && (
        <div>
          <div className="mb-2 text-sm font-medium text-slate-300">Preview</div>
          <div className="max-h-[600px] overflow-auto rounded-lg border border-white/10">
            <img
              src={displayImageUrl}
              alt="Generated"
              className="w-full"
              onError={(e) => {
                console.error('❌ Inspector 이미지 로드 에러:', displayImageUrl)
                setDisplayImageUrl(undefined)
              }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {data.status === 'processing' ? (
          <button
            onClick={() => cancelNodeExecution(node.id)}
            className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => void runGenImageNode(node.id)}
            className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
          >
            Generate
          </button>
        )}
        {displayImageUrl && (
          <button
            onClick={() => {
              const link = document.createElement('a')
              link.href = displayImageUrl!
              link.download = 'nano-image.png'
              link.click()
            }}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          >
            Download
          </button>
        )}
      </div>
    </div>
  )
}

const MovieSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as MovieNodeData
  const provider = data.provider || 'veo'

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Provider</label>
        <select
          value={provider}
          onChange={(e) => updateNodeData(node.id, { provider: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="veo">🎬 Veo (Google)</option>
          <option value="kling">🎥 Kling</option>
          <option value="sora">🎞️ Sora (OpenAI)</option>
        </select>
      </div>

      {provider === 'veo' && (
        <GeminiVideoSettings node={node} updateNodeData={updateNodeData} movieData={data} />
      )}
      {provider === 'kling' && (
        <KlingVideoSettings node={node} updateNodeData={updateNodeData} movieData={data} />
      )}
      {provider === 'sora' && (
        <SoraVideoSettings node={node} updateNodeData={updateNodeData} movieData={data} />
      )}
    </div>
  )
}

const GeminiVideoSettings = ({ node, updateNodeData, movieData }: any) => {
  const raw = movieData || node.data
  const data = {
    ...raw,
    model: raw.veoModel || raw.model,
    duration: raw.veoDuration || raw.duration,
    motionIntensity: raw.veoMotionIntensity || raw.motionIntensity,
    quality: raw.veoQuality || raw.quality,
  }
  const updateVeo = (patch: any) => {
    const mapped: any = {}
    if ('model' in patch) mapped.veoModel = patch.model
    if ('duration' in patch) mapped.veoDuration = patch.duration
    if ('motionIntensity' in patch) mapped.veoMotionIntensity = patch.motionIntensity
    if ('quality' in patch) mapped.veoQuality = patch.quality
    updateNodeData(node.id, Object.keys(mapped).length > 0 ? mapped : patch)
  }
  const runMovieNode = useFlowStore((state) => state.runMovieNode)
  const cancelNodeExecution = useFlowStore((state) => state.cancelNodeExecution)

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing': return 'Generating...'
      case 'completed': return 'Completed'
      case 'error': return 'Error'
      default: return 'Ready'
    }
  }

  const modelHint =
    data.model === 'veo-3.1-fast-generate-preview'
      ? '3.1 Fast · Speed first'
      : data.model === 'veo-3.1-generate-preview'
        ? '3.1 Preview · Quality first'
        : data.model === 'veo-3.0-fast-generate-001'
          ? '3 Fast · Speed first'
          : data.model === 'veo-3.0-generate-001'
            ? '3 · Standard'
            : '2 · Legacy'

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
        <select
          value={data.model}
          onChange={(e) => updateVeo({ model: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="veo-3.1-generate-preview">Veo 3.1 (Preview)</option>
          <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast (Preview)</option>
          <option value="veo-3.0-generate-001">Veo 3</option>
          <option value="veo-3.0-fast-generate-001">Veo 3 Fast</option>
          <option value="veo-2.0-generate-001">Veo 2</option>
        </select>
        <div className="mt-1 text-xs text-slate-500">{modelHint}</div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Duration</label>
        <select
          value={data.duration}
          onChange={(e) => updateVeo({ duration: Number(e.target.value) })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="5">5 seconds</option>
          <option value="10">10 seconds</option>
        </select>
        <div className="mt-1 text-xs text-slate-500">
          {data.duration === 5 ? '5s · Fast' : '10s · Longer & slower'}
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Quality</label>
        <select
          value={data.quality}
          onChange={(e) => updateVeo({ quality: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="standard">Standard</option>
          <option value="high">High</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Motion Intensity</label>
        <select
          value={data.motionIntensity}
          onChange={(e) => updateVeo({ motionIntensity: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-300">Status</div>
        <div className={`rounded-lg border p-3 text-sm ${
          data.status === 'completed' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
          data.status === 'processing' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
          data.status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
          'border-white/10 bg-white/5 text-slate-400'
        }`}>
          {getStatusText(data.status)}
          {data.status === 'processing' && data.progress > 0 && ` (${data.progress}%)`}
        </div>
      </div>

      {data.error && (
        <div className={`rounded-lg border p-3 text-sm ${
          data.error.includes('할당량') || data.error.includes('quota')
            ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
            : 'border-red-500/30 bg-red-500/10 text-red-400'
        }`}>
          {data.error}
        </div>
      )}

      {data.outputVideoUrl && (
        <div>
          <div className="mb-2 text-sm font-medium text-slate-300">Preview</div>
          <div className="overflow-auto rounded-lg border border-white/10">
            <video
              src={data.outputVideoUrl}
              controls
              className="w-full"
              style={{ maxHeight: '600px' }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {data.status === 'processing' ? (
          <button
            onClick={() => cancelNodeExecution(node.id)}
            className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => void runMovieNode(node.id)}
            className="flex-1 rounded-lg bg-blue-500/20 px-3 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/30"
          >
            Generate
          </button>
        )}
        {data.outputVideoUrl && (
          <button
            onClick={() => {
              const link = document.createElement('a')
              link.href = data.outputVideoUrl!
              link.download = 'movie-veo.mp4'
              link.click()
            }}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          >
            Download
          </button>
        )}
      </div>
    </div>
  )
}

const KlingVideoSettings = ({ node, updateNodeData, movieData }: any) => {
  const raw = movieData || node.data
  const data = {
    ...raw,
    model: raw.klingModel || raw.model,
    duration: raw.klingDuration || raw.duration,
    aspectRatio: raw.klingAspectRatio || raw.aspectRatio,
    enableMotionControl: raw.klingEnableMotionControl ?? raw.enableMotionControl ?? false,
    cameraControl: raw.klingCameraControl || raw.cameraControl || 'none',
    motionValue: raw.klingMotionValue ?? raw.motionValue ?? 0,
    endImageUrl: raw.klingEndImageUrl || raw.endImageUrl,
    endImageDataUrl: raw.klingEndImageDataUrl || raw.endImageDataUrl,
    taskId: raw.klingTaskId || raw.taskId,
  }
  const updateKling = (patch: any) => {
    const mapped: any = {}
    if ('model' in patch) mapped.klingModel = patch.model
    if ('duration' in patch) mapped.klingDuration = patch.duration
    if ('aspectRatio' in patch) mapped.klingAspectRatio = patch.aspectRatio
    if ('enableMotionControl' in patch) mapped.klingEnableMotionControl = patch.enableMotionControl
    if ('cameraControl' in patch) mapped.klingCameraControl = patch.cameraControl
    if ('motionValue' in patch) mapped.klingMotionValue = patch.motionValue
    if ('endImageUrl' in patch) mapped.klingEndImageUrl = patch.endImageUrl
    if ('endImageDataUrl' in patch) mapped.klingEndImageDataUrl = patch.endImageDataUrl
    if ('taskId' in patch) mapped.klingTaskId = patch.taskId
    updateNodeData(node.id, Object.keys(mapped).length > 0 ? mapped : patch)
  }
  const runMovieNode = useFlowStore((state) => state.runMovieNode)
  const cancelNodeExecution = useFlowStore((state) => state.cancelNodeExecution)

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing': return 'Generating...'
      case 'completed': return 'Completed'
      case 'error': return 'Error'
      default: return 'Ready'
    }
  }

  const modelHint =
    data.model === 'kling-v1-5'
      ? 'v1.5 · Stable'
      : data.model === 'kling-v1-6'
        ? 'v1.6 · Recommended'
        : data.model === 'kling-v1-pro'
          ? 'v1 Pro · Enhanced quality'
          : data.model === 'kling-v2-5'
            ? 'v2.5 · Advanced'
            : 'v2.6 · Latest'

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
        <select
          value={data.model}
          onChange={(e) => updateKling({ model: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="kling-v1-5">Kling 1.5</option>
          <option value="kling-v1-6">Kling 1.6 (Recommended)</option>
          <option value="kling-v1-pro">Kling 1.0 Pro</option>
          <option value="kling-v2-5">Kling 2.5</option>
          <option value="kling-v2-6">Kling 2.6 (Latest)</option>
        </select>
        <div className="mt-1 text-xs text-slate-500">{modelHint}</div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Duration</label>
        <select
          value={data.duration}
          onChange={(e) => updateKling({ duration: Number(e.target.value) })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="5">5 seconds</option>
          <option value="10">10 seconds</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Aspect Ratio</label>
        <select
          value={data.aspectRatio}
          onChange={(e) => updateKling({ aspectRatio: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="16:9">16:9 (Landscape)</option>
          <option value="9:16">9:16 (Portrait)</option>
          <option value="1:1">1:1 (Square)</option>
        </select>
      </div>

      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
          <input
            type="checkbox"
            checked={data.enableMotionControl}
            onChange={(e) => updateKling({ enableMotionControl: e.target.checked })}
            className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50"
          />
          Camera Control
        </label>

        {data.enableMotionControl && (
          <div className="mt-2 space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <select
              value={data.cameraControl}
              onChange={(e) => updateKling({ cameraControl: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            >
              <option value="none">None</option>
              <option value="horizontal">Horizontal Move</option>
              <option value="vertical">Vertical Move</option>
              <option value="pan">Pan (L/R Rotate)</option>
              <option value="tilt">Tilt (U/D Rotate)</option>
              <option value="roll">Roll (Screen Rotate)</option>
              <option value="zoom">Zoom</option>
            </select>

            {data.cameraControl !== 'none' && (
              <div>
                <label className="mb-2 block text-xs text-slate-400">Intensity</label>
                <input
                  type="range"
                  min="-10"
                  max="10"
                  value={data.motionValue}
                  onChange={(e) => updateKling({ motionValue: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>-10</span>
                  <span className="text-slate-300">{data.motionValue}</span>
                  <span>+10</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-300">Status</div>
        <div className={`rounded-lg border p-3 text-sm ${
          data.status === 'completed' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
          data.status === 'processing' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
          data.status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
          'border-white/10 bg-white/5 text-slate-400'
        }`}>
          {getStatusText(data.status)}
          {data.status === 'processing' && data.progress > 0 && ` (${data.progress}%)`}
        </div>
      </div>

      {data.error && (
        <div className={`rounded-lg border p-3 text-sm ${
          data.error.includes('할당량') || data.error.includes('quota')
            ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
            : 'border-red-500/30 bg-red-500/10 text-red-400'
        }`}>
          {data.error}
        </div>
      )}

      {data.outputVideoUrl && (
        <div>
          <div className="mb-2 text-sm font-medium text-slate-300">Preview</div>
          <div className="overflow-auto rounded-lg border border-white/10">
            <video
              src={data.outputVideoUrl}
              controls
              className="w-full"
              style={{ maxHeight: '600px' }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {data.status === 'processing' ? (
          <button
            onClick={() => cancelNodeExecution(node.id)}
            className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => void runMovieNode(node.id)}
            className="flex-1 rounded-lg bg-green-500/20 px-3 py-2 text-sm font-medium text-green-400 transition hover:bg-green-500/30"
          >
            Generate
          </button>
        )}
        {data.outputVideoUrl && (
          <button
            onClick={() => {
              const link = document.createElement('a')
              link.href = data.outputVideoUrl!
              link.download = 'movie-kling.mp4'
              link.click()
            }}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          >
            Download
          </button>
        )}
      </div>
    </div>
  )
}

const SoraVideoSettings = ({ node, updateNodeData, movieData }: any) => {
  const raw = movieData || node.data
  const data = {
    ...raw,
    model: raw.soraModel || raw.model,
    duration: raw.soraDuration || raw.duration,
    resolution: raw.soraResolution || raw.resolution,
    videoId: raw.soraVideoId || raw.videoId,
  }
  const updateSora = (patch: any) => {
    const mapped: any = {}
    if ('model' in patch) mapped.soraModel = patch.model
    if ('duration' in patch) mapped.soraDuration = patch.duration
    if ('resolution' in patch) mapped.soraResolution = patch.resolution
    if ('videoId' in patch) mapped.soraVideoId = patch.videoId
    updateNodeData(node.id, Object.keys(mapped).length > 0 ? mapped : patch)
  }
  const runMovieNode = useFlowStore((state) => state.runMovieNode)
  const cancelNodeExecution = useFlowStore((state) => state.cancelNodeExecution)

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing': return 'Generating...'
      case 'completed': return 'Completed'
      case 'error': return 'Error'
      default: return 'Ready'
    }
  }

  const modelHint =
    data.model === 'sora-2'
      ? 'Fast generation'
      : 'High quality'

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
        <select
          value={data.model}
          onChange={(e) => updateSora({ model: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="sora-2">Sora 2 (Fast)</option>
          <option value="sora-2-pro">Sora 2 Pro (High Quality)</option>
        </select>
        <div className="mt-1 text-xs text-slate-500">{modelHint}</div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Duration</label>
        <select
          value={data.duration}
          onChange={(e) => updateSora({ duration: Number(e.target.value) })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="4">4 seconds</option>
          <option value="8">8 seconds</option>
          <option value="12">12 seconds</option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Resolution</label>
        <select
          value={data.resolution}
          onChange={(e) => updateSora({ resolution: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="1280x720">1280x720 (Landscape)</option>
          <option value="720x1280">720x1280 (Portrait)</option>
          <option value="1792x1024">1792x1024 (Wide Landscape)</option>
          <option value="1024x1792">1024x1792 (Tall Portrait)</option>
        </select>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-300">Status</div>
        <div className={`rounded-lg border p-3 text-sm ${
          data.status === 'completed' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
          data.status === 'processing' ? 'border-orange-500/30 bg-orange-500/10 text-orange-400' :
          data.status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
          'border-white/10 bg-white/5 text-slate-400'
        }`}>
          {getStatusText(data.status)}
          {data.status === 'processing' && data.progress > 0 && ` (${data.progress}%)`}
        </div>
      </div>

      {data.error && (
        <div className={`rounded-lg border p-3 text-sm ${
          data.error.includes('할당량') || data.error.includes('quota')
            ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
            : 'border-red-500/30 bg-red-500/10 text-red-400'
        }`}>
          {data.error}
        </div>
      )}

      {data.outputVideoUrl && (
        <div>
          <div className="mb-2 text-sm font-medium text-slate-300">Preview</div>
          <div className="overflow-auto rounded-lg border border-white/10">
            <video
              src={data.outputVideoUrl}
              controls
              className="w-full"
              style={{ maxHeight: '600px' }}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {data.status === 'processing' ? (
          <button
            onClick={() => cancelNodeExecution(node.id)}
            className="flex-1 rounded-lg bg-red-500/20 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/30"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={() => void runMovieNode(node.id)}
            className="flex-1 rounded-lg bg-orange-500/20 px-3 py-2 text-sm font-medium text-orange-400 transition hover:bg-orange-500/30"
          >
            Generate
          </button>
        )}
        {data.outputVideoUrl && (
          <button
            onClick={() => {
              const link = document.createElement('a')
              link.href = data.outputVideoUrl!
              link.download = 'movie-sora.mp4'
              link.click()
            }}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          >
            Download
          </button>
        )}
      </div>
    </div>
  )
}

// Character Setup Settings
const CharacterSetupSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as CharacterSetupNodeData

  const handleSlotChange = (index: number, field: keyof CharacterSetupSlot, value: string) => {
    const newSlots = [...data.slots]
    newSlots[index] = { ...newSlots[index], [field]: value }
    updateNodeData(node.id, { ...data, slots: newSlots })
  }

  const addSlot = () => {
    const newId = `S${data.slots.length + 1}`
    const newSlots = [...data.slots, { id: newId, viewAngle: '', poseType: 'Neutral', note: '' }]
    updateNodeData(node.id, { ...data, slots: newSlots })
  }

  const removeSlot = (index: number) => {
    const newSlots = data.slots.filter((_, i) => i !== index)
    updateNodeData(node.id, { ...data, slots: newSlots })
  }

  const applyPreset = (preset: string) => {
    let newSlots: CharacterSetupSlot[] = []
    
    switch (preset) {
      case 'turnaround-4':
        newSlots = [
          { id: 'S1', viewAngle: 'Front', poseType: 'Neutral', note: 'Full body' },
          { id: 'S2', viewAngle: 'Side', poseType: 'Neutral', note: 'Profile' },
          { id: 'S3', viewAngle: 'Back', poseType: 'Neutral', note: 'From behind' },
          { id: 'S4', viewAngle: '3/4 Front', poseType: 'Neutral', note: 'Dynamic' },
        ]
        break
      case 'head-angles':
        newSlots = [
          { id: 'S1', viewAngle: 'Front Face', poseType: 'Neutral', note: 'Eye level' },
          { id: 'S2', viewAngle: 'Side Face', poseType: 'Neutral', note: 'Profile' },
          { id: 'S3', viewAngle: 'Top View', poseType: 'Neutral', note: 'Looking down' },
          { id: 'S4', viewAngle: 'Bottom View', poseType: 'Neutral', note: 'Looking up' },
        ]
        break
      case 'costume-variations':
        newSlots = [
          { id: 'S1', viewAngle: 'Front', poseType: 'Neutral', note: 'Outfit A' },
          { id: 'S2', viewAngle: 'Front', poseType: 'Neutral', note: 'Outfit B' },
          { id: 'S3', viewAngle: 'Front', poseType: 'Neutral', note: 'Outfit C' },
          { id: 'S4', viewAngle: 'Front', poseType: 'Neutral', note: 'Outfit D' },
        ]
        break
      default:
        return
    }
    
    updateNodeData(node.id, { ...data, slots: newSlots, preset })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Character Identity</label>
        <textarea
          value={data.characterIdentity}
          onChange={(e) => updateNodeData(node.id, { ...data, characterIdentity: e.target.value })}
          className="h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none"
          placeholder="A young wizard with blue robes and glowing staff..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Design Style</label>
        <input
          type="text"
          value={data.designStyle}
          onChange={(e) => updateNodeData(node.id, { ...data, designStyle: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          placeholder="Clean lineart, professional character sheet..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Render Quality</label>
        <input
          type="text"
          value={data.renderQuality}
          onChange={(e) => updateNodeData(node.id, { ...data, renderQuality: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          placeholder="Flat lighting, no shadows, white background..."
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-slate-300">Grid Layout</label>
          <select
            value={data.gridLayout}
            onChange={(e) => {
              const newLayout = e.target.value as GridLayout
              const [rows, cols] = newLayout.split('x').map(Number)
              const requiredSlots = rows * cols
              
              // Adjust slots to match grid size
              let newSlots = [...data.slots]
              if (newSlots.length < requiredSlots) {
                // Add missing slots
                for (let i = newSlots.length; i < requiredSlots; i++) {
                  newSlots.push({
                    id: `S${i + 1}`,
                    viewAngle: '',
                    poseType: 'Neutral',
                    note: ''
                  })
                }
              } else if (newSlots.length > requiredSlots) {
                // Remove extra slots
                newSlots = newSlots.slice(0, requiredSlots)
              }
              
              const validSlotIds = new Set(newSlots.map(s => s.id))
              const cleanedPrompts: { [key: string]: string } = {}
              for (const [k, v] of Object.entries(data.generatedPrompts || {})) {
                if (validSlotIds.has(k)) cleanedPrompts[k] = v
              }
              updateNodeData(node.id, { ...data, gridLayout: newLayout, slots: newSlots, generatedPrompts: cleanedPrompts })
            }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          >
            <option value="1x2">1×2</option>
            <option value="1x3">1×3</option>
            <option value="1x4">1×4</option>
            <option value="1x6">1×6</option>
            <option value="2x2">2×2</option>
            <option value="2x3">2×3</option>
            <option value="3x2">3×2</option>
            <option value="3x3">3×3</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-slate-300">Preset</label>
          <select
            value={data.preset}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50"
          >
            <option value="custom">Custom</option>
            <option value="turnaround-4">Turnaround 4-View</option>
            <option value="head-angles">Head Angles</option>
            <option value="costume-variations">Costume Variations</option>
          </select>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">View Slots ({data.slots.length})</label>
          <button
            onClick={addSlot}
            className="rounded bg-violet-500/20 px-2 py-1 text-xs font-medium text-violet-400 transition hover:bg-violet-500/30"
          >
            + Add
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.slots.map((slot, index) => (
            <div key={slot.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-400">{slot.id}</span>
                <button
                  onClick={() => removeSlot(index)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  value={slot.viewAngle}
                  onChange={(e) => handleSlotChange(index, 'viewAngle', e.target.value)}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none"
                  placeholder="View Angle (e.g., Front, Side, 3/4)"
                />
                <input
                  type="text"
                  value={slot.poseType}
                  onChange={(e) => handleSlotChange(index, 'poseType', e.target.value)}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none"
                  placeholder="Pose Type (e.g., Neutral, Standing)"
                />
                <input
                  type="text"
                  value={slot.note}
                  onChange={(e) => handleSlotChange(index, 'note', e.target.value)}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none"
                  placeholder="Note (e.g., Full body, Close-up)"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-300">Status</div>
        <div className={`rounded-lg border p-3 text-sm ${
          data.status === 'completed' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
          data.status === 'processing' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
          data.status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
          'border-white/10 bg-white/5 text-slate-400'
        }`}>
          {data.status === 'idle' ? 'Ready' : data.status}
        </div>
      </div>

      {data.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {data.error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Prompt Template</label>
        <textarea
          value={data.promptTemplate}
          onChange={(e) => updateNodeData(node.id, { ...data, promptTemplate: e.target.value })}
          className="h-20 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/50 resize-none font-mono"
          placeholder="{characterIdentity}, {viewAngle} view, {poseType} pose..."
        />
        <div className="mt-1 text-[10px] text-slate-500">
          Available variables: {'{characterIdentity}'}, {'{viewAngle}'}, {'{poseType}'}, {'{note}'}, {'{designStyle}'}, {'{renderQuality}'}
        </div>
      </div>

      <button
        onClick={() => {
          // Generate prompts for all slots
          const newPrompts: { [key: string]: string } = {}
          
          data.slots.forEach((slot) => {
            let prompt = data.promptTemplate
            // Replace template variables
            prompt = prompt.replace(/{characterIdentity}/g, data.characterIdentity)
            prompt = prompt.replace(/{viewAngle}/g, slot.viewAngle)
            prompt = prompt.replace(/{poseType}/g, slot.poseType)
            prompt = prompt.replace(/{note}/g, slot.note)
            prompt = prompt.replace(/{designStyle}/g, data.designStyle)
            prompt = prompt.replace(/{renderQuality}/g, data.renderQuality)
            
            // Clean up (remove empty commas, extra spaces)
            prompt = prompt.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
            
            newPrompts[slot.id] = prompt
          })
          
          updateNodeData(node.id, {
            ...data,
            status: 'completed',
            generatedPrompts: newPrompts,
            error: undefined
          })
        }}
        className="w-full rounded-lg bg-violet-500/20 px-3 py-2 text-sm font-medium text-violet-400 transition hover:bg-violet-500/30"
        disabled={!data.characterIdentity}
      >
        ⚡ Generate {data.slots.length} Prompts
      </button>

      {Object.keys(data.generatedPrompts).length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-300">Generated Prompts ({Object.keys(data.generatedPrompts).length})</div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {data.slots.map((slot) => {
              const prompt = data.generatedPrompts[slot.id]
              if (!prompt) return null
              
              return (
                <div key={slot.id} className="rounded-lg border border-violet-400/20 bg-violet-500/5 p-2">
                  <div className="text-[10px] font-semibold text-violet-400 mb-1">{slot.id}: {slot.viewAngle}</div>
                  <div className="text-[10px] text-slate-300 line-clamp-2">{prompt}</div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => {
              updateNodeData(node.id, {
                ...data,
                status: 'idle',
                generatedPrompts: {}
              })
            }}
            className="w-full rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800"
          >
            🔄 Reset Prompts
          </button>
        </div>
      )}
    </div>
  )
}

// Storyboard Settings
const StoryboardSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as StoryboardNodeData

  const handleSlotChange = (index: number, field: keyof StoryboardSlot, value: string) => {
    const newSlots = [...data.slots]
    newSlots[index] = { ...newSlots[index], [field]: value }
    updateNodeData(node.id, { ...data, slots: newSlots })
  }

  const addSlot = () => {
    const newId = `S${data.slots.length + 1}`
    const newSlots = [...data.slots, { id: newId, shotType: '', emotion: '', action: '', lighting: '' }]
    updateNodeData(node.id, { ...data, slots: newSlots })
  }

  const removeSlot = (index: number) => {
    const newSlots = data.slots.filter((_, i) => i !== index)
    updateNodeData(node.id, { ...data, slots: newSlots })
  }

  const applyPreset = (preset: string) => {
    let newSlots: StoryboardSlot[] = []
    
    switch (preset) {
      case 'emotional-arc':
        newSlots = [
          { id: 'S1', shotType: 'Medium', emotion: 'Happy', action: 'Smiling', lighting: 'Bright' },
          { id: 'S2', shotType: 'Close-up', emotion: 'Surprised', action: 'Gasping', lighting: 'Spotlight' },
          { id: 'S3', shotType: 'Medium', emotion: 'Sad', action: 'Looking down', lighting: 'Dim' },
          { id: 'S4', shotType: 'Close-up', emotion: 'Angry', action: 'Clenched fist', lighting: 'Harsh red' },
          { id: 'S5', shotType: 'Wide', emotion: 'Peaceful', action: 'Arms open', lighting: 'Soft golden' },
        ]
        break
      case 'action-sequence':
        newSlots = [
          { id: 'S1', shotType: 'Wide', emotion: 'Determined', action: 'Running', lighting: 'Dynamic' },
          { id: 'S2', shotType: 'Medium', emotion: 'Focused', action: 'Jumping', lighting: 'Motion blur' },
          { id: 'S3', shotType: 'Close-up', emotion: 'Intense', action: 'Landing', lighting: 'Impact flash' },
          { id: 'S4', shotType: 'Low angle', emotion: 'Heroic', action: 'Standing', lighting: 'Backlight' },
          { id: 'S5', shotType: 'Wide', emotion: 'Victorious', action: 'Arms raised', lighting: 'Golden hour' },
        ]
        break
      case 'conversation':
        newSlots = [
          { id: 'S1', shotType: 'Wide', emotion: 'Neutral', action: 'Two people', lighting: 'Even' },
          { id: 'S2', shotType: 'OTS', emotion: 'Speaking', action: 'Character A', lighting: 'Soft' },
          { id: 'S3', shotType: 'Reverse', emotion: 'Listening', action: 'Character B', lighting: 'Soft' },
          { id: 'S4', shotType: 'Close-up', emotion: 'Reacting', action: 'Character A', lighting: 'Close' },
          { id: 'S5', shotType: 'Two-shot', emotion: 'Agreeing', action: 'Both nodding', lighting: 'Warm' },
        ]
        break
      default:
        return
    }
    
    updateNodeData(node.id, { ...data, slots: newSlots, preset })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Character Reference</label>
        <textarea
          value={data.characterReference}
          onChange={(e) => updateNodeData(node.id, { ...data, characterReference: e.target.value })}
          className="h-20 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
          placeholder="Young wizard from previous character sheet..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Scene Setting</label>
        <textarea
          value={data.sceneSetting}
          onChange={(e) => updateNodeData(node.id, { ...data, sceneSetting: e.target.value })}
          className="h-20 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none"
          placeholder="Enchanted forest, twilight, mysterious atmosphere..."
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Style / Mood</label>
        <input
          type="text"
          value={data.styleMood}
          onChange={(e) => updateNodeData(node.id, { ...data, styleMood: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          placeholder="Cinematic, dramatic lighting, storyboard sketch..."
        />
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-slate-300">Grid Layout</label>
          <select
            value={data.gridLayout}
            onChange={(e) => {
              const newLayout = e.target.value as GridLayout
              const [rows, cols] = newLayout.split('x').map(Number)
              const requiredSlots = rows * cols
              
              // Adjust slots to match grid size
              let newSlots = [...data.slots]
              if (newSlots.length < requiredSlots) {
                // Add missing slots
                for (let i = newSlots.length; i < requiredSlots; i++) {
                  newSlots.push({
                    id: `S${i + 1}`,
                    shotType: '',
                    emotion: '',
                    action: '',
                    lighting: ''
                  })
                }
              } else if (newSlots.length > requiredSlots) {
                // Remove extra slots
                newSlots = newSlots.slice(0, requiredSlots)
              }
              
              const validSlotIds = new Set(newSlots.map(s => s.id))
              const cleanedPrompts: { [key: string]: string } = {}
              for (const [k, v] of Object.entries(data.generatedPrompts || {})) {
                if (validSlotIds.has(k)) cleanedPrompts[k] = v
              }
              updateNodeData(node.id, { ...data, gridLayout: newLayout, slots: newSlots, generatedPrompts: cleanedPrompts })
            }}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="1x2">1×2</option>
            <option value="1x3">1×3</option>
            <option value="1x4">1×4</option>
            <option value="1x6">1×6</option>
            <option value="2x2">2×2</option>
            <option value="2x3">2×3</option>
            <option value="3x2">3×2</option>
            <option value="3x3">3×3</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="mb-2 block text-sm font-medium text-slate-300">Preset</label>
          <select
            value={data.preset}
            onChange={(e) => applyPreset(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="custom">Custom</option>
            <option value="emotional-arc">Emotional Arc</option>
            <option value="action-sequence">Action Sequence</option>
            <option value="conversation">Conversation</option>
          </select>
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Shot Slots ({data.slots.length})</label>
          <button
            onClick={addSlot}
            className="rounded bg-cyan-500/20 px-2 py-1 text-xs font-medium text-cyan-400 transition hover:bg-cyan-500/30"
          >
            + Add
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.slots.map((slot, index) => (
            <div key={slot.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-cyan-400">{slot.id}</span>
                <button
                  onClick={() => removeSlot(index)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  value={slot.shotType}
                  onChange={(e) => handleSlotChange(index, 'shotType', e.target.value)}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  placeholder="Shot Type (e.g., Wide, Medium, Close-up)"
                />
                <input
                  type="text"
                  value={slot.emotion}
                  onChange={(e) => handleSlotChange(index, 'emotion', e.target.value)}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  placeholder="Emotion (e.g., Happy, Surprised, Worried)"
                />
                <input
                  type="text"
                  value={slot.action}
                  onChange={(e) => handleSlotChange(index, 'action', e.target.value)}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  placeholder="Action (e.g., Walking, Running, Pointing)"
                />
                <input
                  type="text"
                  value={slot.lighting}
                  onChange={(e) => handleSlotChange(index, 'lighting', e.target.value)}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none"
                  placeholder="Lighting (e.g., Soft, Dramatic, Golden hour)"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-sm font-medium text-slate-300">Status</div>
        <div className={`rounded-lg border p-3 text-sm ${
          data.status === 'completed' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
          data.status === 'processing' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
          data.status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
          'border-white/10 bg-white/5 text-slate-400'
        }`}>
          {data.status === 'idle' ? 'Ready' : data.status}
        </div>
      </div>

      {data.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {data.error}
        </div>
      )}

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Prompt Template</label>
        <textarea
          value={data.promptTemplate}
          onChange={(e) => updateNodeData(node.id, { ...data, promptTemplate: e.target.value })}
          className="h-20 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 resize-none font-mono"
          placeholder="{characterReference}, {sceneSetting}, {shotType} shot..."
        />
        <div className="mt-1 text-[10px] text-slate-500">
          Available variables: {'{characterReference}'}, {'{sceneSetting}'}, {'{shotType}'}, {'{emotion}'}, {'{action}'}, {'{lighting}'}, {'{styleMood}'}
        </div>
      </div>

      <button
        onClick={() => {
          // Generate prompts for all slots
          const newPrompts: { [key: string]: string } = {}
          
          data.slots.forEach((slot) => {
            let prompt = data.promptTemplate
            // Replace template variables
            prompt = prompt.replace(/{characterReference}/g, data.characterReference)
            prompt = prompt.replace(/{sceneSetting}/g, data.sceneSetting)
            prompt = prompt.replace(/{shotType}/g, slot.shotType)
            prompt = prompt.replace(/{emotion}/g, slot.emotion)
            prompt = prompt.replace(/{action}/g, slot.action)
            prompt = prompt.replace(/{lighting}/g, slot.lighting)
            prompt = prompt.replace(/{styleMood}/g, data.styleMood)
            
            // Clean up (remove empty commas, extra spaces)
            prompt = prompt.replace(/,\s*,/g, ',').replace(/\s+/g, ' ').trim()
            
            newPrompts[slot.id] = prompt
          })
          
          updateNodeData(node.id, {
            ...data,
            status: 'completed',
            generatedPrompts: newPrompts,
            error: undefined
          })
        }}
        className="w-full rounded-lg bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-400 transition hover:bg-cyan-500/30"
        disabled={!data.characterReference || !data.sceneSetting}
      >
        ⚡ Generate {data.slots.length} Prompts
      </button>

      {Object.keys(data.generatedPrompts).length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-300">Generated Prompts ({Object.keys(data.generatedPrompts).length})</div>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {data.slots.map((slot) => {
              const prompt = data.generatedPrompts[slot.id]
              if (!prompt) return null
              
              return (
                <div key={slot.id} className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 p-2">
                  <div className="text-[10px] font-semibold text-cyan-400 mb-1">{slot.id}: {slot.shotType} - {slot.emotion}</div>
                  <div className="text-[10px] text-slate-300 line-clamp-2">{prompt}</div>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => {
              updateNodeData(node.id, {
                ...data,
                status: 'idle',
                generatedPrompts: {}
              })
            }}
            className="w-full rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800"
          >
            🔄 Reset Prompts
          </button>
        </div>
      )}
    </div>
  )
}

// Grid Node Settings
const GridNodeSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as GridNodeData
  const store = useFlowStore()
  const { nodes, edges } = store
  
  // Use refs to track current input values without causing re-renders
  const slotsRef = useRef<{ [key: string]: { label: string; metadata: string } }>({})
  
  // Initialize refs with current data
  if (Object.keys(slotsRef.current).length === 0) {
    data.slots.forEach(slot => {
      slotsRef.current[slot.id] = { label: slot.label, metadata: slot.metadata }
    })
  }

  const getCurrentNodeData = () => {
    // Always get fresh data from store
    const currentNode = store.nodes.find(n => n.id === node.id)
    return currentNode?.data as GridNodeData
  }

  const saveSlots = () => {
    // Get latest data from store
    const currentData = getCurrentNodeData()
    if (!currentData) return
    
    // Create new slots array with updated values from refs
    const updatedSlots = currentData.slots.map(slot => ({
      ...slot,
      label: slotsRef.current[slot.id]?.label ?? slot.label,
      metadata: slotsRef.current[slot.id]?.metadata ?? slot.metadata,
    }))
    
    // Update with FULL data object to preserve everything
    updateNodeData(node.id, {
      ...currentData,
      slots: updatedSlots
    })
  }

  const generatePrompts = () => {
    // Save any unsaved slot changes first
    saveSlots()
    
    // Get fresh data after save (Zustand is synchronous)
    const currentData = getCurrentNodeData()
    if (!currentData) return
    
    // Find all connected prompt nodes (including LLM Prompt!)
    const incomingEdges = edges.filter((e) => e.target === node.id)
    const connectedPromptNodes = incomingEdges
      .map((edge) => nodes.find((n) => n.id === edge.source))
      .filter((n) => n && (n.type === 'textPrompt' || n.type === 'motionPrompt' || n.type === 'llmPrompt'))
    
    // Get all prompts and combine them as base
    const allPrompts = connectedPromptNodes
      .map((n) => {
        if (n!.type === 'textPrompt') {
          return (n!.data as TextPromptNodeData).prompt
        } else if (n!.type === 'motionPrompt') {
          return (n!.data as MotionPromptNodeData).combinedPrompt
        } else if (n!.type === 'llmPrompt') {
          // 🎯 LLM Prompt Node의 outputPrompt 사용!
          return (n!.data as any).outputPrompt || ''
        }
        return ''
      })
      .filter(p => p.trim().length > 0)
    
    const basePrompt = allPrompts.join(', ')
    
    console.log(`🔗 [Grid Node] Connected prompt nodes: ${connectedPromptNodes.length}`, connectedPromptNodes.map(n => n!.type))
    
    // 🎨 Generate ONE unified grid prompt (AI creates entire grid in single image!)
    // This is for FAST PREVIEW - not individual high-quality images
    const [rows, cols] = currentData.gridLayout.split('x').map(Number)
    
    // 🔍 Parse slot-specific prompts from base prompt
    // Format: "S1: prompt1\nS2: prompt2\nS3: prompt3" or "S1: prompt1, S2: prompt2"
    const slotSpecificPrompts: { [key: string]: string } = {}
    const parsedCameraParams: { [key: string]: { rotation?: number; tilt?: number; distance?: number } } = {}
    let hasSlotSpecificPrompts = false
    
    // Try to detect slot-specific format
    console.log(`🔍 [Grid Node Debug] Starting prompt parsing...`)
    console.log(`📄 Base prompt length: ${basePrompt?.length || 0} characters`)
    console.log(`📄 Base prompt preview: "${basePrompt?.substring(0, 200) || 'EMPTY'}..."`)
    
    // 🔧 Improved parsing: Split by slot markers first
    if (basePrompt) {
      // Split by slot identifiers (S1:, S2:, etc.)
      const slotMarkers = currentData.slots.map(s => s.id).sort((a, b) => {
        const numA = parseInt(a.replace('S', ''))
        const numB = parseInt(b.replace('S', ''))
        return numA - numB
      })
      
      for (let i = 0; i < slotMarkers.length; i++) {
        const currentSlot = slotMarkers[i]
        const nextSlot = i < slotMarkers.length - 1 ? slotMarkers[i + 1] : null
        
        // Find start position of current slot
        const startPattern = new RegExp(`${currentSlot}\\s*[:\\-]`, 'i')
        const startMatch = basePrompt.match(startPattern)
        
        if (startMatch && startMatch.index !== undefined) {
          const startPos = startMatch.index
          
          // Find end position (start of next slot, or end of string)
          let endPos = basePrompt.length
          if (nextSlot) {
            const endPattern = new RegExp(`${nextSlot}\\s*[:\\-]`, 'i')
            const endMatch = basePrompt.substring(startPos + 1).match(endPattern)
            if (endMatch && endMatch.index !== undefined) {
              endPos = startPos + 1 + endMatch.index
            }
          }
          
          // Extract slot content (remove the "S1:" prefix)
          let slotContent = basePrompt.substring(startPos, endPos).trim()
          // Remove the slot marker prefix (S1:, S2:, etc.)
          slotContent = slotContent.replace(new RegExp(`^${currentSlot}\\s*[:\\-]\\s*`, 'i'), '').trim()
          
          if (slotContent.length > 0) {
            // 🛡️ Prevent duplicates - only add if not already present
            if (slotSpecificPrompts[currentSlot]) {
              console.warn(`⚠️ DUPLICATE DETECTED: ${currentSlot} already exists! Skipping...`)
              console.log(`   Existing length: ${slotSpecificPrompts[currentSlot].length}`)
              console.log(`   New length: ${slotContent.length}`)
            } else {
              slotSpecificPrompts[currentSlot] = slotContent
              hasSlotSpecificPrompts = true
              console.log(`✅ Found slot: ${currentSlot}, prompt length: ${slotContent.length}`)
              console.log(`   Preview: "${slotContent.substring(0, 80)}..."`)
            }
          }
        }
      }
    }
    
    // Legacy regex fallback (if improved parsing didn't work)
    if (!hasSlotSpecificPrompts) {
      const slotPattern = /S(\d+)\s*:\s*([^\n,]+(?:[^\n]*(?=S\d+:|$)))/gi
      let match
      
      while ((match = slotPattern.exec(basePrompt)) !== null) {
        const slotNum = parseInt(match[1])
        const slotId = `S${slotNum}`
        const slotPrompt = match[2].trim()
        
        console.log(`✅ Found slot (regex): ${slotId}, prompt length: ${slotPrompt.length}`)
        
        if (currentData.slots.some(s => s.id === slotId)) {
          slotSpecificPrompts[slotId] = slotPrompt
          hasSlotSpecificPrompts = true
        }
      }
    }
    
    // Keep old parsing for camera params
    for (const [slotId, slotPrompt] of Object.entries(slotSpecificPrompts)) {
      if (currentData.slots.some(s => s.id === slotId)) {
        hasSlotSpecificPrompts = true
        
        // 🎥 Auto-parse camera parameters from prompt content
        const parsed = parseCameraFromPrompt(slotPrompt)
        parsedCameraParams[slotId] = parsed
        
        // 🔍 Debug: Show parsed camera info
        if (parsed.rotation !== undefined || parsed.tilt !== undefined || parsed.distance !== undefined) {
          console.log(`🎥 Auto-parsed camera for ${slotId}:`, parsed, `from prompt: "${slotPrompt.substring(0, 80)}..."`)
        } else {
          console.log(`⚠️ No camera keywords found in ${slotId}: "${slotPrompt.substring(0, 80)}..."`)
        }
      }
    }
    
    console.log(`🔍 [Grid Node Debug] Parsing complete. Found ${Object.keys(slotSpecificPrompts).length} slot-specific prompts.`)
    console.log(`🎥 [Grid Node Debug] Auto-parsed camera for ${Object.keys(parsedCameraParams).length} slots.`)
    
    // 🎥 Camera parameter parser function
    function parseCameraFromPrompt(promptText: string): { rotation?: number; tilt?: number; distance?: number } {
      const lower = promptText.toLowerCase()
      const params: { rotation?: number; tilt?: number; distance?: number } = {}
      
      // Distance/Framing detection
      if (lower.includes('extreme close-up') || lower.includes('extreme close up') || lower.includes('ecu')) {
        params.distance = 0.4
      } else if (lower.includes('close-up') || lower.includes('close up') || lower.includes('closeup') || lower.includes('tight shot')) {
        params.distance = 0.6
      } else if (lower.includes('medium close-up') || lower.includes('medium close up') || lower.includes('mcu')) {
        params.distance = 0.8
      } else if (lower.includes('medium shot') || lower.includes('medium wide') || lower.includes('mid shot') || lower.includes('waist up') || lower.includes('waist-up')) {
        params.distance = 1.0
      } else if (lower.includes('wide shot') || lower.includes('wide-angle') || lower.includes('wide angle') || lower.includes('establishing') || lower.includes('full body') || lower.includes('full-body')) {
        params.distance = 2.0
      } else if (lower.includes('extreme wide') || lower.includes('very wide') || lower.includes('ews') || lower.includes('panoramic')) {
        params.distance = 2.5
      }
      
      // Tilt detection (vertical angle)
      if (lower.includes('low-angle') || lower.includes('low angle')) {
        // Extract specific degree if mentioned
        const degreeMatch = lower.match(/low[- ]angle[^\d]*(\d+)(?:°|degrees?)/i)
        params.tilt = degreeMatch ? -parseInt(degreeMatch[1]) : -30
      } else if (lower.includes('high-angle') || lower.includes('high angle') || lower.includes('overhead')) {
        const degreeMatch = lower.match(/high[- ]angle[^\d]*(\d+)(?:°|degrees?)/i)
        params.tilt = degreeMatch ? parseInt(degreeMatch[1]) : 30
      } else if (lower.includes('bird\'s eye') || lower.includes('birds eye') || lower.includes('top-down') || lower.includes('top down')) {
        params.tilt = 60
      } else if (lower.includes('eye-level') || lower.includes('eye level')) {
        params.tilt = 0
      }
      
      // Rotation detection (horizontal angle)
      if (lower.includes('front view') || lower.includes('frontal') || lower.includes('facing camera')) {
        params.rotation = 0
      } else if (lower.includes('left side profile') || lower.includes('left profile')) {
        params.rotation = 90
      } else if (lower.includes('right side profile') || lower.includes('right profile')) {
        params.rotation = 270
      } else if (lower.includes('back view') || lower.includes('rear view') || lower.includes('from behind')) {
        params.rotation = 180
      } else if (lower.includes('three-quarter left') || lower.includes('three quarter left') || lower.includes('3/4 left')) {
        params.rotation = 45
      } else if (lower.includes('three-quarter right') || lower.includes('three quarter right') || lower.includes('3/4 right')) {
        params.rotation = 315
      } else if (lower.includes('over-the-shoulder') || lower.includes('over the shoulder') || lower.includes('ots')) {
        params.rotation = 135 // typical OTS angle
      }
      
      return params
    }
    
    // 📝 If slot-specific prompts detected, use them; otherwise use base prompt for all
    const getSlotPrompt = (slotId: string) => {
      if (hasSlotSpecificPrompts && slotSpecificPrompts[slotId]) {
        return slotSpecificPrompts[slotId]
      }
      return basePrompt
    }
    
    // Build unified grid prompt
    let unifiedPrompt = hasSlotSpecificPrompts ? '' : basePrompt
    
    if (basePrompt) unifiedPrompt += '\n\n'
    
    // 🎬 Grid Layout Instructions
    unifiedPrompt += `🎨 CREATE A ${currentData.mode === 'character' ? 'CHARACTER REFERENCE' : 'CINEMATIC SEQUENCE'} GRID:
Layout: ${rows}x${cols} grid (${rows} rows, ${cols} columns)
Purpose: ${currentData.mode === 'character' ? 'Fast preview of multiple camera angles' : 'Fast preview of cinematic story sequence'} in ONE image

📐 GRID REQUIREMENTS:
- Generate ONE single image containing the ENTIRE grid layout
- ${currentData.mode === 'character' ? 'Same subject/character appears in ALL cells' : 'Sequential cinematic frames showing story progression'}
- ${currentData.mode === 'character' ? 'Each cell shows a different camera angle/view' : 'Each cell shows the next moment in the story timeline'}
- Clear visual borders between cells
- Consistent ${currentData.mode === 'character' ? 'lighting and style' : 'cinematic quality and visual style'} across all cells
- ${currentData.mode === 'character' ? 'Professional character sheet format' : 'Professional film production quality'}

🎬 VISUAL QUALITY REQUIREMENTS:
- NOT a sketch or storyboard drawing - create FULLY RENDERED images
- Photorealistic, high-resolution rendering (match reference image quality if provided)
- Professional cinematic photography quality
- Movie production grade visual fidelity
- Detailed textures, accurate lighting, natural depth of field
- ${currentData.mode === 'character' ? 'Character design sheet quality' : 'Film frame quality - not concept art'}

`
    
    // 🎥 Cell Specifications
    unifiedPrompt += `🎥 CELL SPECIFICATIONS:\n`
    
    currentData.slots.forEach((slot, index) => {
      const rotation = slot.cameraRotation ?? 0
      const tilt = slot.cameraTilt ?? 0
      const distance = slot.cameraDistance ?? 1.0
      const normalizedRotation = Math.round(((rotation % 360) + 360) % 360)
      
      // Calculate grid position
      const row = Math.floor(index / cols) + 1
      const col = (index % cols) + 1
      
      // 🎯 Get slot-specific prompt if available
      const slotPrompt = getSlotPrompt(slot.id)
      
      let cellDescription = `\n${slot.id} (Row ${row}, Col ${col}): `
      
      // Add slot-specific content if parsed
      if (hasSlotSpecificPrompts && slotPrompt) {
        cellDescription += slotPrompt
        
        // Add camera info if available
        if (slot.cameraRotation !== undefined) {
          cellDescription += ' | Camera: '
          
          if (normalizedRotation === 0 || normalizedRotation === 360) {
            cellDescription += 'Front view'
          } else if (normalizedRotation === 90) {
            cellDescription += 'Left side profile'
          } else if (normalizedRotation >= 165 && normalizedRotation <= 195) {
            cellDescription += 'Back view'
          } else if (normalizedRotation === 270) {
            cellDescription += 'Right side profile'
          } else {
            cellDescription += `${normalizedRotation}° angle`
          }
          
          if (tilt > 0) {
            cellDescription += `, high-angle (+${Math.round(tilt)}°)`
          } else if (tilt < 0) {
            cellDescription += `, low-angle (${Math.round(tilt)}°)`
          }
          
          if (distance > 1.5) {
            cellDescription += ', wide shot'
          } else if (distance < 0.7) {
            cellDescription += ', close-up'
          }
        }
      } else {
        // Original logic: camera-based description
        if (slot.cameraRotation !== undefined) {
          // Use detailed camera specifications
          let shotType = ''
          
          if (normalizedRotation === 0 || normalizedRotation === 360) {
            shotType = 'Front view - straight-on frontal shot'
          } else if (normalizedRotation === 90) {
            shotType = 'Left side profile - perpendicular side view'
          } else if (normalizedRotation >= 165 && normalizedRotation <= 195) {
            shotType = 'Back view - rear view facing away'
          } else if (normalizedRotation === 270) {
            shotType = 'Right side profile - perpendicular side view'
          } else if (normalizedRotation > 0 && normalizedRotation < 90) {
            shotType = `Three-quarter left view (${normalizedRotation}°)`
          } else if (normalizedRotation > 90 && normalizedRotation < 180) {
            shotType = `Three-quarter back-left (${normalizedRotation}°)`
          } else if (normalizedRotation > 180 && normalizedRotation < 270) {
            shotType = `Three-quarter back-right (${normalizedRotation}°)`
          } else {
            shotType = `Three-quarter right view (${normalizedRotation}°)`
          }
          
          cellDescription += shotType
          
          // Add tilt info
          if (tilt > 0) {
            cellDescription += `, high-angle (+${Math.round(tilt)}°)`
          } else if (tilt < 0) {
            cellDescription += `, low-angle (${Math.round(tilt)}°)`
          }
          
          // Add distance info
          if (distance > 1.5) {
            cellDescription += ', wide shot'
          } else if (distance < 0.7) {
            cellDescription += ', close-up'
          }
          
          if (slot.metadata) {
            cellDescription += ` - ${slot.metadata}`
          }
        } else {
          // Fallback: use label/metadata only
          cellDescription += slot.label || 'View'
          if (slot.metadata) {
            cellDescription += ` - ${slot.metadata}`
          }
        }
      }
      
      unifiedPrompt += cellDescription
    })
    
    // ⚠️ Critical Instructions (mode-specific)
    unifiedPrompt += `

⚠️ CRITICAL REQUIREMENTS:
- This is ONE image with EXACTLY ${currentData.slots.length} cells (NOT 9, NOT 3x3)
- Grid layout: EXACTLY ${rows} rows × ${cols} columns (${rows}x${cols})
- Total cells: ${currentData.slots.length} cells ONLY
- Include visible borders/separations between cells
- Professional ${currentData.mode === 'character' ? 'character reference sheet' : 'storyboard panel'} style
- All cells should have consistent rendering quality and lighting direction
- Do NOT generate separate images - create ONE grid image!
- Do NOT create a 3x3 grid - use ${rows}x${cols} layout!
`

    if (currentData.mode === 'character') {
      unifiedPrompt += `
🎭 CHARACTER MODE REQUIREMENTS:
- Each cell shows the SAME character from different camera angles/views
- Maintain PERFECT character consistency across ALL cells:
  → Same face, hairstyle, body proportions
  → Same outfit, colors, accessories
  → Same age and physical features
- Subject remains in same pose/stance (only camera angle changes)
- Static character reference - NO story progression
- Focus: Multi-angle character design reference`
    } else {
      unifiedPrompt += `
🎬 STORYBOARD MODE REQUIREMENTS:
- Each cell shows a SEQUENTIAL moment in time (story progression)
- Cells are arranged in CHRONOLOGICAL order (left-to-right, top-to-bottom)
- Same character(s) but DIFFERENT actions/poses/expressions per cell
- Show story development:
  → Opening/establishing → Action → Reaction → Resolution
  → Build tension and emotion across sequence
  → Clear beginning, middle, end
- Maintain character consistency BUT allow:
  → Different poses and body language
  → Changing emotions and expressions
  → Movement and action between frames
  → Environmental changes if story requires
- Focus: Narrative flow and cinematic storytelling
- Think like a film director planning shots

⚠️ CRITICAL: DO NOT CREATE SKETCH-STYLE STORYBOARDS!
- This is NOT rough concept art or pencil sketches
- Generate FULLY RENDERED, PHOTOREALISTIC frames
- Each cell should look like an actual MOVIE SCREENSHOT
- Same visual quality as the reference image provided
- Professional VFX/CGI film production quality
- If you were given a high-quality reference image, MATCH that quality level`
    }
    
    // Store the unified prompt in ALL slots (since Grid Node outputs go to one Gen Image)
    const newPrompts: { [key: string]: string } = {}
    currentData.slots.forEach((slot) => {
      newPrompts[slot.id] = unifiedPrompt
    })
    
    // 🎥 Apply parsed camera parameters to slots (if detected from prompts)
    console.log(`🎥 [Camera Application] Starting camera parameter application...`)
    console.log(`🎥 [Camera Application] Total slots: ${currentData.slots.length}`)
    console.log(`🎥 [Camera Application] Parsed camera params available for:`, Object.keys(parsedCameraParams))
    
    const updatedSlots = currentData.slots.map((slot) => {
      const parsedParams = parsedCameraParams[slot.id]
      const existingCamera = { rotation: slot.cameraRotation, tilt: slot.cameraTilt, distance: slot.cameraDistance }
      
      console.log(`🎥 [${slot.id}] Existing camera:`, existingCamera)
      console.log(`🎥 [${slot.id}] Parsed params:`, parsedParams || 'none')
      
      if (parsedParams && Object.keys(parsedParams).length > 0) {
        const newCamera = {
          rotation: parsedParams.rotation !== undefined ? parsedParams.rotation : (slot.cameraRotation ?? 0),
          tilt: parsedParams.tilt !== undefined ? parsedParams.tilt : (slot.cameraTilt ?? 0),
          distance: parsedParams.distance !== undefined ? parsedParams.distance : (slot.cameraDistance ?? 1.0),
        }
        console.log(`🎥 [${slot.id}] ✅ Applying parsed camera:`, newCamera)
        // Merge parsed params with existing slot data (parsed params override preset)
        return {
          ...slot,
          cameraRotation: newCamera.rotation,
          cameraTilt: newCamera.tilt,
          cameraDistance: newCamera.distance,
        }
      }
      // If no parsed params, ensure slot has default camera values
      const defaultCamera = {
        rotation: slot.cameraRotation ?? 0,
        tilt: slot.cameraTilt ?? 0,
        distance: slot.cameraDistance ?? 1.0,
      }
      console.log(`🎥 [${slot.id}] ⚠️ No parsed params, using existing/default:`, defaultCamera)
      return {
        ...slot,
        cameraRotation: defaultCamera.rotation,
        cameraTilt: defaultCamera.tilt,
        cameraDistance: defaultCamera.distance,
      }
    })
    
    console.log(`🎥 [Camera Application] Complete! Updated ${updatedSlots.length} slots.`)
    
    // Update with FULL data to preserve everything
    updateNodeData(node.id, {
      ...currentData,
      status: 'completed',
      generatedPrompts: newPrompts,
      slots: updatedSlots  // Apply parsed camera parameters
    })
  }


  // Get presets for current mode
  const availablePresets = data.mode === 'character' ? getCharacterPresets() : getStoryboardPresets()

  const applyPresetTemplate = (preset: GridPreset) => {
    const currentData = getCurrentNodeData()
    if (!currentData) return
    
    // 🔍 Check if ANY prompt node is connected (LLM or Text)
    const hasPromptConnection = edges.some((e) => {
      if (e.target !== node.id) return false
      const sourceNode = nodes.find((n) => n.id === e.source)
      return sourceNode?.type === 'llmPrompt' || sourceNode?.type === 'textPrompt'
    })
    
    if (hasPromptConnection) {
      // 🎥 CAMERA-ONLY MODE: Preserve existing slots, only update camera values
      const updatedSlots = currentData.slots.map((existingSlot) => {
        const presetSlot = preset.slots.find(ps => ps.id === existingSlot.id)
        if (presetSlot) {
          return {
            id: existingSlot.id,
            label: '',  // Clear label to preserve LLM prompts
            metadata: '',  // Clear metadata to preserve LLM prompts
            cameraRotation: presetSlot.cameraRotation,
            cameraTilt: presetSlot.cameraTilt,
            cameraDistance: presetSlot.cameraDistance,
          }
        }
        return existingSlot
      })
      
      // Update refs
      slotsRef.current = {}
      updatedSlots.forEach(slot => {
        slotsRef.current[slot.id] = { label: '', metadata: '' }
      })
      
      // Apply camera-only update
      updateNodeData(node.id, {
        ...currentData,
        mode: preset.mode,
        gridLayout: preset.gridLayout,
        slots: updatedSlots,
        currentPreset: preset.type,
        // Keep generated prompts!
      })
      
      console.log(`🎬 Preset applied (Prompt connected: Yes - Camera only, LLM prompts preserved)`)
    } else {
      // 🎨 FULL MODE: Apply complete preset including labels
      const presetData = applyPreset(preset, false)
      
      // Update refs with new slots
      slotsRef.current = {}
      presetData.slots.forEach(slot => {
        slotsRef.current[slot.id] = { label: slot.label, metadata: slot.metadata }
      })
      
      // Apply full preset
      updateNodeData(node.id, {
        ...currentData,
        ...presetData,
      })
      
      console.log(`🎬 Preset applied (No prompt connected: Full preset applied)`)
    }
  }

  return (
    <div className="space-y-4">
      {/* Mode Display */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Mode</label>
        <div className="text-sm text-slate-400">
          {data.mode === 'character' ? '🎨 Character Setup' : '🎬 Storyboard'}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          Change mode by clicking the toggle in the node
        </div>
      </div>

      {/* 📐 Preset Templates */}
      <div className="rounded-lg border border-blue-400/30 bg-blue-500/5 p-3">
        <label className="mb-3 block text-sm font-semibold text-blue-300">
          📐 Quick Presets
        </label>
        
        {/* Warning: No Camera Parameters */}
        {data.slots.some(slot => slot.cameraRotation === undefined) && (
          <div className="mb-3 rounded-lg border border-yellow-400/30 bg-yellow-500/10 p-2.5 text-xs">
            <div className="mb-1 font-semibold text-yellow-400">⚠️ 구버전 노드 감지</div>
            <div className="text-yellow-300/80 mb-2">
              이 노드에는 정밀 카메라 제어가 없습니다.
            </div>
            <div className="text-[10px] text-yellow-300/60">
              💡 아래 프리셋을 클릭하면 Motion Prompt 수준의 정밀 각도 제어가 추가됩니다!
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {availablePresets.map((preset) => (
            <button
              key={preset.type}
              onClick={() => applyPresetTemplate(preset)}
              className={`w-full rounded-lg border p-3 text-left transition-all ${
                data.currentPreset === preset.type
                  ? 'border-blue-400/50 bg-blue-500/20 shadow-md'
                  : 'border-white/10 bg-white/5 hover:border-blue-400/30 hover:bg-blue-500/10'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-200">
                  {preset.name}
                </span>
                <span className="rounded bg-slate-700 px-2 py-0.5 text-[10px] font-mono text-slate-300">
                  {preset.gridLayout}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {preset.description}
              </div>
              {data.currentPreset === preset.type && (
                <div className="mt-1.5 text-[10px] font-semibold text-blue-400">
                  ✓ Active
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Layout */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Grid Layout</label>
        <select
          value={data.gridLayout}
          onChange={(e) => {
            const newLayout = e.target.value as GridLayout
            const [rows, cols] = newLayout.split('x').map(Number)
            const requiredSlots = rows * cols
            
            let newSlots = [...data.slots]
            if (newSlots.length < requiredSlots) {
              for (let i = newSlots.length; i < requiredSlots; i++) {
                newSlots.push({
                  id: `S${i + 1}`,
                  label: '',
                  metadata: '',
                  // 🎥 Add default camera parameters to prevent "구버전 노드" warning
                  cameraRotation: 0,    // Front view
                  cameraTilt: 0,        // Eye-level
                  cameraDistance: 1.0   // Medium shot
                })
              }
            } else if (newSlots.length > requiredSlots) {
              newSlots = newSlots.slice(0, requiredSlots)
            }
            
            updateNodeData(node.id, { gridLayout: newLayout, slots: newSlots } as any)
          }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="1x2">1×2</option>
          <option value="1x3">1×3</option>
          <option value="1x4">1×4</option>
          <option value="1x6">1×6</option>
          <option value="2x2">2×2</option>
          <option value="2x3">2×3</option>
          <option value="3x2">3×2</option>
          <option value="3x3">3×3</option>
        </select>
      </div>

      {/* Slots */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Slots ({data.slots.length})
        </label>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {data.slots.map((slot) => (
            <div key={slot.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
              <div className="mb-1 flex items-center justify-between">
                <div className="text-xs font-semibold text-blue-400">{slot.id}</div>
                {/* 🎥 Camera Parameters Indicator */}
                {slot.cameraRotation !== undefined ? (
                  <div className="flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    🎥 {slot.cameraRotation}°
                    {slot.cameraTilt !== undefined && slot.cameraTilt !== 0 && ` ${slot.cameraTilt > 0 ? '+' : ''}${slot.cameraTilt}°`}
                    {slot.cameraDistance !== undefined && slot.cameraDistance !== 1.0 && ` ${slot.cameraDistance}x`}
                  </div>
                ) : (
                  <div className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                    ⚠️ No Camera
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <input
                  type="text"
                  defaultValue={slot.label}
                  onChange={(e) => {
                    slotsRef.current[slot.id] = {
                      ...slotsRef.current[slot.id],
                      label: e.target.value
                    }
                  }}
                  onBlur={saveSlots}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none"
                  placeholder={data.mode === 'character' ? 'e.g., Front, Side, 3/4' : 'e.g., Wide, Medium, Close-up'}
                />
                <input
                  type="text"
                  defaultValue={slot.metadata}
                  onChange={(e) => {
                    slotsRef.current[slot.id] = {
                      ...slotsRef.current[slot.id],
                      metadata: e.target.value
                    }
                  }}
                  onBlur={saveSlots}
                  className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none"
                  placeholder="Additional info..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connected Prompts */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">
          Connected Prompt Nodes
        </label>
        <div className="text-xs text-slate-400">
          {edges.filter((e) => e.target === node.id).length} prompt node(s) connected
        </div>
        
        {/* 🎯 Slot-Specific Prompt Detection */}
        {(() => {
          const incomingEdges = edges.filter((e) => e.target === node.id)
          const connectedPromptNodes = incomingEdges
            .map((edge) => nodes.find((n) => n.id === edge.source))
            .filter((n) => n && (n.type === 'textPrompt' || n.type === 'motionPrompt' || n.type === 'llmPrompt'))
          
          const allPrompts = connectedPromptNodes
            .map((n) => {
              if (n!.type === 'textPrompt') {
                return (n!.data as TextPromptNodeData).prompt
              } else if (n!.type === 'motionPrompt') {
                return (n!.data as MotionPromptNodeData).combinedPrompt
              } else if (n!.type === 'llmPrompt') {
                return (n!.data as any).outputPrompt || ''
              }
              return ''
            })
            .filter(p => p.trim().length > 0)
          
          const combinedPrompt = allPrompts.join(', ')
          const slotPattern = /S(\d+)\s*:/gi
          const matches = combinedPrompt.match(slotPattern)
          
          // 🐛 Debug: Show prompt preview
          const promptPreview = combinedPrompt.substring(0, 200) + (combinedPrompt.length > 200 ? '...' : '')
          
          if (matches && matches.length > 0) {
            // Check if camera parameters will be parsed
            let cameraParseCount = 0
            const testPattern = /S(\d+)\s*:\s*([^\n,]+(?:[^\n]*(?=S\d+:|$)))/gi
            let testMatch
            while ((testMatch = testPattern.exec(combinedPrompt)) !== null) {
              const testPrompt = testMatch[2].toLowerCase()
              if (testPrompt.includes('close-up') || testPrompt.includes('wide') || 
                  testPrompt.includes('low-angle') || testPrompt.includes('high-angle') ||
                  testPrompt.includes('front view') || testPrompt.includes('side profile')) {
                cameraParseCount++
              }
            }
            
            return (
              <div className="mt-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2">
                <div className="flex items-center gap-2 text-xs text-emerald-400">
                  <span className="font-semibold">🎯 Slot-Specific Prompts Detected!</span>
                </div>
                <div className="mt-1 text-[10px] text-emerald-300/80">
                  {matches.length} slot{matches.length > 1 ? 's' : ''} found: {matches.join(', ')}
                </div>
                {cameraParseCount > 0 && (
                  <div className="mt-1 text-[10px] text-blue-300/80">
                    🎥 {cameraParseCount} slot{cameraParseCount > 1 ? 's' : ''} with auto-detected camera info
                  </div>
                )}
                <div className="mt-1 text-[9px] text-emerald-300/60">
                  💡 Each cell will use its specific prompt {cameraParseCount > 0 ? '+ parsed camera parameters' : 'automatically'}
                </div>
              </div>
            )
          }
          
          // No slot-specific prompts detected - show debug info
          if (combinedPrompt.length > 0) {
            return (
              <div className="mt-2 rounded-lg border border-orange-400/30 bg-orange-500/10 p-2">
                <div className="flex items-center gap-2 text-xs text-orange-400">
                  <span className="font-semibold">⚠️ No Slot-Specific Prompts Detected</span>
                </div>
                <div className="mt-1 text-[10px] text-orange-300/80">
                  Looking for format: S1:, S2:, S3:, etc.
                </div>
                <div className="mt-2 rounded border border-orange-400/20 bg-black/20 p-2">
                  <div className="text-[9px] text-slate-400 mb-1">Prompt preview:</div>
                  <div className="text-[9px] text-slate-300 font-mono break-words">
                    {promptPreview}
                  </div>
                </div>
                <div className="mt-2 text-[9px] text-orange-300/70">
                  💡 Tip: Use LLM with "Grid Storyboard" mode, or manually format as:<br/>
                  <code className="bg-black/30 px-1 rounded">S1: [description], S2: [description]...</code>
                </div>
              </div>
            )
          }
          
          return null
        })()}
      </div>

      {/* Generate Prompts Button */}
      <button
        onClick={generatePrompts}
        className="w-full rounded-lg bg-blue-500/20 px-3 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/30"
        disabled={data.status === 'processing'}
      >
        ⚡ Generate {data.slots.length} Prompts
      </button>

      {/* Generated Prompts Preview */}
      {Object.keys(data.generatedPrompts).length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-300">
            Generated Unified Prompt
          </div>
          
          {/* 🎯 Show only first slot's prompt (they're all the same unified prompt) */}
          <div className="max-h-64 overflow-y-auto rounded border border-blue-400/20 bg-blue-500/5 p-3">
            <div className="text-[10px] text-slate-300 whitespace-pre-wrap font-mono">
              {data.generatedPrompts[data.slots[0]?.id] || 'No prompt generated'}
            </div>
          </div>
          
          {/* 📊 Show individual cell specs extracted from unified prompt */}
          <details className="rounded border border-blue-400/20 bg-blue-500/5">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-blue-400 hover:bg-blue-500/10">
              📋 Individual Cell Specifications ({data.slots.length})
            </summary>
            <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
              {data.slots.map((slot) => {
                // Extract this slot's specification from the unified prompt
                const fullPrompt = data.generatedPrompts[slot.id] || ''
                const slotPattern = new RegExp(`${slot.id}\\s*\\([^)]+\\):\\s*([^\\n]+(?:[^\\n]*(?=${data.slots.find(s => data.slots.indexOf(s) === data.slots.indexOf(slot) + 1)?.id}|$)))`, 's')
                const match = fullPrompt.match(slotPattern)
                const slotSpec = match ? match[1].trim() : `${slot.label} - ${slot.metadata}`
                
                return (
                  <div key={slot.id} className="rounded border border-blue-400/10 bg-blue-500/5 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-[10px] font-semibold text-blue-400">{slot.id}</div>
                      {slot.cameraRotation !== undefined && (
                        <div className="text-[9px] text-emerald-400">
                          🎥 {slot.cameraRotation}° {slot.cameraTilt !== 0 && `${slot.cameraTilt > 0 ? '+' : ''}${slot.cameraTilt}°`} {slot.cameraDistance}x
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-300 line-clamp-3">{slotSpec}</div>
                  </div>
                )
              })}
            </div>
          </details>
          
          <div className="text-xs text-slate-500 bg-slate-900/50 border border-white/10 rounded p-2">
            💡 <strong>통합 프롬프트</strong>가 생성되었습니다. Grid Node → Gen Image 연결 시 <strong>한 번에 {data.slots.length}개 셀 그리드</strong>를 생성합니다.
          </div>
          
          <button
            onClick={() => {
              const currentData = getCurrentNodeData()
              if (!currentData) return
              updateNodeData(node.id, {
                ...currentData,
                status: 'idle',
                generatedPrompts: {}
              })
            }}
            className="w-full rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800"
          >
            🔄 Reset Prompts
          </button>
        </div>
      )}
    </div>
  )
}

// Cell Regenerator Node Settings
const CellRegeneratorSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as CellRegeneratorNodeData
  const store = useFlowStore()
  const { nodes, edges, apiKey } = store

  // Find connected Grid Node
  const connectedGridEdge = edges.find(
    (e) => e.target === node.id && e.targetHandle === 'grid-layout'
  )
  const connectedGridNode = connectedGridEdge
    ? nodes.find((n) => n.id === connectedGridEdge.source && n.type === 'gridNode')
    : null

  // Find connected Image
  const connectedImageEdge = edges.find(
    (e) => e.target === node.id && e.targetHandle === 'grid-image'
  )
  const connectedImageNode = connectedImageEdge
    ? nodes.find((n) => n.id === connectedImageEdge.source)
    : null

  // Sync grid layout info from connected Grid Node
  React.useEffect(() => {
    console.log('🔍 Cell Regenerator useEffect: Checking grid connection')
    if (connectedGridNode) {
      const gridData = connectedGridNode.data as GridNodeData
      console.log('📐 Cell Regenerator: Connected Grid Node found')
      console.log('  - Grid Layout:', gridData.gridLayout)
      console.log('  - Slots count:', gridData.slots?.length)
      console.log('  - Current data.gridLayout:', data.gridLayout)
      console.log('  - Current data.slots:', data.slots)
      
      if (
        data.gridLayout !== gridData.gridLayout ||
        JSON.stringify(data.slots) !== JSON.stringify(gridData.slots)
      ) {
        console.log('✅ Cell Regenerator: Updating grid layout and slots')
        updateNodeData(node.id, {
          gridLayout: gridData.gridLayout,
          slots: gridData.slots,
        } as any)
      } else {
        console.log('ℹ️ Cell Regenerator: Grid layout already synced')
      }
    } else {
      console.log('⚠️ Cell Regenerator: No Grid Node connected to grid-layout handle')
    }
  }, [connectedGridNode, node.id, updateNodeData, data.gridLayout, data.slots])

  // Sync image from connected Image Node
  React.useEffect(() => {
    if (connectedImageNode) {
      let imageUrl: string | undefined
      let imageDataUrl: string | undefined

      if (connectedImageNode.type === 'genImage') {
        const nanoData = connectedImageNode.data as GenImageNodeData
        imageUrl = nanoData.outputImageUrl
        imageDataUrl = nanoData.outputImageDataUrl
      } else if (connectedImageNode.type === 'imageImport') {
        const importData = connectedImageNode.data as ImageImportNodeData
        imageUrl = importData.imageUrl
        imageDataUrl = importData.imageDataUrl
      } else if (connectedImageNode.type === 'gridComposer') {
        const composerData = connectedImageNode.data as GridComposerNodeData
        imageUrl = composerData.composedImageUrl
        imageDataUrl = composerData.composedImageDataUrl
      }

      if (
        data.inputImageUrl !== imageUrl ||
        data.inputImageDataUrl !== imageDataUrl
      ) {
        updateNodeData(node.id, {
          inputImageUrl: imageUrl,
          inputImageDataUrl: imageDataUrl,
        } as any)
      }
    }
  }, [connectedImageNode, node.id, updateNodeData, data.inputImageUrl, data.inputImageDataUrl])

  const regenerateCells = async () => {
    console.log('🎬 Cell Regenerator: regenerateCells() called - delegating to flowStore')
    // Delegate to flowStore for centralized logic
    await store.runCellRegeneratorNode(node.id)
  }

  const downloadImage = (slotId: string, label: string) => {
    const imageUrl = data.regeneratedImages[slotId]
    if (!imageUrl) return

    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `${slotId}-${label}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="space-y-2">
        <div className={`rounded border px-3 py-2 text-xs ${
          connectedGridNode 
            ? 'border-blue-400/20 bg-blue-500/5 text-blue-400' 
            : 'border-yellow-400/20 bg-yellow-500/5 text-yellow-400'
        }`}>
          {connectedGridNode 
            ? `✓ Grid: ${data.gridLayout} (${data.slots?.length} slots)` 
            : '⚠ Grid Node를 연결하세요'}
        </div>
        <div className={`rounded border px-3 py-2 text-xs ${
          connectedImageNode && (data.inputImageUrl || data.inputImageDataUrl)
            ? 'border-emerald-400/20 bg-emerald-500/5 text-emerald-400' 
            : 'border-yellow-400/20 bg-yellow-500/5 text-yellow-400'
        }`}>
          {connectedImageNode && (data.inputImageUrl || data.inputImageDataUrl)
            ? '✓ Labeled grid image connected' 
            : '⚠ 라벨된 그리드 이미지를 연결하세요'}
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded border border-purple-400/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-300">
        💡 이 노드는 그리드 이미지를 개별 셀로 분리합니다. 각 셀은 Gen Image와 연결하여 고화질로 재생성할 수 있습니다.
      </div>

      {/* Model Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(node.id, { model: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="gemini-3-pro-image-preview">Gemini 3 Pro (Recommended)</option>
          <option value="gemini-2.5-flash-image">Gemini 2.5 Flash (Fast)</option>
        </select>
      </div>

      {/* Resolution Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Resolution</label>
        <select
          value={data.resolution}
          onChange={(e) => updateNodeData(node.id, { resolution: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="1K">1K (Fast)</option>
          <option value="2K">2K (Balanced)</option>
          <option value="4K">4K (High Quality)</option>
        </select>
      </div>

      {/* Aspect Ratio Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Aspect Ratio</label>
        <select
          value={data.aspectRatio}
          onChange={(e) => updateNodeData(node.id, { aspectRatio: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="1:1">1:1 (Square)</option>
          <option value="16:9">16:9 (Landscape)</option>
          <option value="9:16">9:16 (Portrait)</option>
          <option value="4:3">4:3 (Classic)</option>
          <option value="3:4">3:4 (Classic Portrait)</option>
        </select>
      </div>

      {/* Slot Selection */}
      {data.slots && data.slots.length > 0 && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Extract Cells</label>
            <button
              onClick={() => {
                const allSelected = (data.selectedSlots || []).length === data.slots!.length
                updateNodeData(node.id, {
                  selectedSlots: allSelected ? [] : data.slots!.map((s: any) => s.id),
                } as any)
              }}
              className="text-[10px] text-purple-400 hover:text-purple-300 transition"
            >
              {(data.selectedSlots || []).length === data.slots.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {data.slots.map((slot: any) => {
              const isSelected = (data.selectedSlots || []).includes(slot.id)
              return (
                <button
                  key={slot.id}
                  onClick={() => {
                    const current = data.selectedSlots || []
                    const updated = isSelected
                      ? current.filter((id: string) => id !== slot.id)
                      : [...current, slot.id]
                    updateNodeData(node.id, { selectedSlots: updated } as any)
                  }}
                  className={`rounded border px-2 py-1.5 text-[10px] font-medium transition ${
                    isSelected
                      ? 'border-purple-400/50 bg-purple-500/20 text-purple-300'
                      : 'border-white/10 bg-white/5 text-slate-500 hover:border-white/20'
                  }`}
                >
                  {slot.id}
                </button>
              )
            })}
          </div>
          <div className="mt-1 text-[10px] text-slate-500">
            {(data.selectedSlots || []).length === 0
              ? '선택 없음 = 전체 추출'
              : `${(data.selectedSlots || []).length}개 셀 선택됨`}
          </div>
        </div>
      )}

      {/* Storage Alert for users */}
      <div className="rounded border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[10px] text-amber-200">
        ⚠️ <b>저장 공간 부족 경고</b>가 뜬다면 설정에서 <b>[저장소 정리]</b>를 먼저 실행해주세요.
      </div>

      {/* Extract Button */}
      <button
        onClick={regenerateCells}
        disabled={
          data.status === 'processing' ||
          !data.gridLayout ||
          !data.slots ||
          (!data.inputImageUrl && !data.inputImageDataUrl)
        }
        className="w-full rounded-lg bg-purple-500/20 px-3 py-2 text-sm font-medium text-purple-400 transition hover:bg-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {data.status === 'processing' ? (
          <span>⏳ Extracting...</span>
        ) : (
          <span>✂️ Extract {(data.selectedSlots || []).length > 0 ? (data.selectedSlots || []).length : data.slots?.length || 0} Cells</span>
        )}
      </button>

      {/* Extracted Images Preview */}
      {Object.keys(data.regeneratedImages).length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-emerald-400">
            ✅ {Object.keys(data.regeneratedImages).length} Cells Extracted
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {data.slots?.map((slot) => {
              const imageUrl = data.regeneratedImages[slot.id]
              if (!imageUrl) return null

              return (
                <div key={slot.id} className="group relative rounded border border-white/10 bg-slate-800 p-2">
                  <div className="mb-1 text-[10px] font-semibold text-purple-400">
                    {slot.id}
                  </div>
                  <img
                    src={imageUrl}
                    alt={slot.id}
                    className="w-full rounded border border-white/10"
                  />
                  <button
                    onClick={() => downloadImage(slot.id, slot.id)}
                    className="absolute right-2 top-2 rounded bg-black/60 p-1.5 text-white opacity-0 transition hover:bg-black/80 group-hover:opacity-100"
                    title="Download"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                  </button>
                </div>
              )
            })}
          </div>
          <button
            onClick={() => {
              updateNodeData(node.id, {
                status: 'idle',
                regeneratedImages: {},
              } as any)
            }}
            className="w-full rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800"
          >
            🔄 Reset
          </button>
        </div>
      )}
    </div>
  )
}

// Grid Composer Node Settings
const GridComposerSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as GridComposerNodeData
  const store = useFlowStore()
  const { nodes, edges } = store

  // Find connected Grid Node
  const connectedGridEdge = edges.find(
    (e) => e.target === node.id && e.targetHandle === 'grid-layout'
  )
  const connectedGridNode = connectedGridEdge
    ? nodes.find((n) => n.id === connectedGridEdge.source && n.type === 'gridNode')
    : null

  // Sync grid layout info from connected Grid Node
  React.useEffect(() => {
    if (connectedGridNode) {
      const gridData = connectedGridNode.data as GridNodeData
      if (
        data.gridLayout !== gridData.gridLayout ||
        JSON.stringify(data.slots) !== JSON.stringify(gridData.slots)
      ) {
        updateNodeData(node.id, {
          gridLayout: gridData.gridLayout,
          slots: gridData.slots,
        } as any)
      }
    }
  }, [connectedGridNode, node.id, updateNodeData, data.gridLayout, data.slots])

  // Sync images from connected nodes
  React.useEffect(() => {
    if (!data.slots) return

    const newInputImages: { [key: string]: string } = {}

    data.slots.forEach((slot) => {
      // Find edge connected to this slot's input handle
      const slotEdge = edges.find(
        (e) => e.target === node.id && e.targetHandle === `input-${slot.id}`
      )
      
      if (slotEdge) {
        const sourceNode = nodes.find((n) => n.id === slotEdge.source)
        
        if (sourceNode) {
          let imageUrl: string | undefined

          if (sourceNode.type === 'genImage') {
            const nanoData = sourceNode.data as GenImageNodeData
            imageUrl = nanoData.outputImageUrl || nanoData.outputImageDataUrl
          } else if (sourceNode.type === 'imageImport') {
            const importData = sourceNode.data as ImageImportNodeData
            imageUrl = importData.imageUrl || importData.imageDataUrl
          } else if (sourceNode.type === 'cellRegenerator') {
            const cellData = sourceNode.data as CellRegeneratorNodeData
            // Extract slot ID from source handle
            const sourceHandle = slotEdge.sourceHandle
            if (sourceHandle) {
              imageUrl = cellData.regeneratedImages[sourceHandle]
            }
          }

          if (imageUrl) {
            newInputImages[slot.id] = imageUrl
          }
        }
      }
    })

    // Only update if changed
    if (JSON.stringify(newInputImages) !== JSON.stringify(data.inputImages)) {
      updateNodeData(node.id, {
        inputImages: newInputImages,
      } as any)
    }
  }, [edges, nodes, data.slots, node.id, updateNodeData, data.inputImages])

  const composeGrid = async () => {
    if (!data.gridLayout || !data.slots || data.slots.length === 0) {
      updateNodeData(node.id, {
        error: 'Grid Node를 연결하세요!',
      } as any)
      return
    }

    const inputCount = Object.keys(data.inputImages).length
    if (inputCount !== data.slots.length) {
      updateNodeData(node.id, {
        error: `모든 슬롯에 이미지를 연결하세요! (${inputCount}/${data.slots.length})`,
      } as any)
      return
    }

    updateNodeData(node.id, {
      status: 'processing',
      error: undefined,
    } as any)

    try {
      const [rows, cols] = data.gridLayout.split('x').map(Number)

      // Load all images
      const imageElements: { [key: string]: HTMLImageElement } = {}
      
      for (const slot of data.slots) {
        let imageUrl = data.inputImages[slot.id]
        if (!imageUrl) continue

        // 🔧 idb: 또는 s3: 참조를 실제 DataURL로 변환
        if (imageUrl.startsWith('idb:') || imageUrl.startsWith('s3:')) {
          try {
            const resolvedUrl = await getImage(imageUrl)
            if (!resolvedUrl) {
              throw new Error(`이미지를 로드할 수 없습니다: ${slot.id}`)
            }
            imageUrl = resolvedUrl
          } catch (error) {
            console.error(`❌ 이미지 로드 실패 (${slot.id}):`, error)
            throw new Error(`이미지를 로드할 수 없습니다: ${slot.id}`)
          }
        }

        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = reject
          img.src = imageUrl
        })

        imageElements[slot.id] = img
      }

      // 🎯 각 이미지를 여백 없이 꽉 채우기: 공통 높이, 각 비율 유지
      
      // 목표 높이 설정 (모든 이미지의 높이를 동일하게)
      const targetHeight = 1024
      
      // 각 슬롯별로 개별 셀 크기 계산 (높이는 동일, 너비는 비율에 따라)
      const cellSizes: { [slotId: string]: { width: number; height: number } } = {}
      
      for (const slot of data.slots) {
        const img = imageElements[slot.id]
        if (img) {
          const aspectRatio = img.width / img.height
          const adjustedWidth = Math.round(targetHeight * aspectRatio)
          
          cellSizes[slot.id] = {
            width: adjustedWidth,
            height: targetHeight
          }
        }
      }
      
      // 공통 높이 (모든 셀이 동일)
      const cellHeight = targetHeight

      // 🎨 라벨 바 높이 계산 (라벨을 표시하는 경우)
      const labelBarHeight = data.showLabels ? data.labelSize + 16 : 0  // 텍스트 크기 + 패딩
      const actualCellHeight = cellHeight + labelBarHeight  // 이미지 + 라벨 바

      // Calculate grid dimensions
      const borderWidth = data.showBorders ? data.borderWidth : 0
      const padding = data.cellPadding
      
      // 각 셀의 너비 합계 계산
      const totalCellWidth = data.slots.reduce((sum, slot) => {
        return sum + (cellSizes[slot.id]?.width || 0)
      }, 0)
      
      const totalWidth = totalCellWidth + (cols + 1) * borderWidth + 2 * padding
      const totalHeight = rows * actualCellHeight + (rows + 1) * borderWidth + 2 * padding

      // Create canvas
      const canvas = document.createElement('canvas')
      canvas.width = totalWidth
      canvas.height = totalHeight
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Canvas context를 생성할 수 없습니다')
      }

      // Fill background
      ctx.fillStyle = data.backgroundColor
      ctx.fillRect(0, 0, totalWidth, totalHeight)

      // Draw grid
      let currentX = padding + borderWidth  // 누적 X 위치
      
      for (let i = 0; i < data.slots.length; i++) {
        const slot = data.slots[i]
        const row = Math.floor(i / cols)
        const col = i % cols
        const img = imageElements[slot.id]

        if (!img) continue

        // 이 셀의 개별 크기
        const cellWidth = cellSizes[slot.id]?.width || targetHeight
        
        // Calculate position
        const x = currentX
        const y = padding + row * (actualCellHeight + borderWidth) + borderWidth

        // Draw cell background (if borders) - 전체 셀 높이 포함
        if (data.showBorders) {
          ctx.fillStyle = data.borderColor
          ctx.fillRect(
            x - borderWidth,
            y - borderWidth,
            cellWidth + 2 * borderWidth,
            actualCellHeight + 2 * borderWidth
          )
        }

        // 각 이미지를 여백 없이 꽉 채움 (비율 유지)
        ctx.drawImage(img, x, y, cellWidth, cellHeight)
        
        // 다음 셀의 X 위치 업데이트
        currentX += cellWidth + borderWidth

        // 🎨 이미지 아래에 라벨 바 그리기
        if (data.showLabels) {
          // 검은색 라벨 바
          const labelBarY = y + cellHeight
          ctx.fillStyle = '#000000'
          ctx.fillRect(x, labelBarY, cellWidth, labelBarHeight)
          
          // 흰색 텍스트
          ctx.font = `bold ${data.labelSize}px Arial`
          ctx.fillStyle = '#ffffff'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          
          const text = slot.id
          const textX = x + cellWidth / 2
          const textY = labelBarY + labelBarHeight / 2

          ctx.fillText(text, textX, textY)
          
          // 텍스트 정렬 리셋
          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'
        }
      }

      // Convert to data URL
      const composedDataUrl = canvas.toDataURL('image/png')

      // 🔥 IndexedDB에 저장 (localStorage 용량 절약)
      const imageId = `grid-composed-${node.id}-${Date.now()}`
      console.log('💾 Grid Composer: IndexedDB/S3에 저장 시작...', imageId)
      
      const savedRef = await saveImage(imageId, composedDataUrl, node.id, false)
      console.log('✅ Grid Composer: 저장 완료', savedRef)

      updateNodeData(node.id, {
        status: 'completed',
        composedImageDataUrl: savedRef,  // idb:abc-123 형태
        composedImageUrl: savedRef,
      } as any)
    } catch (error: any) {
      updateNodeData(node.id, {
        status: 'error',
        error: error.message || '그리드 합성에 실패했습니다',
      } as any)
    }
  }

  const downloadComposedImage = () => {
    const imageUrl = data.composedImageUrl || data.composedImageDataUrl
    if (!imageUrl) return

    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `grid-${data.gridLayout}-composed.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const inputCount = Object.keys(data.inputImages).length

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="space-y-2">
        <div className={`rounded border px-3 py-2 text-xs ${
          connectedGridNode 
            ? 'border-blue-400/20 bg-blue-500/5 text-blue-400' 
            : 'border-yellow-400/20 bg-yellow-500/5 text-yellow-400'
        }`}>
          {connectedGridNode 
            ? `✓ Grid: ${data.gridLayout} (${data.slots?.length} slots)` 
            : '⚠ Grid Node를 연결하세요'}
        </div>
        <div className={`rounded border px-3 py-2 text-xs ${
          inputCount === data.slots?.length
            ? 'border-emerald-400/20 bg-emerald-500/5 text-emerald-400' 
            : 'border-yellow-400/20 bg-yellow-500/5 text-yellow-400'
        }`}>
          {inputCount === data.slots?.length
            ? `✓ All images connected (${inputCount}/${data.slots?.length})` 
            : `⚠ Connect all images (${inputCount}/${data.slots?.length})`}
        </div>
      </div>

      {/* Label Options */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
          <input
            type="checkbox"
            checked={data.showLabels}
            onChange={(e) =>
              updateNodeData(node.id, { showLabels: e.target.checked } as any)
            }
            className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
          />
          Show Labels
        </label>
        {data.showLabels && (
          <div className="ml-6 space-y-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Label Size</label>
              <input
                type="number"
                value={data.labelSize}
                onChange={(e) =>
                  updateNodeData(node.id, { labelSize: parseInt(e.target.value) } as any)
                }
                min="12"
                max="48"
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Label Color</label>
              <input
                type="color"
                value={data.labelColor}
                onChange={(e) =>
                  updateNodeData(node.id, { labelColor: e.target.value } as any)
                }
                className="h-8 w-full rounded border border-slate-600 bg-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Border Options */}
      <div>
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-300">
          <input
            type="checkbox"
            checked={data.showBorders}
            onChange={(e) =>
              updateNodeData(node.id, { showBorders: e.target.checked } as any)
            }
            className="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500"
          />
          Show Borders
        </label>
        {data.showBorders && (
          <div className="ml-6 space-y-2">
            <div>
              <label className="mb-1 block text-xs text-slate-400">Border Width</label>
              <input
                type="number"
                value={data.borderWidth}
                onChange={(e) =>
                  updateNodeData(node.id, { borderWidth: parseInt(e.target.value) } as any)
                }
                min="1"
                max="20"
                className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Border Color</label>
              <input
                type="color"
                value={data.borderColor}
                onChange={(e) =>
                  updateNodeData(node.id, { borderColor: e.target.value } as any)
                }
                className="h-8 w-full rounded border border-slate-600 bg-slate-800"
              />
            </div>
          </div>
        )}
      </div>

      {/* Background & Padding */}
      <div className="space-y-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Background Color</label>
          <input
            type="color"
            value={data.backgroundColor}
            onChange={(e) =>
              updateNodeData(node.id, { backgroundColor: e.target.value } as any)
            }
            className="h-8 w-full rounded border border-slate-600 bg-slate-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Padding</label>
          <input
            type="number"
            value={data.cellPadding}
            onChange={(e) =>
              updateNodeData(node.id, { cellPadding: parseInt(e.target.value) } as any)
            }
            min="0"
            max="50"
            className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200"
          />
        </div>
      </div>

      {/* Aspect Ratio Mode */}
      <div className="space-y-2">
        <label className="mb-1 block text-xs text-slate-400">이미지 맞춤 방식</label>
        <select
          value={data.aspectRatioMode}
          onChange={(e) =>
            updateNodeData(node.id, { aspectRatioMode: e.target.value } as any)
          }
          className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200"
        >
          <option value="contain">📐 Contain (비율 유지 + 여백)</option>
          <option value="cover">🖼️ Cover (비율 유지 + 채우기)</option>
          <option value="stretch">↔️ Stretch (늘리기)</option>
        </select>
        <div className="text-[10px] text-slate-500">
          {data.aspectRatioMode === 'contain' && '이미지 비율을 유지하며 셀 안에 맞춤. 빈 공간은 배경색으로 채워집니다.'}
          {data.aspectRatioMode === 'cover' && '이미지 비율을 유지하며 셀을 꽉 채움. 넘치는 부분은 잘립니다.'}
          {data.aspectRatioMode === 'stretch' && '이미지를 셀 크기에 맞춰 강제로 늘립니다. (비율 무시)'}
        </div>
      </div>

      {/* Info Box */}
      <div className="rounded border border-emerald-400/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-300">
        💡 각 슬롯에 이미지를 연결한 후 Compose 버튼을 누르면 정확한 그리드를 생성합니다.
      </div>

      {/* Compose Button */}
      <button
        onClick={composeGrid}
        disabled={
          data.status === 'processing' ||
          !data.gridLayout ||
          !data.slots ||
          inputCount !== data.slots.length
        }
        className="w-full rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {data.status === 'processing' ? (
          <span>⏳ Composing...</span>
        ) : (
          <span>✨ Compose Grid ({inputCount}/{data.slots?.length || 0})</span>
        )}
      </button>

      {/* Composed Image Preview & Download */}
      {(data.composedImageUrl || data.composedImageDataUrl) && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-emerald-400">
            ✅ Grid Composed!
          </div>
          <div className="relative group">
            <img
              src={data.composedImageUrl || data.composedImageDataUrl}
              alt="Composed Grid"
              className="w-full rounded border border-emerald-400/30"
            />
          </div>
          <button
            onClick={downloadComposedImage}
            className="w-full rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/30"
          >
            📥 Download Grid
          </button>
          <button
            onClick={() => {
              updateNodeData(node.id, {
                status: 'idle',
                composedImageUrl: undefined,
                composedImageDataUrl: undefined,
              } as any)
            }}
            className="w-full rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800"
          >
            🔄 Reset
          </button>
        </div>
      )}
    </div>
  )
}

// LLM Prompt Helper Settings
const LLMPromptSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as any  // LLMPromptNodeData
  const runLLMPromptNode = useFlowStore((state: any) => state.runLLMPromptNode)
  const edges = useFlowStore((state) => state.edges)
  const [displayReferenceImage, setDisplayReferenceImage] = useState<string | undefined>(undefined)
  
  // Load reference image from IndexedDB/S3 if needed
  useEffect(() => {
    const loadReferenceImage = async () => {
      const imageRef = data.referenceImageDataUrl || data.referenceImageUrl
      
      if (!imageRef) {
        setDisplayReferenceImage(undefined)
        return
      }

      // If it's an idb: or s3: reference, fetch the actual image
      if (typeof imageRef === 'string' && (imageRef.startsWith('idb:') || imageRef.startsWith('s3:'))) {
        try {
          const dataURL = await getImage(imageRef)
          if (dataURL) {
            setDisplayReferenceImage(dataURL)
          } else {
            console.warn('⚠️ LLM Inspector: Failed to load reference image:', imageRef)
            setDisplayReferenceImage(undefined)
          }
        } catch (error) {
          console.error('❌ LLM Inspector: Error loading reference image:', error)
          setDisplayReferenceImage(undefined)
        }
      } else {
        // Direct data URL or regular URL
        setDisplayReferenceImage(imageRef)
      }
    }

    loadReferenceImage()
  }, [data.referenceImageUrl, data.referenceImageDataUrl])
  
  // Check if there's a prompt or image connection
  const hasBasePromptConnection = edges.some((e) => e.target === node.id && e.targetHandle === 'basePrompt')
  const hasMotionPromptConnection = edges.some((e) => e.target === node.id && e.targetHandle === 'motionPrompt')
  const hasLegacyPromptConnection = edges.some((e) => e.target === node.id && e.targetHandle === 'prompt')
  const hasAnyPromptConnection = hasBasePromptConnection || hasMotionPromptConnection || hasLegacyPromptConnection
  const hasImageConnection = edges.some((e) => e.target === node.id && e.targetHandle === 'image')
  
  // Button should be enabled if:
  // - For image modes (describe, analyze): image connection required
  // - For text modes: prompt connection OR inputPrompt OR image connection
  const canGenerate = 
    (data.mode === 'describe' || data.mode === 'analyze') 
      ? hasImageConnection 
      : (hasAnyPromptConnection || data.inputPrompt?.trim() || hasImageConnection)

  const handleGenerate = async () => {
    // Validation is now handled in runLLMPromptNode
    await runLLMPromptNode(node.id)
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="space-y-2">
        {/* Base Prompt Connection */}
        <div className={`rounded-lg border px-3 py-2 ${
          hasBasePromptConnection 
            ? 'border-green-400/30 bg-green-500/5' 
            : 'border-violet-400/20 bg-violet-500/5'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-violet-400">📝 기본 프롬프트</div>
            {hasBasePromptConnection && (
              <div className="text-[9px] text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                연결됨
              </div>
            )}
          </div>
          {!hasBasePromptConnection && (
            <div className="text-[11px] text-slate-400">
              Text Prompt 노드를 상단 (보라) 핸들에 연결 (선택)
            </div>
          )}
        </div>
        
        {/* Motion Prompt Connection */}
        <div className={`rounded-lg border px-3 py-2 ${
          hasMotionPromptConnection 
            ? 'border-green-400/30 bg-green-500/5' 
            : 'border-fuchsia-400/20 bg-fuchsia-500/5'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-fuchsia-400">🎬 모션 프롬프트</div>
            {hasMotionPromptConnection && (
              <div className="text-[9px] text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                연결됨
              </div>
            )}
          </div>
          {!hasMotionPromptConnection && (
            <div className="text-[11px] text-slate-400">
              Motion Prompt 노드를 중간 (분홍) 핸들에 연결 (선택)
            </div>
          )}
          {hasMotionPromptConnection && data.mode === 'cameraInterpreter' && (
            <div className="mt-2 pt-2 border-t border-fuchsia-400/20">
              <div className="text-[9px] text-green-400">✨ 카메라 수치를 시각적 설명으로 변환합니다</div>
            </div>
          )}
        </div>
        
        {/* Internal Input Preview */}
        {data.inputPrompt && (
          <div className="rounded-lg border border-pink-400/20 bg-pink-500/5 px-3 py-2">
            <div className="text-[9px] text-slate-400 mb-1">내부 입력 프롬프트:</div>
            <div className="text-[10px] text-slate-300 line-clamp-3 bg-black/20 rounded p-2">
              {data.inputPrompt}
            </div>
          </div>
        )}
        
        {/* Image Connection */}
        <div className={`rounded-lg border px-3 py-2 ${
          hasImageConnection 
            ? 'border-green-400/30 bg-green-500/5' 
            : 'border-cyan-400/20 bg-cyan-500/5'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-cyan-400">🖼️ 이미지 입력 (선택)</div>
            {hasImageConnection && (
              <div className="text-[9px] text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                연결됨
              </div>
            )}
          </div>
          {!hasImageConnection && (
            <div className="text-[11px] text-slate-400">
              이미지 노드를 하단 (하늘) 핸들에 연결 (선택사항)
            </div>
          )}
        </div>
      </div>

      {/* Provider Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">🤖 LLM Provider</label>
        <select
          value={data.provider || 'gemini'}
          onChange={(e) => {
            const newProvider = e.target.value as 'gemini' | 'openai'
            const defaultModel = newProvider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o'
            updateNodeData(node.id, { provider: newProvider, model: defaultModel } as any)
          }}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        >
          <option value="gemini">🔵 Gemini (Google)</option>
          <option value="openai">🟢 OpenAI (GPT)</option>
        </select>
      </div>

      {/* Model Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">🧠 Model</label>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(node.id, { model: e.target.value } as any)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        >
          {(data.provider === 'gemini' || !data.provider) && (
            <>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash (빠름, 권장)</option>
              <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash Lite (가장 빠름)</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (가장 강력)</option>
            </>
          )}
          {data.provider === 'openai' && (
            <>
              <option value="gpt-4o">GPT-4o (Vision, 최신, 권장) ⭐</option>
              <option value="gpt-4o-mini">GPT-4o-mini (Vision, 빠름, 저렴)</option>
              <option value="gpt-4-turbo">GPT-4 Turbo (강력)</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (가장 저렴)</option>
            </>
          )}
        </select>
      </div>

      {/* Mode Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">처리 모드</label>
        <select
          value={data.mode}
          onChange={(e) => updateNodeData(node.id, { mode: e.target.value } as any)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        >
          <optgroup label="프롬프트 작업 (이미지 자동 참고)">
            <option value="expand">📝 확장 - 간단한 아이디어를 상세 프롬프트로</option>
            <option value="improve">✨ 개선 - 기존 프롬프트를 더 효과적으로</option>
            <option value="translate">🌐 번역 - 한국어 ↔ 영어</option>
            <option value="simplify">🎯 간결화 - 핵심만 간단하게</option>
          </optgroup>
          <optgroup label="특수 작업">
            <option value="cameraInterpreter">🎬 카메라 지시 해석 - 수치를 시각적 설명으로 변환 ⭐</option>
            <option value="gridStoryboard">🎬 Grid Storyboard - S1:, S2: 형식으로 다중 패널 생성 ⭐</option>
          </optgroup>
          <optgroup label="이미지 전용 분석">
            <option value="describe">🖼️ 이미지 설명 - 이미지를 프롬프트로 변환</option>
            <option value="analyze">🔍 이미지 분석 - 상세한 이미지 분석 프롬프트</option>
          </optgroup>
        </select>
        <div className="mt-2 rounded-lg border border-pink-400/20 bg-pink-500/5 p-2 text-[11px] text-pink-300">
          {data.mode === 'cameraInterpreter' ? (
            <>🎬 <strong>카메라 해석 모드:</strong> Motion Prompt의 수치를 이미지 생성에 최적화된 상세한 시각적 설명으로 변환합니다!</>
          ) : data.mode === 'gridStoryboard' ? (
            <>🎬 <strong>Grid Storyboard 모드:</strong> S1:, S2: 형식으로 다중 패널 스토리보드 생성! Grid Node가 자동으로 파싱하고, 프롬프트 내용에서 카메라 정보도 자동 추출됩니다! ⭐</>
          ) : (
            <>💡 <strong>멀티모달 지원:</strong> 프롬프트 작업 모드는 이미지가 연결되면 자동으로 참고합니다!</>
          )}
        </div>
      </div>
      
      {/* Reference Image Info */}
      {(data.referenceImageUrl || data.referenceImageDataUrl) && (
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400">🖼️ 참고 이미지 연결됨</span>
          </div>
          {displayReferenceImage ? (
            <div className="mt-2 rounded overflow-hidden">
              <img
                src={displayReferenceImage}
                alt="Reference"
                className="w-full"
                onError={(e) => {
                  console.error('❌ LLM Inspector: Image display error')
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          ) : (
            <div className="mt-2 rounded border border-cyan-400/20 bg-cyan-500/5 px-2 py-3 text-center">
              <div className="text-[10px] text-cyan-400">이미지 로딩 중...</div>
            </div>
          )}
        </div>
      )}

      {/* Style Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">출력 스타일</label>
        <select
          value={data.style}
          onChange={(e) => updateNodeData(node.id, { style: e.target.value } as any)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        >
          <option value="detailed">상세 - 풍부한 디테일</option>
          <option value="concise">간결 - 핵심만 간단하게</option>
          <option value="creative">창의적 - 독특하고 예술적</option>
          <option value="professional">전문적 - 정확하고 기술적</option>
        </select>
      </div>

      {/* Language Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">출력 언어</label>
        <select
          value={data.language}
          onChange={(e) => updateNodeData(node.id, { language: e.target.value } as any)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        >
          <option value="auto">자동 감지</option>
          <option value="ko">한국어</option>
          <option value="en">영어</option>
        </select>
      </div>

      {/* Target Use */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">용도</label>
        <select
          value={data.targetUse}
          onChange={(e) => updateNodeData(node.id, { targetUse: e.target.value } as any)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        >
          <option value="image">이미지 생성</option>
          <option value="video">비디오 생성</option>
          <option value="general">일반</option>
        </select>
      </div>

      {/* Reference Mode (Grid Composer 연결시) */}
      {hasImageConnection && edges.some(e => {
        const sourceNode = useFlowStore.getState().nodes.find(n => n.id === e.source)
        return e.target === node.id && e.targetHandle === 'image' && sourceNode?.type === 'gridComposer'
      }) && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300">🎯 참조 정확도 (Gen Image 생성용)</label>
          <select
            value={data.referenceMode || 'exact'}
            onChange={(e) => updateNodeData(node.id, { referenceMode: e.target.value } as any)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
          >
            <option value="creative">🎨 창의성 - 텍스트 프롬프트 위주</option>
            <option value="balanced">⚖️ 균형 - 텍스트와 이미지 균형</option>
            <option value="exact">🎯 정확성 - 참조 이미지 PIXEL-LEVEL 복제 (권장)</option>
          </select>
          <div className="mt-2 rounded-lg border border-pink-400/20 bg-pink-500/5 p-2 text-[11px] text-pink-300">
            {data.referenceMode === 'creative' && '💡 참조 이미지는 영감으로만 사용. 텍스트 설명을 기반으로 창의적으로 생성합니다.'}
            {data.referenceMode === 'balanced' && '💡 텍스트와 이미지를 균형있게 참고하여 생성합니다.'}
            {(!data.referenceMode || data.referenceMode === 'exact') && '💡 참조 이미지의 색상, 재질, 디자인을 정확히 복제합니다. (프로 작업 권장)'}
          </div>
        </div>
      )}

      {/* Model Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">LLM 모델</label>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(node.id, { model: e.target.value } as any)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        >
          <option value="gemini-2.5-flash">Gemini 2.5 Flash (추천)</option>
          <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite (빠름)</option>
          <option value="gemini-2.5-pro">Gemini 2.5 Pro (고급)</option>
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={data.status === 'processing' || !canGenerate}
        className="w-full rounded-lg bg-pink-500/20 px-4 py-2.5 text-sm font-medium text-pink-400 transition hover:bg-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {data.status === 'processing' ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            생성 중...
          </span>
        ) : (
          '🤖 LLM으로 프롬프트 생성'
        )}
      </button>

      {/* Output Prompt */}
      {data.outputPrompt && (
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-300 flex items-center justify-between">
            <span>출력 프롬프트</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(data.outputPrompt)
                alert('클립보드에 복사되었습니다!')
              }}
              className="text-xs text-pink-400 hover:text-pink-300"
            >
              📋 복사
            </button>
          </label>
          <textarea
            value={data.outputPrompt}
            readOnly
            className="h-32 w-full rounded-lg border border-pink-400/30 bg-pink-500/5 px-3 py-2 text-sm text-slate-200 focus:outline-none resize-none"
          />
        </div>
      )}

      {/* Status */}
      {data.status && (
        <div className={`rounded-lg border p-3 text-sm ${
          data.status === 'completed' ? 'border-green-500/30 bg-green-500/10 text-green-400' :
          data.status === 'processing' ? 'border-blue-500/30 bg-blue-500/10 text-blue-400' :
          data.status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-400' :
          'border-white/10 bg-white/5 text-slate-400'
        }`}>
          {data.status === 'idle' ? 'Ready' : 
           data.status === 'processing' ? 'Processing...' :
           data.status === 'completed' ? 'Completed' : 
           data.status === 'error' ? 'Error' : data.status}
        </div>
      )}

      {/* Error */}
      {data.error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {data.error}
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-blue-400/20 bg-blue-500/5 px-3 py-2 text-xs text-blue-300">
        <div className="font-semibold mb-1">💡 사용 팁</div>
        <ul className="space-y-1 text-[10px]">
          <li>• Text Prompt를 상단 (분홍) 핸들에 연결</li>
          <li>• 이미지를 하단 (하늘) 핸들에 연결 (선택)</li>
          <li>• 모드 선택 후 생성 버튼 클릭</li>
          <li>• 출력된 프롬프트는 다른 노드에 연결 가능</li>
        </ul>
      </div>
    </div>
  )
}

export default NodeInspector
