import { useCallback, useEffect, useState, type DragEvent } from 'react'
import ReactFlow, {
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  useReactFlow,
  BezierEdge,
  type Node,
  type EdgeTypes,
} from 'reactflow'
import {
  Banana,
  Camera,
  Grid3x3,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { useFlowStore, createWorkflowNode } from '../stores/flowStore'
import type { NodeType } from '../types/nodes'
import ImageImportNode from './nodes/ImageImportNode'
import NanoImageNode from './nodes/NanoImageNode'
import TextPromptNode from './nodes/TextPromptNode'
import MotionPromptNode from './nodes/MotionPromptNode'
import GeminiVideoNode from './nodes/GeminiVideoNode'
import KlingVideoNode from './nodes/KlingVideoNode'
import SoraVideoNode from './nodes/SoraVideoNode'
import GridNode from './nodes/GridNode'
import CellRegeneratorNode from './nodes/CellRegeneratorNode'
import GridComposerNode from './nodes/GridComposerNode'
import LLMPromptNode from './nodes/LLMPromptNode'
import NodeInspector from './NodeInspector'
import { ImageModal } from './ImageModal'
import KlingIcon from './icons/KlingIcon'
import SoraIcon from './icons/SoraIcon'

// Custom LLM text icon component
const LLMIcon = ({ className }: { className?: string }) => (
  <div className={`font-bold text-[11px] tracking-tight ${className}`}>
    LLM
  </div>
)

const nodeTypes = {
  imageImport: ImageImportNode,
  nanoImage: NanoImageNode,
  textPrompt: TextPromptNode,
  motionPrompt: MotionPromptNode,
  geminiVideo: GeminiVideoNode,
  klingVideo: KlingVideoNode,
  soraVideo: SoraVideoNode,
  gridNode: GridNode,
  cellRegenerator: CellRegeneratorNode,
  gridComposer: GridComposerNode,
  llmPrompt: LLMPromptNode,
}

// ✅ Move outside component to prevent recreation on every render
const edgeTypes: EdgeTypes = {
  bezier: BezierEdge,
}

const toolbarItems: Array<{
  type: NodeType
  label: string
  key: string
  icon: typeof ImageIcon | typeof KlingIcon | typeof LLMIcon
}> = [
  { type: 'imageImport', label: 'Image Import', key: '1', icon: ImageIcon },
  { type: 'nanoImage', label: 'Nano Banana', key: '2', icon: Banana },
  { type: 'textPrompt', label: 'Text Prompt', key: '3', icon: MessageSquare },
  { type: 'motionPrompt', label: 'Motion Prompt', key: '4', icon: Camera },
  { type: 'geminiVideo', label: 'Gemini Video', key: '5', icon: Sparkles },
  { type: 'klingVideo', label: 'Kling Video', key: '6', icon: KlingIcon },
  { type: 'soraVideo', label: 'Sora Video', key: 'q', icon: SoraIcon },
  { type: 'gridNode', label: 'Grid Node', key: '7', icon: Grid3x3 },
  { type: 'cellRegenerator', label: 'Cell Regenerator', key: '8', icon: Sparkles },
  { type: 'gridComposer', label: 'Grid Composer', key: '9', icon: Layers },
  { type: 'llmPrompt', label: 'LLM Prompt', key: '0', icon: LLMIcon },
]

export default function Canvas() {
  const { screenToFlowPosition, getNodes, getViewport } = useReactFlow()
  const nodes = useFlowStore((state) => state.nodes)
  const edges = useFlowStore((state) => state.edges)
  const onNodesChange = useFlowStore((state) => state.onNodesChange)
  const onEdgesChange = useFlowStore((state) => state.onEdgesChange)
  const onConnect = useFlowStore((state) => state.onConnect)
  const addNode = useFlowStore((state) => state.addNode)
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([])
  const [currentZoom, setCurrentZoom] = useState(0.35)
  const [isDraggingFile, setIsDraggingFile] = useState(false)

  // MiniMap node colors matching node icons
  const getNodeColor = useCallback((node: Node) => {
    switch (node.type) {
      case 'imageImport':
        return '#22d3ee' // cyan-400
      case 'textPrompt':
        return '#a78bfa' // violet-400
      case 'motionPrompt':
        return '#e879f9' // fuchsia-400
      case 'nanoImage':
        return '#facc15' // yellow-400
      case 'geminiVideo':
        return '#60a5fa' // blue-400
      case 'klingVideo':
        return '#4ade80' // green-400
      case 'soraVideo':
        return '#f97316' // orange-500
      case 'gridNode':
        return '#a78bfa' // violet-400
      case 'cellRegenerator':
        return '#c084fc' // purple-400
      case 'gridComposer':
        return '#10b981' // emerald-500
      case 'llmPrompt':
        return '#f472b6' // pink-400
      default:
        return '#64748b' // slate-500
    }
  }, [])

  const addNodeAtCenter = useCallback(
    (type: NodeType) => {
      const position = screenToFlowPosition({
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      })
      addNode(createWorkflowNode(type, position))
    },
    [addNode, screenToFlowPosition],
  )

  // Update zoom level periodically
  useEffect(() => {
    const updateZoom = () => {
      const viewport = getViewport()
      setCurrentZoom(viewport.zoom)
    }
    
    const interval = setInterval(updateZoom, 100)
    return () => clearInterval(interval)
  }, [getViewport])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isInputField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      // Copy: Ctrl+C or Cmd+C
      if ((event.metaKey || event.ctrlKey) && event.key === 'c' && !isInputField) {
        const selectedNodes = getNodes().filter((node) => node.selected)
        if (selectedNodes.length > 0) {
          setCopiedNodes(selectedNodes)
          event.preventDefault()
          console.log(`📋 Copied ${selectedNodes.length} node(s)`)
        }
        return
      }

      // Paste: Ctrl+V or Cmd+V
      if ((event.metaKey || event.ctrlKey) && event.key === 'v' && !isInputField) {
        if (copiedNodes.length > 0) {
          event.preventDefault()
          copiedNodes.forEach((node, index) => {
            const newNode = createWorkflowNode(node.type as NodeType, {
              x: node.position.x + 50,
              y: node.position.y + 50 + index * 20,
            })
            // Copy node data
            newNode.data = { ...node.data }
            addNode(newNode)
          })
          console.log(`📌 Pasted ${copiedNodes.length} node(s)`)
        }
        return
      }

      // Number keys: Add nodes (only when not using modifiers)
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isInputField) return

      const item = toolbarItems.find((entry) => entry.key === event.key)
      if (!item) return
      event.preventDefault()
      addNodeAtCenter(item.type)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [addNodeAtCenter, getNodes, copiedNodes, addNode])

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault()
    
    // 🎨 Check if dragging files (images from other apps)
    const hasFiles = event.dataTransfer.types.includes('Files')
    if (hasFiles) {
      event.dataTransfer.dropEffect = 'copy'
      setIsDraggingFile(true)
    } else {
      event.dataTransfer.dropEffect = 'move'
      setIsDraggingFile(false)
    }
  }, [])

  const onDrop = useCallback(
    async (event: DragEvent) => {
      event.preventDefault()
      setIsDraggingFile(false) // Reset drag state
      
      // 🎨 Check for image files first (drag from other apps)
      const files = Array.from(event.dataTransfer.files)
      const imageFile = files.find(file => file.type.startsWith('image/'))
      
      if (imageFile) {
        // 📸 Image file dropped - create Image Import node
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })
        
        const newNode = createWorkflowNode('imageImport', position)
        addNode(newNode)
        
        // 🔄 Auto-upload the image to the newly created node
        const reader = new FileReader()
        reader.onload = async () => {
          const dataUrl = reader.result as string
          const img = new Image()
          img.onload = async () => {
            try {
              const { saveImage } = await import('../utils/indexedDB')
              const imageId = `img-import-${Date.now()}-${Math.random().toString(36).substring(7)}`
              const savedRef = await saveImage(imageId, dataUrl, newNode.id, true)
              
              const { updateNodeData } = useFlowStore.getState()
              updateNodeData(newNode.id, {
                imageUrl: URL.createObjectURL(imageFile),
                imageDataUrl: savedRef,
                fileName: imageFile.name,
                filePath: imageFile.name,
                width: img.width,
                height: img.height,
              })
              
              console.log('✅ Image dropped and uploaded successfully!')
            } catch (error) {
              console.error('❌ Failed to upload dropped image:', error)
            }
          }
          img.src = dataUrl
        }
        reader.readAsDataURL(imageFile)
        return
      }
      
      // 🎯 Original logic: ReactFlow node drop from palette
      const type = event.dataTransfer.getData('application/reactflow') as NodeType
      if (!type) return

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      })

      addNode(createWorkflowNode(type, position))
    },
    [addNode, screenToFlowPosition],
  )

  const onDragLeave = useCallback((event: DragEvent) => {
    // Only reset if leaving the canvas entirely
    if (event.currentTarget === event.target) {
      setIsDraggingFile(false)
    }
  }, [])

  return (
    <div className="flex h-full w-full">
      {/* Main Canvas Area */}
      <div 
        className="relative flex-1"
        onDragLeave={onDragLeave}
      >
        {/* 🎨 Image Drop Overlay */}
        {isDraggingFile && (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm">
            <div className="rounded-2xl border-2 border-dashed border-blue-400 bg-[#0f141a]/95 px-8 py-6 shadow-2xl">
              <div className="flex flex-col items-center gap-3">
                <ImageIcon className="h-12 w-12 text-blue-400" />
                <div className="text-lg font-bold text-blue-400">이미지를 여기에 드롭하세요</div>
                <div className="text-sm text-slate-400">Image Import 노드가 자동으로 생성됩니다</div>
              </div>
            </div>
          </div>
        )}
        {/* Zoom Level Indicator */}
        <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-xl border border-blue-400/30 bg-[#0f141a]/95 px-3 py-2 text-xs font-mono text-blue-400 shadow-lg" style={{ opacity: 0.95 }}>
          🔍 Zoom: {(currentZoom * 100).toFixed(1)}% ({currentZoom.toFixed(3)})
        </div>

        {/* Selection Guide */}
        <div className="pointer-events-none absolute right-4 top-16 z-20 rounded-xl border border-white/10 bg-[#0f141a]/95 px-3 py-2 text-[10px] text-slate-400 shadow-lg" style={{ opacity: 0.95 }}>
          <div className="font-semibold text-slate-300 mb-1">Selection & Copy</div>
          <div>• Drag to select multiple nodes</div>
          <div>• Shift + Click for multi-select</div>
          <div>• Ctrl/Cmd + C to copy</div>
          <div>• Ctrl/Cmd + V to paste</div>
        </div>

        <div className="pointer-events-auto absolute left-4 top-4 z-20 flex h-[calc(100%-2rem)] w-12 flex-col items-center gap-2 rounded-xl border border-white/10 bg-[#0f141a]/95 p-2 shadow-lg" style={{ opacity: 0.95 }}>
          {toolbarItems.map((item) => {
            const Icon = item.icon
            const isLLMIcon = item.type === 'llmPrompt'
            return (
              <button
                key={item.type}
                type="button"
                title={`${item.label} (${item.key})`}
                onClick={() => addNodeAtCenter(item.type)}
                className="group flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-slate-100"
              >
                {isLLMIcon ? (
                  <Icon className="" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </button>
            )
          })}
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{
            type: 'bezier',
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 1.478 }}
          connectionLineType={ConnectionLineType.Bezier}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          onDragOver={onDragOver}
          onDrop={onDrop}
          selectionOnDrag
          panOnDrag={[1, 2]}
          multiSelectionKeyCode="Shift"
          fitView
          // ⚡ 성능 최적화
          nodesDraggable={true}
          nodesConnectable={true}
          elementsSelectable={true}
          selectNodesOnDrag={false}
          zoomOnScroll={true}
          zoomOnPinch={true}
          panOnScroll={false}
          preventScrolling={true}
          minZoom={0.1}
          maxZoom={4}
          // 렌더링 최적화
          nodeOrigin={[0.5, 0]}
          elevateNodesOnSelect={false}
        >
          <Background gap={22} color="#121a24" />
          <MiniMap 
            pannable 
            zoomable
            nodeColor={getNodeColor}
            nodeStrokeWidth={2}
            nodeBorderRadius={8}
            maskColor="rgba(15, 20, 26, 0.85)"
            style={{
              backgroundColor: '#0f141a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              opacity: 0.95,
            }}
          />
          <Controls />
        </ReactFlow>
      </div>

      {/* Node Inspector Panel */}
      <NodeInspector />

      {/* Image Modal */}
      <ImageModal />
    </div>
  )
}
