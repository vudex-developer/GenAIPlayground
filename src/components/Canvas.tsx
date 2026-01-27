import { useCallback, useEffect, useState, type DragEvent } from 'react'
import ReactFlow, {
  Background,
  ConnectionLineType,
  Controls,
  MiniMap,
  useReactFlow,
  type Node,
} from 'reactflow'
import {
  Banana,
  Grid3x3,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { useFlowStore, createWorkflowNode } from '../stores/flowStore'
import type { NodeType } from '../types/nodes'
import ImageImportNode from './nodes/ImageImportNode'
import NanoImageNode from './nodes/NanoImageNode'
import TextPromptNode from './nodes/TextPromptNode'
import MotionPromptNode from './nodes/MotionPromptNode'
import GeminiVideoNode from './nodes/GeminiVideoNode'
import KlingVideoNode from './nodes/KlingVideoNode'
import GridNode from './nodes/GridNode'
import CellRegeneratorNode from './nodes/CellRegeneratorNode'
import GridComposerNode from './nodes/GridComposerNode'
import LLMPromptNode from './nodes/LLMPromptNode'
import NodeInspector from './NodeInspector'
import { ImageModal } from './ImageModal'
import KlingIcon from './icons/KlingIcon'

const nodeTypes = {
  imageImport: ImageImportNode,
  nanoImage: NanoImageNode,
  textPrompt: TextPromptNode,
  motionPrompt: MotionPromptNode,
  geminiVideo: GeminiVideoNode,
  klingVideo: KlingVideoNode,
  gridNode: GridNode,
  cellRegenerator: CellRegeneratorNode,
  gridComposer: GridComposerNode,
  llmPrompt: LLMPromptNode,
}

const toolbarItems: Array<{
  type: NodeType
  label: string
  key: string
  icon: typeof ImageIcon | typeof KlingIcon
}> = [
  { type: 'imageImport', label: 'Image Import', key: '1', icon: ImageIcon },
  { type: 'nanoImage', label: 'Nano Banana', key: '2', icon: Banana },
  { type: 'textPrompt', label: 'Text Prompt', key: '3', icon: MessageSquare },
  { type: 'motionPrompt', label: 'Motion Prompt', key: '4', icon: Wand2 },
  { type: 'geminiVideo', label: 'Gemini Video', key: '5', icon: Sparkles },
  { type: 'klingVideo', label: 'Kling Video', key: '6', icon: KlingIcon },
  { type: 'gridNode', label: 'Grid Node', key: '7', icon: Grid3x3 },
  { type: 'cellRegenerator', label: 'Cell Regenerator', key: '8', icon: Sparkles },
  { type: 'gridComposer', label: 'Grid Composer', key: '9', icon: Layers },
  { type: 'llmPrompt', label: 'LLM Prompt', key: '0', icon: Sparkles },
]

export default function Canvas() {
  const { screenToFlowPosition, getNodes } = useReactFlow()
  const nodes = useFlowStore((state) => state.nodes)
  const edges = useFlowStore((state) => state.edges)
  const onNodesChange = useFlowStore((state) => state.onNodesChange)
  const onEdgesChange = useFlowStore((state) => state.onEdgesChange)
  const onConnect = useFlowStore((state) => state.onConnect)
  const addNode = useFlowStore((state) => state.addNode)
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)
  const [copiedNodes, setCopiedNodes] = useState<Node[]>([])

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
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault()
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

  return (
    <div className="flex h-full w-full">
      {/* Main Canvas Area */}
      <div className="relative flex-1">
        {/* Selection Guide */}
        <div className="pointer-events-none absolute right-4 top-4 z-20 rounded-xl border border-white/10 bg-[#0f141a]/95 px-3 py-2 text-[10px] text-slate-400 shadow-lg" style={{ opacity: 0.95 }}>
          <div className="font-semibold text-slate-300 mb-1">Selection & Copy</div>
          <div>• Drag to select multiple nodes</div>
          <div>• Shift + Click for multi-select</div>
          <div>• Ctrl/Cmd + C to copy</div>
          <div>• Ctrl/Cmd + V to paste</div>
        </div>

        <div className="pointer-events-auto absolute left-4 top-4 z-20 flex h-[calc(100%-2rem)] w-12 flex-col items-center gap-2 rounded-xl border border-white/10 bg-[#0f141a]/95 p-2 shadow-lg" style={{ opacity: 0.95 }}>
          {toolbarItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.type}
                type="button"
                title={`${item.label} (${item.key})`}
                onClick={() => addNodeAtCenter(item.type)}
                className="group flex h-9 w-9 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:border-white/10 hover:bg-white/5 hover:text-slate-100"
              >
                <Icon className="h-4 w-4" />
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
          defaultEdgeOptions={{
            type: 'bezier',
          }}
          defaultViewport={{ x: 0, y: 0, zoom: 0.375 }}
          connectionLineType={ConnectionLineType.Bezier}
          onNodeClick={(_, node) => setSelectedNodeId(node.id)}
          onPaneClick={() => setSelectedNodeId(null)}
          onDragOver={onDragOver}
          onDrop={onDrop}
          selectionOnDrag
          panOnDrag={[1, 2]}
          multiSelectionKeyCode="Shift"
          fitView
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
