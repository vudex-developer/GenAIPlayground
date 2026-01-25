import React from 'react'
import { useFlowStore } from '../stores/flowStore'
import { X } from 'lucide-react'
import type {
  TextPromptNodeData,
  MotionPromptNodeData,
  ImageImportNodeData,
  NanoImageNodeData,
  GeminiVideoNodeData,
  KlingVideoNodeData,
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

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-slate-300">Prompt Text</label>
        <textarea
          value={data.prompt}
          onChange={(e) => updateNodeData(node.id, { prompt: e.target.value })}
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
          value={data.basePrompt}
          onChange={(e) => updateCombined({ basePrompt: e.target.value })}
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

      {data.imageUrl ? (
        <>
          <div>
            <div className="mb-2 text-sm font-medium text-slate-300">Preview</div>
            <div className="max-h-[600px] overflow-auto rounded-lg border border-white/10">
              <img
                src={data.imageUrl}
                alt="Imported"
                className="w-full"
              />
            </div>
          </div>
          
          <div>
            <div className="mb-2 text-sm font-medium text-slate-300">Dimensions</div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
              {data.width ?? '-'} × {data.height ?? '-'} px
            </div>
          </div>

          <button
            onClick={() => updateNodeData(node.id, { imageUrl: undefined, imageDataUrl: undefined, width: undefined, height: undefined })}
            className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/20"
          >
            Remove Image
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

export default NodeInspector
