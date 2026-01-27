import React, { useRef } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { useIMEInput } from '../hooks/useIMEInput'
import { GeminiAPIClient, MockGeminiAPI } from '../services/geminiAPI'
import { X } from 'lucide-react'
import type {
  TextPromptNodeData,
  MotionPromptNodeData,
  ImageImportNodeData,
  NanoImageNodeData,
  GeminiVideoNodeData,
  KlingVideoNodeData,
  GridNodeData,
  CellRegeneratorNodeData,
  GridComposerNodeData,
  GridSlot,
  GridLayout,
  NanoImageModel,
  NanoImageResolution,
} from '../types/nodes'

const NodeInspector = () => {
  const { nodes, selectedNodeId, setSelectedNodeId, updateNodeData } = useFlowStore()
  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  if (!selectedNode) {
    return (
      <div className="flex h-full w-80 flex-col border-l border-white/10 bg-[#0f141a]/95 p-4">
        <div className="flex items-center justify-center text-slate-400 text-sm h-full">
          Select a node to view details
        </div>
      </div>
    )
  }

  const handleClose = () => {
    setSelectedNodeId(null)
  }

  const renderNodeSettings = () => {
    switch (selectedNode.type) {
      case 'textPrompt':
        return <TextPromptSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'motionPrompt':
        return <MotionPromptSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'imageImport':
        return <ImageImportSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'nanoImage':
        return <NanoImageSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'geminiVideo':
        return <GeminiVideoSettings node={selectedNode} updateNodeData={updateNodeData} />
      case 'klingVideo':
        return <KlingVideoSettings node={selectedNode} updateNodeData={updateNodeData} />
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
    <div className="flex h-full w-96 flex-col border-l border-white/10 bg-[#0f141a]/95">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 p-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-blue-400" />
          <h2 className="font-semibold text-slate-200">Node Inspector</h2>
        </div>
        <button
          onClick={handleClose}
          className="rounded-lg p-1 text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Settings Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

  const updateCombined = (updates: Partial<MotionPromptNodeData>) => {
    const updated = { ...data, ...updates }
    const combined = [
      updated.basePrompt,
      updated.cameraMovement,
      updated.subjectMotion,
      updated.lighting,
    ]
      .filter(Boolean)
      .join(', ')
    updateNodeData(node.id, { ...updated, combinedPrompt: combined })
  }

  const basePromptIME = useIMEInput(data.basePrompt, (value) => {
    updateCombined({ basePrompt: value })
  })

  const presets = {
    camera: ['Zoom In', 'Zoom Out', 'Pan Left', 'Pan Right', 'Orbit', 'Static'],
    motion: ['Gentle', 'Dynamic', 'Flowing', 'Wind', 'Water'],
    lighting: ['Sunrise', 'Sunset', 'Clouds', 'Light Rays', 'Flicker'],
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Base Prompt</label>
        <textarea
          {...basePromptIME}
          className="h-24 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          placeholder="Enter base prompt..."
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
    img.onload = () => {
      updateNodeData(node.id, {
        imageUrl: url,
        imageDataUrl: dataUrl,
        fileName: file.name,  // 파일 이름 저장
        filePath: file.webkitRelativePath || file.name,  // 가능한 경로 정보 저장
        width: img.width,
        height: img.height,
      })
    }
    img.src = url
  }

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

      {data.imageDataUrl || data.imageUrl ? (
        <>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-300">Preview</div>
            <div className="max-h-[600px] overflow-auto rounded-lg border border-white/10">
              <img
                src={data.imageDataUrl || data.imageUrl}
                alt="Imported"
                className="w-full"
                onError={() => {
                  // 이미지 로드 실패 시
                  updateNodeData(node.id, { imageUrl: undefined })
                }}
              />
            </div>
            {data.fileName && (
              <div className="mt-2 text-xs text-slate-400">
                📎 {data.fileName}
              </div>
            )}
          </div>
          
          <div>
            <div className="mb-2 text-sm font-medium text-slate-300">Dimensions</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              {data.width ?? '-'} × {data.height ?? '-'} px
            </div>
          </div>

          <button
            onClick={() => updateNodeData(node.id, { imageUrl: undefined, imageDataUrl: undefined, fileName: undefined, filePath: undefined, width: undefined, height: undefined })}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/20"
          >
            Remove Image
          </button>
        </>
      ) : data.fileName ? (
        <>
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
            ⚠️ 이미지가 자동 정리되었습니다
            <div className="mt-1 text-xs text-yellow-400/80">
              파일: {data.fileName}
            </div>
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400 transition hover:bg-blue-500/20"
          >
            다시 업로드
          </button>
        </>
      ) : (
        <>
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-400">
            No image selected
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm text-blue-400 transition hover:bg-blue-500/20"
          >
            Upload Image
          </button>
        </>
      )}
    </div>
  )
}

const NanoImageSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as NanoImageNodeData
  const runNanoImageNode = useFlowStore((state) => state.runNanoImageNode)
  const cancelNodeExecution = useFlowStore((state) => state.cancelNodeExecution)
  
  // Ensure resolution and aspectRatio have valid values (for backward compatibility with old nodes)
  const safeResolution = data.resolution || '2K'
  const safeAspectRatio = data.aspectRatio || '1:1'

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
        <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(node.id, { model: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="gemini-3-pro-image-preview">Nano Banana Pro</option>
          <option value="gemini-2.5-flash-image">Nano Banana (Flash)</option>
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
                    {displayModel === 'gemini-3-pro-image-preview' ? 'Nano Banana Pro' : 'Nano Banana Flash'}
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

      {data.outputImageUrl && (
        <div>
          <div className="mb-2 text-sm font-medium text-slate-300">Preview</div>
          <div className="max-h-[600px] overflow-auto rounded-lg border border-white/10">
            <img
              src={data.outputImageUrl}
              alt="Generated"
              className="w-full"
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
            onClick={() => void runNanoImageNode(node.id)}
            className="flex-1 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30"
          >
            Generate
          </button>
        )}
        {data.outputImageUrl && (
          <button
            onClick={() => {
              const link = document.createElement('a')
              link.href = data.outputImageUrl!
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

const GeminiVideoSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as GeminiVideoNodeData
  const runGeminiNode = useFlowStore((state) => state.runGeminiNode)
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
          onChange={(e) => updateNodeData(node.id, { model: e.target.value })}
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
          onChange={(e) => updateNodeData(node.id, { duration: Number(e.target.value) })}
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
          onChange={(e) => updateNodeData(node.id, { quality: e.target.value })}
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
          onChange={(e) => updateNodeData(node.id, { motionIntensity: e.target.value })}
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
            onClick={() => void runGeminiNode(node.id)}
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
              link.download = 'gemini-video.mp4'
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

const KlingVideoSettings = ({ node, updateNodeData }: any) => {
  const data = node.data as KlingVideoNodeData
  const runKlingNode = useFlowStore((state) => state.runKlingNode)
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
    data.model === 'kling-v1'
      ? 'Standard quality'
      : data.model === 'kling-v1-pro'
        ? 'Pro quality'
        : data.model === 'kling-v2.1-pro'
          ? 'v2.1 Pro · Enhanced'
          : 'v2.5 Pro · Latest'

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(node.id, { model: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
        >
          <option value="kling-v1">Kling 1.0</option>
          <option value="kling-v1-pro">Kling 1.0 Pro</option>
          <option value="kling-v2.1-pro">Kling 2.1 Pro</option>
          <option value="kling-v2.5-pro">Kling 2.5 Pro</option>
        </select>
        <div className="mt-1 text-xs text-slate-500">{modelHint}</div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Duration</label>
        <select
          value={data.duration}
          onChange={(e) => updateNodeData(node.id, { duration: Number(e.target.value) })}
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
          onChange={(e) => updateNodeData(node.id, { aspectRatio: e.target.value })}
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
            onChange={(e) => updateNodeData(node.id, { enableMotionControl: e.target.checked })}
            className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50"
          />
          Camera Control
        </label>

        {data.enableMotionControl && (
          <div className="mt-2 space-y-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <select
              value={data.cameraControl}
              onChange={(e) => updateNodeData(node.id, { cameraControl: e.target.value })}
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
                  onChange={(e) => updateNodeData(node.id, { motionValue: Number(e.target.value) })}
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
            onClick={() => void runKlingNode(node.id)}
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
              link.download = 'kling-video.mp4'
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
              
              updateNodeData(node.id, { ...data, gridLayout: newLayout, slots: newSlots })
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
              
              updateNodeData(node.id, { ...data, gridLayout: newLayout, slots: newSlots })
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
    
    // Find all connected prompt nodes
    const incomingEdges = edges.filter((e) => e.target === node.id)
    const connectedPromptNodes = incomingEdges
      .map((edge) => nodes.find((n) => n.id === edge.source))
      .filter((n) => n && (n.type === 'textPrompt' || n.type === 'motionPrompt'))
    
    // Get all prompts and combine them as base
    const allPrompts = connectedPromptNodes
      .map((n) => {
        if (n!.type === 'textPrompt') {
          return (n!.data as TextPromptNodeData).prompt
        } else if (n!.type === 'motionPrompt') {
          return (n!.data as MotionPromptNodeData).combinedPrompt
        }
        return ''
      })
      .filter(p => p.trim().length > 0)
    
    const basePrompt = allPrompts.join(', ')
    
    // Add EXTREMELY EXPLICIT grid layout instruction with labels
    const [rows, cols] = currentData.gridLayout.split('x').map(Number)
    const totalCells = rows * cols
    const slotLabels = currentData.slots.map(s => s.id).join(', ')
    
    const gridInstruction = `
⚠️ CRITICAL GRID REQUIREMENTS - FOLLOW EXACTLY:

1. GRID STRUCTURE (MANDATORY):
   - Create EXACTLY ${rows} rows and EXACTLY ${cols} columns
   - Total cells: EXACTLY ${totalCells} cells (NO MORE, NO LESS)
   - Grid layout: ${currentData.gridLayout}
   - ❌ DO NOT create ${totalCells + 1} or more cells
   - ❌ DO NOT create irregular grid patterns
   
2. CELL SIZE (MANDATORY):
   - ALL cells MUST be IDENTICAL in size
   - Use equal width and equal height for every cell
   - Perfect rectangular grid with no exceptions
   
3. CELL BORDERS (MANDATORY):
   - Draw CLEAR, VISIBLE borders between ALL cells
   - Use thin black or white lines to separate cells
   - Grid lines must be straight and aligned
   
4. CELL LABELS (MANDATORY):
   - EVERY cell MUST have its ID label in TOP-LEFT corner
   - Labels: ${slotLabels}
   - Label text: Large (at least 24px), Bold, White or Black (high contrast)
   - Label position: 5-10 pixels from top-left corner of each cell
   - Labels must be CLEARLY READABLE
   
5. LAYOUT ORDER:
   Row 1: ${currentData.slots.slice(0, cols).map(s => s.id).join(', ')}
   ${rows > 1 ? `Row 2: ${currentData.slots.slice(cols, cols * 2).map(s => s.id).join(', ')}` : ''}
   ${rows > 2 ? `Row 3: ${currentData.slots.slice(cols * 2, cols * 3).map(s => s.id).join(', ')}` : ''}
   
✅ VERIFY: The final image MUST have EXACTLY ${totalCells} cells arranged in ${rows} rows × ${cols} columns.

Subject: ${basePrompt}`
    
    // Generate prompts for each slot using latest data
    const newPrompts: { [key: string]: string } = {}
    
    currentData.slots.forEach((slot, index) => {
      const rowNum = Math.floor(index / cols) + 1
      const colNum = (index % cols) + 1
      
      let prompt = gridInstruction
      
      // Add slot-specific info based on mode
      if (currentData.mode === 'character') {
        if (slot.label) prompt += `\n\nCell ${slot.id} (Row ${rowNum}, Column ${colNum}): ${slot.label} view`
        else prompt += `\n\nCell ${slot.id} (Row ${rowNum}, Column ${colNum})`
        if (slot.metadata) prompt += `, ${slot.metadata}`
      } else {
        // storyboard mode
        if (slot.label) prompt += `\n\nCell ${slot.id} (Row ${rowNum}, Column ${colNum}): ${slot.label} shot`
        else prompt += `\n\nCell ${slot.id} (Row ${rowNum}, Column ${colNum})`
        if (slot.metadata) prompt += `, ${slot.metadata}`
      }
      
      // Clean up (remove empty commas, extra spaces)
      prompt = prompt
        .replace(/^,\s*/, '') // Remove leading comma
        .replace(/,\s*,/g, ',') // Remove double commas
        .replace(/\s+/g, ' ') // Remove extra spaces
        .trim()
      
      newPrompts[slot.id] = prompt
    })
    
    // Update with FULL data to preserve everything
    updateNodeData(node.id, {
      ...currentData,
      status: 'completed',
      generatedPrompts: newPrompts
    })
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
                  metadata: ''
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
              <div className="mb-1 text-xs font-semibold text-blue-400">{slot.id}</div>
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
            Generated Prompts ({Object.keys(data.generatedPrompts).length})
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1">
            {data.slots.map((slot) => {
              const prompt = data.generatedPrompts[slot.id]
              if (!prompt) return null
              
              return (
                <div key={slot.id} className="rounded border border-blue-400/20 bg-blue-500/5 p-2">
                  <div className="text-[10px] font-semibold text-blue-400 mb-1">
                    {slot.id}: {slot.label}
                  </div>
                  <div className="text-[10px] text-slate-300">{prompt}</div>
                </div>
              )
            })}
          </div>
          <div className="text-xs text-slate-500 bg-slate-900/50 border border-white/10 rounded p-2">
            💡 각 슬롯의 output을 Nano Image Node에 연결하여 이미지를 생성하세요.
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

  // Sync image from connected Image Node
  React.useEffect(() => {
    if (connectedImageNode) {
      let imageUrl: string | undefined
      let imageDataUrl: string | undefined

      if (connectedImageNode.type === 'nanoImage') {
        const nanoData = connectedImageNode.data as NanoImageNodeData
        imageUrl = nanoData.outputImageUrl
        imageDataUrl = nanoData.outputImageDataUrl
      } else if (connectedImageNode.type === 'imageImport') {
        const importData = connectedImageNode.data as ImageImportNodeData
        imageUrl = importData.imageUrl
        imageDataUrl = importData.imageDataUrl
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
    if (!data.gridLayout || !data.slots || data.slots.length === 0) {
      updateNodeData(node.id, {
        error: 'Grid Node를 연결하세요!',
      } as any)
      return
    }

    const imageSource = data.inputImageUrl || data.inputImageDataUrl
    if (!imageSource) {
      updateNodeData(node.id, {
        error: '라벨된 그리드 이미지를 연결하세요!',
      } as any)
      return
    }

    updateNodeData(node.id, {
      status: 'processing',
      error: undefined,
    } as any)

    try {
      // Parse grid layout
      const [rows, cols] = data.gridLayout.split('x').map(Number)

      // Load image
      const img = new Image()
      img.crossOrigin = 'anonymous'
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = imageSource
      })

      const imgWidth = img.width
      const imgHeight = img.height
      const cellWidth = imgWidth / cols
      const cellHeight = imgHeight / rows

      // Initialize API client
      const key = apiKey || import.meta.env.VITE_GEMINI_API_KEY || ''
      const client = key ? new GeminiAPIClient(key) : new MockGeminiAPI()

      const newImages: { [key: string]: string } = {}

      // Process each cell
      for (let i = 0; i < data.slots.length; i++) {
        const slot = data.slots[i]
        const row = Math.floor(i / cols)
        const col = i % cols

        // Create canvas for this cell
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) continue

        // Extract cell from grid
        canvas.width = cellWidth
        canvas.height = cellHeight

        const sx = col * cellWidth
        const sy = row * cellHeight

        ctx.drawImage(img, sx, sy, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight)

        // Convert to data URL
        const cellImageDataUrl = canvas.toDataURL('image/png')

        try {
          // Regenerate this cell with Gemini API (remove label)
          const slotDescription = slot.label ? `${slot.label}` : `Cell ${slot.id}`
          const prompt = `This is a reference image for "${slotDescription}". 
          
CRITICAL INSTRUCTIONS:
1. EXACTLY RECREATE this image composition, maintaining the SAME:
   - Character pose and position
   - Camera angle and perspective
   - Lighting and colors
   - Style and atmosphere
   - Framing and crop

2. ONLY REMOVE: Any text labels or ID numbers (like "${slot.id}")

3. Keep everything else IDENTICAL to the reference

The final image should look exactly like this reference, just without any text overlay.`
          
          const result = await client.generateImage(
            prompt,
            data.aspectRatio,
            cellImageDataUrl, // Use extracted cell as reference
            data.model,
            data.resolution
          )
          
          newImages[slot.id] = result.imageUrl
        } catch (error) {
          console.error(`Failed to regenerate cell ${slot.id}:`, error)
          // Continue with other cells even if one fails
        }
      }

      // Check if any images were regenerated
      if (Object.keys(newImages).length === 0) {
        throw new Error('모든 셀 재생성에 실패했습니다')
      }

      updateNodeData(node.id, {
        status: 'completed',
        regeneratedImages: newImages,
      } as any)
    } catch (error: any) {
      updateNodeData(node.id, {
        status: 'error',
        error: error.message || '셀 재생성에 실패했습니다',
      } as any)
    }
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

      {/* Model Settings */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Model</label>
        <select
          value={data.model}
          onChange={(e) =>
            updateNodeData(node.id, {
              model: e.target.value as NanoImageModel,
            } as any)
          }
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
        >
          <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
          <option value="gemini-3-pro-image-preview">Gemini 3 Pro (Preview)</option>
        </select>
      </div>

      {/* Resolution */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Resolution</label>
        <select
          value={data.resolution}
          onChange={(e) =>
            updateNodeData(node.id, { resolution: e.target.value as NanoImageResolution } as any)
          }
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
        >
          <option value="1K">1K</option>
          <option value="2K">2K</option>
          <option value="4K">4K</option>
        </select>
      </div>

      {/* Aspect Ratio */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Aspect Ratio</label>
        <select
          value={data.aspectRatio}
          onChange={(e) =>
            updateNodeData(node.id, { aspectRatio: e.target.value } as any)
          }
          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-purple-400 focus:outline-none focus:ring-1 focus:ring-purple-400"
        >
          <option value="1:1">1:1 (Square)</option>
          <option value="16:9">16:9 (Landscape)</option>
          <option value="9:16">9:16 (Portrait)</option>
          <option value="4:3">4:3</option>
          <option value="3:4">3:4</option>
        </select>
      </div>

      {/* Info Box */}
      <div className="rounded border border-purple-400/20 bg-purple-500/5 px-3 py-2 text-xs text-purple-300">
        💡 이 노드는 라벨이 있는 그리드 이미지를 받아서 각 셀을 라벨 없이 재생성합니다.
      </div>

      {/* Regenerate Button */}
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
          <span>⏳ Regenerating {data.slots?.length} cells...</span>
        ) : (
          <span>✨ Regenerate {data.slots?.length || 0} Cells</span>
        )}
      </button>

      {/* Regenerated Images Preview */}
      {Object.keys(data.regeneratedImages).length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-emerald-400">
            ✅ {Object.keys(data.regeneratedImages).length} Cells Regenerated
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto">
            {data.slots?.map((slot) => {
              const imageUrl = data.regeneratedImages[slot.id]
              if (!imageUrl) return null

              return (
                <div key={slot.id} className="group relative rounded border border-white/10 bg-slate-800 p-2">
                  <div className="mb-1 text-[10px] font-semibold text-purple-400">
                    {slot.id}: {slot.label}
                  </div>
                  <img
                    src={imageUrl}
                    alt={slot.label}
                    className="w-full rounded border border-white/10"
                  />
                  <button
                    onClick={() => downloadImage(slot.id, slot.label)}
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

          if (sourceNode.type === 'nanoImage') {
            const nanoData = sourceNode.data as NanoImageNodeData
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
        const imageUrl = data.inputImages[slot.id]
        if (!imageUrl) continue

        const img = new Image()
        img.crossOrigin = 'anonymous'
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = reject
          img.src = imageUrl
        })

        imageElements[slot.id] = img
      }

      // Determine cell size (use first image as reference)
      const firstImg = imageElements[data.slots[0].id]
      const cellWidth = firstImg.width
      const cellHeight = firstImg.height

      // Calculate grid dimensions
      const borderWidth = data.showBorders ? data.borderWidth : 0
      const padding = data.cellPadding
      const totalWidth = cols * cellWidth + (cols + 1) * borderWidth + 2 * padding
      const totalHeight = rows * cellHeight + (rows + 1) * borderWidth + 2 * padding

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
      for (let i = 0; i < data.slots.length; i++) {
        const slot = data.slots[i]
        const row = Math.floor(i / cols)
        const col = i % cols
        const img = imageElements[slot.id]

        if (!img) continue

        // Calculate position
        const x = padding + col * (cellWidth + borderWidth) + borderWidth
        const y = padding + row * (cellHeight + borderWidth) + borderWidth

        // Draw cell background (if borders)
        if (data.showBorders) {
          ctx.fillStyle = data.borderColor
          ctx.fillRect(
            x - borderWidth,
            y - borderWidth,
            cellWidth + 2 * borderWidth,
            cellHeight + 2 * borderWidth
          )
        }

        // Draw image based on aspect ratio mode
        const imgAspect = img.width / img.height
        const cellAspect = cellWidth / cellHeight

        if (data.aspectRatioMode === 'stretch') {
          // Stretch: 비율 무시하고 셀 크기에 맞춤
          ctx.drawImage(img, x, y, cellWidth, cellHeight)
        } else if (data.aspectRatioMode === 'contain') {
          // Contain: 비율 유지하며 셀 안에 맞춤 (여백 생김)
          let drawWidth, drawHeight, drawX, drawY
          
          if (imgAspect > cellAspect) {
            // 이미지가 더 넓음 -> 너비를 셀에 맞춤
            drawWidth = cellWidth
            drawHeight = cellWidth / imgAspect
            drawX = x
            drawY = y + (cellHeight - drawHeight) / 2
          } else {
            // 이미지가 더 높음 -> 높이를 셀에 맞춤
            drawHeight = cellHeight
            drawWidth = cellHeight * imgAspect
            drawX = x + (cellWidth - drawWidth) / 2
            drawY = y
          }
          
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
        } else if (data.aspectRatioMode === 'cover') {
          // Cover: 비율 유지하며 셀을 꽉 채움 (잘림 발생)
          let drawWidth, drawHeight, drawX, drawY
          
          if (imgAspect > cellAspect) {
            // 이미지가 더 넓음 -> 높이를 셀에 맞춤
            drawHeight = cellHeight
            drawWidth = cellHeight * imgAspect
            drawX = x + (cellWidth - drawWidth) / 2
            drawY = y
          } else {
            // 이미지가 더 높음 -> 너비를 셀에 맞춤
            drawWidth = cellWidth
            drawHeight = cellWidth / imgAspect
            drawX = x
            drawY = y + (cellHeight - drawHeight) / 2
          }
          
          // Clip to cell area
          ctx.save()
          ctx.beginPath()
          ctx.rect(x, y, cellWidth, cellHeight)
          ctx.clip()
          ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight)
          ctx.restore()
        }

        // Draw label
        if (data.showLabels) {
          ctx.font = `bold ${data.labelSize}px Arial`
          ctx.fillStyle = data.labelColor
          ctx.strokeStyle = data.labelColor === '#ffffff' ? '#000000' : '#ffffff'
          ctx.lineWidth = 2
          
          const text = slot.id
          const textX = x + 10
          const textY = y + data.labelSize + 5

          ctx.strokeText(text, textX, textY)
          ctx.fillText(text, textX, textY)
        }
      }

      // Convert to data URL
      const composedDataUrl = canvas.toDataURL('image/png')

      updateNodeData(node.id, {
        status: 'completed',
        composedImageDataUrl: composedDataUrl,
        composedImageUrl: composedDataUrl,
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
  
  // Check if there's a prompt or image connection
  const hasPromptConnection = edges.some((e) => e.target === node.id && e.targetHandle === 'prompt')
  const hasImageConnection = edges.some((e) => e.target === node.id && e.targetHandle === 'image')
  
  // Button should be enabled if:
  // - For image modes (describe, analyze): image connection required
  // - For text modes: prompt connection OR inputPrompt OR image connection
  const canGenerate = 
    (data.mode === 'describe' || data.mode === 'analyze') 
      ? hasImageConnection 
      : (hasPromptConnection || data.inputPrompt?.trim() || hasImageConnection)

  const handleGenerate = async () => {
    // Validation is now handled in runLLMPromptNode
    await runLLMPromptNode(node.id)
  }

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="space-y-2">
        {/* Prompt Connection */}
        <div className={`rounded-lg border px-3 py-2 ${
          hasPromptConnection 
            ? 'border-green-400/30 bg-green-500/5' 
            : 'border-pink-400/20 bg-pink-500/5'
        }`}>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-medium text-pink-400">📝 프롬프트 입력</div>
            {hasPromptConnection && (
              <div className="text-[9px] text-green-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                연결됨
              </div>
            )}
          </div>
          {!hasPromptConnection && (
            <div className="text-[11px] text-slate-400">
              Text Prompt 노드를 상단 (분홍) 핸들에 연결하세요
            </div>
          )}
          {data.inputPrompt && (
            <div className="mt-2 pt-2 border-t border-pink-400/20">
              <div className="text-[9px] text-slate-400 mb-1">프롬프트 미리보기:</div>
              <div className="text-[10px] text-slate-300 line-clamp-3 bg-black/20 rounded p-2">
                {data.inputPrompt}
              </div>
            </div>
          )}
        </div>
        
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

      {/* Mode Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">처리 모드</label>
        <select
          value={data.mode}
          onChange={(e) => updateNodeData(node.id, { mode: e.target.value } as any)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        >
          <optgroup label="텍스트 기반">
            <option value="expand">📝 확장 - 간단한 아이디어를 상세 프롬프트로</option>
            <option value="improve">✨ 개선 - 기존 프롬프트를 더 효과적으로</option>
            <option value="translate">🌐 번역 - 한국어 ↔ 영어</option>
            <option value="simplify">🎯 간결화 - 핵심만 간단하게</option>
          </optgroup>
          <optgroup label="이미지 기반">
            <option value="describe">🖼️ 이미지 설명 - 이미지를 프롬프트로 변환</option>
            <option value="analyze">🔍 이미지 분석 - 상세한 이미지 분석 프롬프트</option>
          </optgroup>
        </select>
      </div>
      
      {/* Reference Image Info */}
      {data.referenceImageUrl && (
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400">🖼️ 참고 이미지 연결됨</span>
          </div>
          <div className="mt-2 rounded overflow-hidden">
            <img
              src={data.referenceImageUrl}
              alt="Reference"
              className="w-full"
            />
          </div>
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

      {/* Model Selection */}
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">LLM 모델</label>
        <select
          value={data.model}
          onChange={(e) => updateNodeData(node.id, { model: e.target.value } as any)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/50"
        >
          <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (빠름)</option>
          <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
          <option value="gemini-1.5-pro">Gemini 1.5 Pro (정확)</option>
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
