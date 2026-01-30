import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from 'reactflow'
import { GeminiAPIClient, MockGeminiAPI } from '../services/geminiAPI'
import { KlingAPIClient, MockKlingAPI } from '../services/klingAPI'
import { retryWithBackoff } from '../utils/retry'
import { getStorageInfo, prepareForStorage, getStorageWarning } from '../utils/storage'
import { createBackup } from '../utils/backup'
import { saveImage, getImage } from '../utils/indexedDB'
import type {
  GeminiVideoNodeData,
  GridNodeData,
  ImageImportNodeData,
  KlingVideoNodeData,
  MotionPromptNodeData,
  NanoImageNodeData,
  NodeData,
  NodeType,
  TextPromptNodeData,
  WorkflowEdge,
  WorkflowNode,
} from '../types/nodes'
import { createNodeData } from '../types/nodes'

type HistoryState = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

type FlowState = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  apiKey: string
  klingApiKey: string
  openaiApiKey: string  // OpenAI API Key
  abortControllers: Map<string, AbortController>
  history: HistoryState[]
  historyIndex: number
  imageModal: { isOpen: boolean; imageUrl: string | null }
  setSelectedNodeId: (id: string | null) => void
  setApiKey: (key: string) => void
  setKlingApiKey: (key: string) => void
  setOpenaiApiKey: (key: string) => void  // OpenAI API Key Setter
  openImageModal: (imageUrl: string) => void
  closeImageModal: () => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: WorkflowNode) => void
  updateNodeData: (id: string, data: NodeData) => void
  saveWorkflow: () => boolean
  loadWorkflow: () => boolean
  importWorkflow: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => boolean
  exportWorkflow: () => string
  undo: () => void
  redo: () => void
  runWorkflow: () => Promise<void>
  runGeminiNode: (id: string) => Promise<void>
  runNanoImageNode: (id: string) => Promise<void>
  runKlingNode: (id: string) => Promise<void>
  runLLMPromptNode: (id: string) => Promise<void>
  cancelNodeExecution: (id: string) => void
}

const getEdgeClass = (edge: WorkflowEdge, nodes: WorkflowNode[]) => {
  const sourceNode = nodes.find((node) => node.id === edge.source)
  switch (sourceNode?.type) {
    case 'textPrompt':
      return 'edge-text-prompt'
    case 'motionPrompt':
      return 'edge-motion-prompt'
    case 'imageImport':
      return 'edge-image-import'
    case 'nanoImage':
      return 'edge-nano-image'
    case 'geminiVideo':
      return 'edge-gemini-video'
    case 'klingVideo':
      return 'edge-kling-video'
    case 'gridNode':
      return 'edge-text-prompt' // Use violet color
    case 'cellRegenerator':
      return 'edge-motion-prompt' // Use purple color
    case 'gridComposer':
      return 'edge-kling-video' // Use emerald color
    case 'llmPrompt':
      return 'edge-motion-prompt' // Use pink color
    default:
      return 'edge-default'
  }
}

const normalizeEdges = (edges: WorkflowEdge[], nodes: WorkflowNode[]) => {
  const nodeIds = new Set(nodes.map(n => n.id))
  
  // Filter out edges that reference deleted nodes
  return edges
    .filter(edge => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((edge) => ({
      ...edge,
      type: 'bezier',
      className: getEdgeClass(edge, nodes),
    }))
}

const sanitizeEdgesForStorage = (edges: WorkflowEdge[]) =>
  edges.map(({ source, target, sourceHandle, targetHandle, id }) => ({
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
  }))

const isConnectionAllowed = (sourceType: NodeType, targetType: NodeType) => {
  if (sourceType === 'imageImport' && targetType === 'motionPrompt') return true
  if (sourceType === 'imageImport' && targetType === 'nanoImage') return true
  if (sourceType === 'nanoImage' && targetType === 'nanoImage') return true
  if (sourceType === 'textPrompt' && targetType === 'imageImport') return true
  if (sourceType === 'textPrompt' && targetType === 'nanoImage') return true
  if (sourceType === 'textPrompt' && targetType === 'motionPrompt') return true
  if (sourceType === 'motionPrompt' && targetType === 'nanoImage') return true
  if (sourceType === 'motionPrompt' && targetType === 'geminiVideo') return true
  if (sourceType === 'nanoImage' && targetType === 'geminiVideo') return true
  if (sourceType === 'imageImport' && targetType === 'geminiVideo') return true
  // Kling connections
  if (sourceType === 'motionPrompt' && targetType === 'klingVideo') return true
  if (sourceType === 'textPrompt' && targetType === 'klingVideo') return true
  if (sourceType === 'nanoImage' && targetType === 'klingVideo') return true
  if (sourceType === 'imageImport' && targetType === 'klingVideo') return true
  // Grid Node connections
  if (sourceType === 'textPrompt' && targetType === 'gridNode') return true
  if (sourceType === 'motionPrompt' && targetType === 'gridNode') return true
  if (sourceType === 'gridNode' && targetType === 'nanoImage') return true
  // Cell Regenerator connections
  if (sourceType === 'gridNode' && targetType === 'cellRegenerator') return true
  if (sourceType === 'nanoImage' && targetType === 'cellRegenerator') return true
  if (sourceType === 'imageImport' && targetType === 'cellRegenerator') return true
  if (sourceType === 'cellRegenerator' && targetType === 'nanoImage') return true
  if (sourceType === 'cellRegenerator' && targetType === 'imageImport') return true
  // Grid Composer connections
  if (sourceType === 'gridNode' && targetType === 'gridComposer') return true
  if (sourceType === 'nanoImage' && targetType === 'gridComposer') return true
  if (sourceType === 'imageImport' && targetType === 'gridComposer') return true
  if (sourceType === 'cellRegenerator' && targetType === 'gridComposer') return true
  if (sourceType === 'gridComposer' && targetType === 'nanoImage') return true
  if (sourceType === 'gridComposer' && targetType === 'imageImport') return true
  if (sourceType === 'gridComposer' && targetType === 'geminiVideo') return true
  if (sourceType === 'gridComposer' && targetType === 'klingVideo') return true
  // LLM Prompt connections
  if (sourceType === 'textPrompt' && targetType === 'llmPrompt') return true
  if (sourceType === 'motionPrompt' && targetType === 'llmPrompt') return true
  if (sourceType === 'imageImport' && targetType === 'llmPrompt') return true
  if (sourceType === 'nanoImage' && targetType === 'llmPrompt') return true
  if (sourceType === 'gridComposer' && targetType === 'llmPrompt') return true
  if (sourceType === 'llmPrompt' && targetType === 'textPrompt') return true
  if (sourceType === 'llmPrompt' && targetType === 'nanoImage') return true
  if (sourceType === 'llmPrompt' && targetType === 'motionPrompt') return true
  if (sourceType === 'llmPrompt' && targetType === 'gridNode') return true
  if (sourceType === 'llmPrompt' && targetType === 'geminiVideo') return true
  if (sourceType === 'llmPrompt' && targetType === 'klingVideo') return true
  return false
}

const getExecutionOrder = (nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
  const incoming = new Map<string, number>()
  const outgoing = new Map<string, string[]>()

  nodes.forEach((node) => {
    incoming.set(node.id, 0)
    outgoing.set(node.id, [])
  })

  edges.forEach((edge) => {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1)
    outgoing.get(edge.source)?.push(edge.target)
  })

  const queue = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0)
  const order: string[] = []

  while (queue.length) {
    const node = queue.shift()
    if (!node) break
    order.push(node.id)
    const neighbors = outgoing.get(node.id) ?? []
    neighbors.forEach((neighbor) => {
      incoming.set(neighbor, (incoming.get(neighbor) ?? 1) - 1)
      if ((incoming.get(neighbor) ?? 0) === 0) {
        const neighborNode = nodes.find((candidate) => candidate.id === neighbor)
        if (neighborNode) queue.push(neighborNode)
      }
    })
  }

  return order
}

const getIncomingNodes = (
  nodeId: string,
  edges: WorkflowEdge[],
  nodes: WorkflowNode[],
) =>
  edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => nodes.find((node) => node.id === edge.source))
    .filter(Boolean) as WorkflowNode[]

const getIncomingTextPrompt = (
  nodeId: string,
  edges: WorkflowEdge[],
  nodes: WorkflowNode[],
) => {
  const promptEdge = edges.find((edge) => edge.target === nodeId)
  if (!promptEdge) return undefined
  const promptNode = nodes.find((node) => node.id === promptEdge.source)
  if (!promptNode || promptNode.type !== 'textPrompt') return undefined
  return (promptNode.data as TextPromptNodeData).prompt
}

const STORAGE_KEY = 'nano-banana-workflow-v3'

// Helper function to make error messages more user-friendly
const formatErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) return '예상치 못한 오류가 발생했습니다.'
  
  const message = error.message.toLowerCase()
  
  // API quota exceeded
  if (message.includes('quota') && message.includes('exceeded')) {
    return 'API 할당량이 초과되었습니다. 잠시 후 다시 시도해주세요.'
  }
  
  // Other common errors
  if (message.includes('network') || message.includes('fetch')) {
    return '네트워크 연결을 확인해주세요.'
  }
  
  if (message.includes('api key') || message.includes('unauthorized')) {
    return 'API 키를 확인해주세요.'
  }
  
  // Return original message if no match
  return error.message
}

const sanitizeNodesForStorage = (nodes: WorkflowNode[], forExport = false): WorkflowNode[] =>
  nodes.map((node) => {
    const data = { ...(node.data as Record<string, unknown>) }
    
    // 이제 localStorage에도 이미지를 저장합니다
    // base64 DataURL은 유지 (새로고침 후에도 복원됨)
    // 단, blob URL은 제거 (페이지 재로드 시 무효화됨)
    
    // Always remove blob URLs (they don't survive page reload)
    if (typeof data.imageUrl === 'string' && data.imageUrl.startsWith('blob:')) {
      delete data.imageUrl
      delete data.width
      delete data.height
    }
    if (typeof data.outputImageUrl === 'string' && data.outputImageUrl.startsWith('blob:')) {
      delete data.outputImageUrl
    }
    if (typeof data.inputImageUrl === 'string' && data.inputImageUrl.startsWith('blob:')) {
      delete data.inputImageUrl
    }
    if (typeof data.composedImageUrl === 'string' && data.composedImageUrl.startsWith('blob:')) {
      delete data.composedImageUrl
    }
    
    // regeneratedImages 객체 내부의 blob URL도 제거
    if (data.regeneratedImages && typeof data.regeneratedImages === 'object') {
      const cleanedImages: Record<string, string> = {}
      for (const [key, value] of Object.entries(data.regeneratedImages)) {
        if (typeof value === 'string' && !value.startsWith('blob:')) {
          cleanedImages[key] = value
        }
      }
      data.regeneratedImages = cleanedImages
    }
    
    // inputImages 객체 내부의 blob URL도 제거
    if (data.inputImages && typeof data.inputImages === 'object') {
      const cleanedImages: Record<string, string> = {}
      for (const [key, value] of Object.entries(data.inputImages)) {
        if (typeof value === 'string' && !value.startsWith('blob:')) {
          cleanedImages[key] = value
        }
      }
      data.inputImages = cleanedImages
    }
    if (typeof data.outputVideoUrl === 'string' && data.outputVideoUrl.startsWith('blob:')) {
      delete data.outputVideoUrl
    }
    
    // Reset status for all generation nodes
    if (node.type === 'nanoImage') {
      data.status = 'idle'
      delete data.error
      delete data.lastExecutionTime
    }
    if (node.type === 'geminiVideo') {
      data.status = 'idle'
      data.progress = 0
      delete data.error
      delete data.lastExecutionTime
    }
    if (node.type === 'klingVideo') {
      data.status = 'idle'
      data.progress = 0
      delete data.error
      delete data.taskId
      delete data.lastExecutionTime
    }
    return { ...node, data: data as NodeData }
  })

const MAX_HISTORY_SIZE = 20

const saveToHistory = (get: () => FlowState, set: (state: Partial<FlowState>) => void) => {
  const { nodes, edges, history, historyIndex } = get()
  
  // Remove any history after current index (when undoing then making new changes)
  const newHistory = history.slice(0, historyIndex + 1)
  
  // Add current state
  newHistory.push({ nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) })
  
  // Keep only last MAX_HISTORY_SIZE states
  if (newHistory.length > MAX_HISTORY_SIZE) {
    newHistory.shift()
  }
  
  set({ 
    history: newHistory, 
    historyIndex: newHistory.length - 1 
  })
}

// ⚡ Throttled localStorage for better performance
const createThrottledStorage = () => {
  let saveTimeout: NodeJS.Timeout | null = null
  const SAVE_DELAY = 1000 // 1초 throttle

  return {
    getItem: (name: string) => {
      const value = localStorage.getItem(name)
      return value ? JSON.parse(value) : null
    },
    setItem: (name: string, value: any) => {
      // Throttle: 1초 동안 여러 번 호출되면 마지막 것만 저장
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      
      saveTimeout = setTimeout(() => {
        try {
          const serialized = JSON.stringify(value)
          localStorage.setItem(name, serialized)
          console.log('💾 Throttled save completed')
        } catch (error) {
          console.error('❌ Save failed:', error)
        }
      }, SAVE_DELAY)
    },
    removeItem: (name: string) => {
      localStorage.removeItem(name)
    },
  }
}

export const useFlowStore = create<FlowState>()(
  persist(
    (set, get) => ({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      // .env 파일에서 API 키 자동 로드
      apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
      klingApiKey: import.meta.env.VITE_KLING_API_KEY || '',
      openaiApiKey: import.meta.env.VITE_OPENAI_API_KEY || '',  // OpenAI API Key
      abortControllers: new Map(),
      history: [],
      historyIndex: -1,
      imageModal: { isOpen: false, imageUrl: null },
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setApiKey: (key) => set({ apiKey: key }),
      setKlingApiKey: (key) => set({ klingApiKey: key }),
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),  // OpenAI API Key Setter
      openImageModal: (imageUrl) => set({ imageModal: { isOpen: true, imageUrl } }),
      closeImageModal: () => set({ imageModal: { isOpen: false, imageUrl: null } }),
  onNodesChange: (changes) => {
    try {
      // 🎯 성능 최적화: position 변경만 있으면 로그 생략
      const hasNonPositionChange = changes.some(
        change => change.type !== 'position' && change.type !== 'dimensions'
      )
      
      if (hasNonPositionChange) {
        console.log('🔄 onNodesChange:', changes)
      }
      
      // Clean up abort controllers for removed nodes
      const removedNodeIds = changes
        .filter(change => change.type === 'remove')
        .map(change => (change as any).id)
      
      if (removedNodeIds.length > 0) {
        console.log('🗑️ 노드 삭제 시도:', removedNodeIds)
        const { abortControllers } = get()
        removedNodeIds.forEach(id => {
          const controller = abortControllers.get(id)
          if (controller) {
            console.log('🧹 Cleaning up abort controller for deleted node:', id)
            controller.abort()
            abortControllers.delete(id)
          }
        })
        if (removedNodeIds.length > 0) {
          set({ abortControllers: new Map(abortControllers) })
        }
      }
      
      const currentNodes = get().nodes
      const currentEdges = get().edges
      
      const newNodes = applyNodeChanges(changes, currentNodes) as WorkflowNode[]
      const newEdges = normalizeEdges(currentEdges, newNodes)
      
      set({ 
        nodes: newNodes,
        edges: newEdges
      })
      
      // ⚡ 성능 최적화: add/remove만 history 저장 (position/select는 제외)
      const shouldSaveHistory = changes.some(change => 
        change.type === 'add' || change.type === 'remove'
      )
      if (shouldSaveHistory) {
        saveToHistory(get, set)
      }
    } catch (error) {
      console.error('❌ Error in onNodesChange:', error)
      // 에러 발생해도 앱이 멈추지 않도록
    }
  },
  onEdgesChange: (changes) => {
    try {
      const currentEdges = get().edges
      const currentNodes = get().nodes
      const newEdges = applyEdgeChanges(changes, currentEdges)
      
      set({
        edges: normalizeEdges(newEdges, currentNodes),
      })
      
      // Save to history for add/remove changes
      const shouldSaveHistory = changes.some(change => 
        change.type === 'add' || change.type === 'remove'
      )
      if (shouldSaveHistory) {
        saveToHistory(get, set)
      }
    } catch (error) {
      console.error('Error in onEdgesChange:', error)
      // Don't crash the app, just log the error
    }
  },
  onConnect: (connection) => {
    const { source, target } = connection
    if (!source || !target) return
    const sourceNode = get().nodes.find((node) => node.id === source)
    const targetNode = get().nodes.find((node) => node.id === target)
    if (!sourceNode || !targetNode || !sourceNode.type || !targetNode.type) return
    if (!isConnectionAllowed(sourceNode.type, targetNode.type)) return

    set({
      edges: normalizeEdges(
        addEdge(
          {
            ...connection,
            type: 'bezier',
          },
          get().edges,
        ),
        get().nodes,
      ),
    })
    saveToHistory(get, set)
  },
  addNode: (node) => {
    set({ nodes: [...get().nodes, node] })
    saveToHistory(get, set)
  },
  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === id) {
          // Support partial updates by spreading existing data
          const newData = typeof data === 'function' ? data(node.data) : data
          return { ...node, data: { ...node.data, ...newData } }
        }
        return node
      }),
    })
    // Note: persist middleware will automatically save to localStorage
  },
  saveWorkflow: () => {
    try {
      // 📊 persist 미들웨어가 자동으로 저장하므로, 여기서는 백업만 생성
      console.log('💾 백업 생성 중...')
      
      // 저장공간 체크
      const storageInfo = getStorageInfo()
      console.log(`📊 Storage: ${storageInfo.usedMB} MB / ${storageInfo.limitMB} MB (${storageInfo.percentage.toFixed(1)}%)`)
      
      const warning = getStorageWarning(storageInfo)
      if (warning) {
        console.warn(warning)
      }
      
      // persist가 저장한 데이터 가져오기
      const persistedData = localStorage.getItem('nano-banana-workflow-v3')
      if (persistedData) {
        // 🔒 자동 백업 생성 (5분마다 한 번씩만)
        const lastBackupKey = 'last-backup-time'
        const lastBackup = parseInt(localStorage.getItem(lastBackupKey) || '0')
        const now = Date.now()
        const fiveMinutes = 5 * 60 * 1000
        
        if (now - lastBackup > fiveMinutes) {
          // persist 형식 그대로 백업
          createBackup(persistedData)
          localStorage.setItem(lastBackupKey, now.toString())
          console.log('✅ 백업 생성 완료')
        } else {
          console.log('⏭️ 백업 생성 건너뜀 (5분 이내)')
        }
      }
      
      // persist가 자동으로 저장하므로 항상 성공 반환
      return true
    } catch (error) {
      console.error('❌ 백업 생성 실패:', error)
      return false
    }
  },
  loadWorkflow: () => {
    try {
      console.log('🔄 loadWorkflow 호출됨')
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        console.log('ℹ️ localStorage에 데이터 없음')
        return false
      }
      
      const parsed = JSON.parse(raw)
      console.log('📦 localStorage 데이터 파싱 성공:', parsed)
      
      // persist 형식 확인: { state: {...}, version: 0 }
      let nodes: WorkflowNode[] = []
      let edges: WorkflowEdge[] = []
      
      if (parsed.state) {
        // persist 미들웨어 형식
        console.log('✅ persist 형식 감지')
        nodes = Array.isArray(parsed.state.nodes) ? parsed.state.nodes : []
        edges = Array.isArray(parsed.state.edges) ? parsed.state.edges : []
      } else if (parsed.nodes) {
        // 구버전 또는 export 형식
        console.log('ℹ️ 구버전 형식 감지')
        nodes = Array.isArray(parsed.nodes) ? parsed.nodes : []
        edges = Array.isArray(parsed.edges) ? parsed.edges : []
      }
      
      console.log('📊 로드된 데이터:', { nodeCount: nodes.length, edgeCount: edges.length })
      
      if (nodes.length === 0) {
        console.log('⚠️ 노드가 없음')
        return false
      }
      
      set({
        nodes,
        edges: normalizeEdges(edges, nodes),
        selectedNodeId: null,
      })
      
      console.log('✅ 워크플로우 복원 완료')
      return true
    } catch (error) {
      console.error('❌ loadWorkflow 실패:', error)
      return false
    }
  },
  importWorkflow: (nodes, edges) => {
    try {
      const currentState = get()
      const existingNodes = currentState.nodes
      const existingEdges = currentState.edges
      
      // Create ID mapping to avoid conflicts
      const idMap = new Map<string, string>()
      const existingIds = new Set(existingNodes.map(n => n.id))
      
      // Generate new IDs for imported nodes if they conflict
      const newNodes = nodes.map(node => {
        let newId = node.id
        
        // If ID already exists, generate a new one
        if (existingIds.has(newId)) {
          newId = `${node.type}-${crypto.randomUUID?.() ?? Date.now()}`
        }
        
        idMap.set(node.id, newId)
        
        // Calculate offset: place imported nodes to the right of existing nodes
        const maxX = existingNodes.length > 0 
          ? Math.max(...existingNodes.map(n => n.position.x + 250))
          : 0
        
        return {
          ...node,
          id: newId,
          position: {
            x: node.position.x + maxX + 50,
            y: node.position.y
          },
          selected: false,
        }
      })
      
      // Update edge IDs to match new node IDs
      const newEdges = edges.map(edge => {
        const newSource = idMap.get(edge.source) ?? edge.source
        const newTarget = idMap.get(edge.target) ?? edge.target
        
        return {
          ...edge,
          id: `${newSource}-${edge.sourceHandle ?? 'output'}-${newTarget}-${edge.targetHandle ?? 'input'}`,
          source: newSource,
          target: newTarget,
        }
      })
      
      // Merge with existing nodes and edges
      const mergedNodes = [...existingNodes, ...newNodes]
      const mergedEdges = normalizeEdges([...existingEdges, ...newEdges], mergedNodes)
      
      set({
        nodes: mergedNodes,
        edges: mergedEdges,
        selectedNodeId: null,
      })
      
      // Save to history
      saveToHistory(get, set)
      
      return true
    } catch (error) {
      console.error('Import workflow failed:', error)
      return false
    }
  },
  exportWorkflow: () => {
    const { nodes, edges } = get()
    return JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      nodes: sanitizeNodesForStorage(nodes, true), // Keep base64 for export
      edges: sanitizeEdgesForStorage(edges),
    }, null, 2)
  },
  undo: () => {
    const { history, historyIndex } = get()
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1]
      set({
        nodes: JSON.parse(JSON.stringify(previousState.nodes)),
        edges: normalizeEdges(JSON.parse(JSON.stringify(previousState.edges)), previousState.nodes),
        historyIndex: historyIndex - 1,
        selectedNodeId: null,
      })
    }
  },
  redo: () => {
    const { history, historyIndex } = get()
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1]
      set({
        nodes: JSON.parse(JSON.stringify(nextState.nodes)),
        edges: normalizeEdges(JSON.parse(JSON.stringify(nextState.edges)), nextState.nodes),
        historyIndex: historyIndex + 1,
        selectedNodeId: null,
      })
    }
  },
  runNanoImageNode: async (id) => {
    const { nodes, edges, abortControllers } = get()
    const current = nodes.find((node) => node.id === id)
    if (!current || current.type !== 'nanoImage') return

    // ✅ Prevent duplicate execution
    const currentData = current.data as NanoImageNodeData
    if (currentData.status === 'processing') {
      console.warn('⚠️ Node is already processing, skipping duplicate execution')
      return
    }

    // ✅ Rate limiting: Check last execution time
    const now = Date.now()
    const lastExecution = (currentData as any).lastExecutionTime || 0
    const minInterval = 3000 // 3 seconds minimum between executions
    
    if (now - lastExecution < minInterval) {
      const waitTime = Math.ceil((minInterval - (now - lastExecution)) / 1000)
      set({
        nodes: nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: 'error',
                  error: `너무 빠르게 실행했습니다. ${waitTime}초 후 다시 시도해주세요.`,
                },
              }
            : node,
        ),
      })
      return
    }

    // Create abort controller for this execution
    const abortController = new AbortController()
    abortControllers.set(id, abortController)
    set({ abortControllers: new Map(abortControllers) })

    const updateNode = (updater: (data: NodeData) => NodeData) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === id ? { ...node, data: updater(node.data) } : node,
        ),
      })
    }

    const incoming = getIncomingNodes(id, edges, get().nodes)
    
    // Get prompt from various sources
    let prompt = ''
    
    // Check for gridNode
    const gridNodeEdge = edges.find((e) => e.target === id && 
      get().nodes.find(n => n.id === e.source)?.type === 'gridNode')
    
    if (gridNodeEdge) {
      const gridNode = get().nodes.find((n) => n.id === gridNodeEdge.source)
      if (gridNode?.type === 'gridNode') {
        const data = gridNode.data as GridNodeData
        const slotId = gridNodeEdge.sourceHandle
        prompt = slotId ? data.generatedPrompts?.[slotId] || '' : ''
      }
    } else {
      // Check for prompt handle connection
      const promptEdge = edges.find((e) => e.target === id && e.targetHandle === 'prompt')
      if (promptEdge) {
        const promptNode = get().nodes.find((n) => n.id === promptEdge.source)
        prompt =
          promptNode?.type === 'textPrompt'
            ? (promptNode.data as TextPromptNodeData).prompt
            : promptNode?.type === 'motionPrompt'
              ? (promptNode.data as MotionPromptNodeData).combinedPrompt
              : promptNode?.type === 'llmPrompt'
                ? (promptNode.data as any).outputPrompt || ''
                : ''
      } else {
        // Fallback: Original prompt logic (any connection)
        const promptNode = incoming.find(
          (node) => node.type === 'textPrompt' || node.type === 'motionPrompt' || node.type === 'llmPrompt',
        )
        prompt =
          promptNode?.type === 'textPrompt'
            ? (promptNode.data as TextPromptNodeData).prompt
            : promptNode?.type === 'motionPrompt'
              ? (promptNode.data as MotionPromptNodeData).combinedPrompt
              : promptNode?.type === 'llmPrompt'
                ? (promptNode.data as any).outputPrompt || ''
                : ''
      }
    }
    
    // Collect multiple reference images
    const referenceImages: string[] = []
    const referencePrompts: string[] = []
    const data = current.data as NanoImageNodeData
    const maxRefs = data.maxReferences || 3
    
    // Check each ref-N handle
    for (let i = 1; i <= maxRefs; i++) {
      const refEdge = edges.find((e) => e.target === id && e.targetHandle === `ref-${i}`)
      if (refEdge) {
        const refNode = get().nodes.find((n) => n.id === refEdge.source)
        if (refNode) {
          let imageDataUrl: string | undefined
          let refPrompt: string | undefined
          
          if (refNode.type === 'imageImport') {
            const imgData = refNode.data as ImageImportNodeData
            imageDataUrl = imgData.imageDataUrl
            refPrompt = getIncomingTextPrompt(refNode.id, edges, get().nodes) ?? imgData.referencePrompt
          } else if (refNode.type === 'nanoImage') {
            const imgData = refNode.data as NanoImageNodeData
            imageDataUrl = imgData.outputImageDataUrl
          } else if (refNode.type === 'gridComposer') {
            const imgData = refNode.data as any
            imageDataUrl = imgData.composedImageDataUrl || imgData.composedImageUrl
          } else if (refNode.type === 'cellRegenerator') {
            const imgData = refNode.data as any
            // For cell regenerator, try to get image from sourceHandle (e.g., S1, S2, etc.)
            const cellId = refEdge.sourceHandle
            if (cellId && imgData.regeneratedImages?.[cellId]) {
              imageDataUrl = imgData.regeneratedImages[cellId]
            }
          }
          
          if (imageDataUrl) {
            // 🔥 Convert idb: or s3: reference to actual DataURL
            if (imageDataUrl.startsWith('idb:') || imageDataUrl.startsWith('s3:')) {
              try {
                const actualDataUrl = await getImage(imageDataUrl)
                if (actualDataUrl) {
                  referenceImages.push(actualDataUrl)
                } else {
                  console.warn(`⚠️ Failed to load reference image: ${imageDataUrl}`)
                }
              } catch (error) {
                console.error(`❌ Error loading reference image: ${imageDataUrl}`, error)
              }
            } else {
              referenceImages.push(imageDataUrl)
            }
            
            if (refPrompt) {
              referencePrompts.push(`Reference ${i}: ${refPrompt}`)
            }
          }
        }
      }
    }
    
    // Fallback: Check for old-style connection (no handle specified)
    if (referenceImages.length === 0) {
      const imageNode =
        incoming.find((node) => node.type === 'imageImport') ??
        incoming.find((node) => node.type === 'nanoImage') ??
        incoming.find((node) => node.type === 'gridComposer') ??
        incoming.find((node) => node.type === 'cellRegenerator')

      let inputImageDataUrl: string | undefined
      
      if (imageNode?.type === 'imageImport') {
        inputImageDataUrl = (imageNode.data as ImageImportNodeData).imageDataUrl
      } else if (imageNode?.type === 'nanoImage') {
        inputImageDataUrl = (imageNode.data as NanoImageNodeData).outputImageDataUrl
      } else if (imageNode?.type === 'gridComposer') {
        const imgData = imageNode.data as any
        inputImageDataUrl = imgData.composedImageDataUrl || imgData.composedImageUrl
      } else if (imageNode?.type === 'cellRegenerator') {
        // For cell regenerator without specific handle, we can't determine which cell to use
        // User should use specific cell output handles (S1, S2, etc.)
        inputImageDataUrl = undefined
      }
      
      const referencePrompt =
        imageNode?.type === 'imageImport'
          ? getIncomingTextPrompt(imageNode.id, edges, get().nodes) ??
            (imageNode.data as ImageImportNodeData).referencePrompt
          : undefined
      
      if (inputImageDataUrl) {
        // 🔥 Convert idb: or s3: reference to actual DataURL
        if (inputImageDataUrl.startsWith('idb:') || inputImageDataUrl.startsWith('s3:')) {
          try {
            const actualDataUrl = await getImage(inputImageDataUrl)
            if (actualDataUrl) {
              referenceImages.push(actualDataUrl)
            } else {
              console.warn(`⚠️ Failed to load fallback reference image: ${inputImageDataUrl}`)
            }
          } catch (error) {
            console.error(`❌ Error loading fallback reference image: ${inputImageDataUrl}`, error)
          }
        } else {
          referenceImages.push(inputImageDataUrl)
        }
        
        if (referencePrompt) {
          referencePrompts.push(`Reference 1: ${referencePrompt}`)
        }
      }
    }

    if (!prompt.trim()) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '텍스트 프롬프트 노드를 연결해 주세요.',
      }))
      return
    }

    const apiKey = get().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ''
    
    if (!apiKey) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: 'Gemini API Key가 필요합니다. 상단 "API Key" 버튼을 눌러서 설정하세요.',
      }))
      return
    }

    updateNode((prev) => ({
      ...prev,
      status: 'processing',
      error: undefined,
      lastExecutionTime: now,
    }))

    const client = new GeminiAPIClient(apiKey)

    try {
      // Check if aborted before starting
      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

      // Check if Grid Composer + LLM Prompt are connected
      const gridComposerEdge = edges.find(e => e.target === id && get().nodes.find(n => n.id === e.source)?.type === 'gridComposer')
      const gridComposerNode = gridComposerEdge ? get().nodes.find(n => n.id === gridComposerEdge.source) : null
      const hasGridComposerRef = referenceImages.length > 0 && !!gridComposerEdge
      
      const llmPromptEdge = edges.find(e => 
        e.target === id && 
        e.targetHandle === 'prompt' && 
        get().nodes.find(n => n.id === e.source)?.type === 'llmPrompt'
      )
      const llmPromptNode = llmPromptEdge ? get().nodes.find(n => n.id === llmPromptEdge.source) : null
      const hasLLMPrompt = !!llmPromptNode
      
      // Get reference mode from LLM Prompt Helper
      const referenceMode = (llmPromptNode?.data as any)?.referenceMode || 'exact'
      
      // Extract Grid Composer label info (for Nano Banana)
      let gridLabelInfoForNano = ''
      if (gridComposerNode && gridComposerNode.type === 'gridComposer') {
        const gridData = gridComposerNode.data as any
        if (gridData.inputImages && gridData.slots) {
          const layout = gridData.gridLayout || '1x3'
          const slots = gridData.slots as Array<{ id: string; label: string; metadata?: string }>
          
          const slotDescriptions = slots
            .filter(slot => gridData.inputImages[slot.id])
            .map((slot, index) => {
              const position = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째'][index] || `${index + 1}번째`
              let description = `- ${position} 참고 요소 (${slot.id}): ${slot.label}`
              if (slot.metadata && slot.metadata.trim()) {
                description += ` - ${slot.metadata}`
              }
              return description
            })
            .join('\n')
          
          if (slotDescriptions) {
            gridLabelInfoForNano = `\n\n📋 참고 이미지 구성 (${layout} 그리드):\n${slotDescriptions}\n\n`
          }
        }
      }
      
      // Check if Motion Prompt is connected (for camera transformation)
      const motionPromptEdge = edges.find(e => 
        e.target === id && 
        e.targetHandle === 'prompt' && 
        get().nodes.find(n => n.id === e.source)?.type === 'motionPrompt'
      )
      const motionPromptNode = motionPromptEdge ? get().nodes.find(n => n.id === motionPromptEdge.source) : null
      const hasMotionPrompt = !!motionPromptNode
      
      // Add reference prompts to main prompt if available
      let enhancedPrompt = referencePrompts.length > 0
        ? `${prompt}\n\n${referencePrompts.join('\n')}`
        : prompt
      
      // 🎥 Motion Prompt + Reference Image: Force camera transformation
      if (hasMotionPrompt && referenceImages.length > 0) {
        const motionData = motionPromptNode?.data as MotionPromptNodeData
        const hasCameraMovement = 
          (motionData.cameraRotation && motionData.cameraRotation !== 0) ||
          (motionData.cameraTilt && motionData.cameraTilt !== 0) ||
          (motionData.cameraDistance && motionData.cameraDistance !== 1.0)
        
        if (hasCameraMovement) {
          // Check if 90-degree rotation is specified
          const has90DegreeRotation = Math.abs(motionData.cameraRotation || 0) === 90
          const rotationDirection = (motionData.cameraRotation || 0) > 0 ? 'right' : 'left'
          const visibleSide = (motionData.cameraRotation || 0) > 0 ? 'LEFT' : 'RIGHT'
          
          let specialRotationNote = ''
          if (has90DegreeRotation) {
            specialRotationNote = `

🚨 CRITICAL 90-DEGREE SIDE VIEW INSTRUCTION:
The prompt specifies "rotate ${rotationDirection} 90°" - this is a PERPENDICULAR side view!

MANDATORY REQUIREMENTS for 90° rotation:
✅ Camera positioned at COMPLETE 90-degree angle (perpendicular to subject)
✅ Subject facing PERPENDICULAR to camera (left-to-right across frame)
✅ ONLY ${visibleSide} side profile visible (complete side view)
✅ NO frontal face visible - pure lateral perspective
✅ Subject appears in profile, oriented across the frame horizontally
✅ This is NOT a frontal or three-quarter view - it's a FULL SIDE VIEW

🚫 ABSOLUTELY FORBIDDEN at 90°:
❌ Showing any frontal face
❌ Any three-quarter or angled view
❌ Subject facing toward camera
❌ Any frontal perspective elements

90° means PERPENDICULAR - imagine looking at subject from directly their ${rotationDirection} side.`
          }
          
          enhancedPrompt = `🎬 CRITICAL: CAMERA TRANSFORMATION WITH CHARACTER CONSISTENCY 🎬${specialRotationNote}

⚠️ MANDATORY INSTRUCTIONS (PRIORITY ORDER):

1️⃣ HIGHEST PRIORITY - CHARACTER/STYLE CONSISTENCY (from reference image):
   ✅ MUST PRESERVE EXACTLY:
   - Character facial features, hair, eye color, skin tone
   - Character clothing, outfit design, colors, materials
   - Character body proportions, build, posture style
   - Lighting quality, color palette, tone, mood
   - Visual style, textures, rendering quality
   - Background architectural elements, props, environment
   
   🚫 ABSOLUTELY FORBIDDEN:
   - Changing character appearance (face, hair, body)
   - Changing outfit design, colors, or materials
   - Changing color palette or visual tone
   - Altering character identity or features

2️⃣ SECOND PRIORITY - CAMERA TRANSFORMATION (from prompt):
   📷 REQUIRED CAMERA CHANGES:
   ${prompt}
   
   ✅ YOU MUST:
   - Apply the specified camera angle/rotation
   - Apply the specified camera tilt (high/low angle)
   - Apply the specified camera distance/zoom
   - Change viewpoint perspective from reference
   
   🚨 SPECIAL: If "rotate right/left 90°" is specified:
   - This means PERPENDICULAR side view (NOT frontal!)
   - Camera positioned at 90-degree angle to subject
   - Subject faces PERPENDICULAR to camera (left-to-right across frame)
   - ONLY one side profile visible, NO frontal face
   - Complete lateral/side perspective
   
   🚫 DO NOT:
   - Keep the same camera angle as reference
   - Ignore camera transformation instructions
   - Show frontal face when 90° is specified

🎯 EXECUTION STRATEGY:
Step 1: Extract visual identity from reference (character, style, colors)
Step 2: Apply camera transformation to that exact character/scene
Step 3: Verify character consistency is maintained

💡 ANALOGY: You're photographing the SAME character from a DIFFERENT angle.
- The character stays IDENTICAL
- Only the camera moves to a new position

✨ FINAL CHECK:
- Does the character look EXACTLY like the reference? ✓
- Is the camera angle DIFFERENT from reference? ✓
- Both must be TRUE for success!

Generate the image maintaining PERFECT character consistency while applying the EXACT camera transformation specified above.`
        }
      }
      
      // 🎯 Grid Composer + LLM: 참조 정확도에 따라 지시 추가
      else if (hasGridComposerRef && hasLLMPrompt) {
        if (referenceMode === 'exact') {
          // 정확성 모드: 참조 이미지 PIXEL-LEVEL 복제
          enhancedPrompt = `⚠️⚠️⚠️ CRITICAL: EXACT REFERENCE IMAGE REPLICATION REQUIRED ⚠️⚠️⚠️
${gridLabelInfoForNano}
STRICT MODE: Reference image is ABSOLUTE PRIMARY source.
Text prompt = ONLY for understanding story/actions. Your task = PIXEL-PERFECT VISUAL COPY.

📌 TEXT PROMPT = STORY/ACTIONS (PRESERVE 100%):
- If text says "holding helmet" → Generate "holding helmet" (NOT "wearing helmet"!)
- If text says "walking" → Generate "walking" (keep action!)
- If text says "one person" → Generate "one person" (NOT "two"!)
- Preserve ALL actions, character counts, story elements from text prompt

🎨 REFERENCE IMAGE = VISUAL DESIGN (REPLICATE 100%):
- S1 Background: Copy EXACT colors, lighting, structure, materials
- S2 Character: Copy EXACT appearance, outfit, hair, facial features
- S3 Object/Robot: Copy EXACT colors (red=red, white=white), shape, design
- Use reference for HOW things LOOK, use text for WHAT is HAPPENING

🚫 ABSOLUTELY FORBIDDEN:
- Changing actions ("holding" → "wearing", "walking" → "standing")
- Changing character count ("one" → "two")
- Reinterpreting background (S1 must match EXACTLY!)
- ANY color changes (red→red, blue→blue, white→white, black→black)
- ANY material changes (metal→metal, fabric→fabric, plastic→plastic)
- ANY shape, proportion, design modifications
- ANY creative variations or "similar" versions
- ANY artistic interpretation of reference visuals

✅ MANDATORY REQUIREMENTS:
- EXACT pixel-by-pixel visual replication of S1, S2, S3 elements
- 100% color preservation (use exact RGB values from reference)
- 100% material/texture preservation from reference
- 100% lighting/shadow preservation from reference
- 100% action/story preservation from text prompt
- If text says "holding helmet", person MUST be holding (not wearing) helmet
- Background MUST match S1 reference exactly
- Reference visuals = TOP PRIORITY for appearance
- Text prompt = TOP PRIORITY for actions/story

Extract visual characteristics from each labeled section and replicate EXACTLY. Use text prompt ONLY for understanding actions and story flow.

---

${enhancedPrompt}`
        } else if (referenceMode === 'balanced') {
          // 균형 모드: 텍스트와 이미지 균형
          enhancedPrompt = `⚖️ BALANCED MODE: Reference Image + Text Prompt
${gridLabelInfoForNano}
Use reference image AND text prompt equally:
- Reference image: Visual style, colors, materials, composition of each labeled element
- Text prompt: Specific details, arrangement, actions, story

⚠️ IMPORTANT: Preserve actions from text prompt (e.g., "holding" stays "holding", not "wearing").

Maintain visual consistency with reference while incorporating text details.

---

${enhancedPrompt}`
        } else if (referenceMode === 'creative') {
          // 창의성 모드: 텍스트 위주, 이미지는 영감만
          enhancedPrompt = `🎨 CREATIVE MODE: Text Prompt Primary
${gridLabelInfoForNano}
Focus on text prompt as main instruction.
Reference image = INSPIRATION ONLY (style, mood, general aesthetic).

Feel free to creatively interpret and generate based on text description.

---

${enhancedPrompt}`
        }
      }
      
      const model = data.model ?? 'gemini-3-pro-image-preview'
      
      console.log('🎨 Nano Image Generation:', {
        model,
        resolution: data.resolution,
        aspectRatio: data.aspectRatio,
        referenceCount: referenceImages.length,
        referenceMode: hasGridComposerRef ? referenceMode : 'N/A',
      })
      
      // Use first reference image as primary input (for backward compatibility)
      const primaryReference = referenceImages[0]
      
      // ✅ Apply retry logic with exponential backoff
      const result = await retryWithBackoff(
        () => client.generateImage(
          enhancedPrompt,
          data.aspectRatio,
          primaryReference,
          model,
          data.resolution,
          abortController.signal,
        ),
        {
          maxAttempts: 3,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            console.warn(`🔄 Retry attempt ${attempt}:`, error.message)
            updateNode((prev) => ({
              ...prev,
              error: `재시도 중... (${attempt}/3)`,
            }))
          },
        }
      )

      // Check if aborted after completion
      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

      // 🔥 IndexedDB/S3에 이미지 저장하고 참조 반환
      let savedImageRef = result.imageDataUrl
      try {
        const imageId = `nano-output-${id}-${Date.now()}`
        console.log('💾 Nano Image: IndexedDB/S3에 출력 이미지 저장 시작...', imageId)
        
        savedImageRef = await saveImage(imageId, result.imageDataUrl, id, true)
        console.log('✅ Nano Image: 출력 이미지 저장 완료', savedImageRef)
      } catch (error) {
        console.error('❌ Nano Image: 출력 이미지 저장 실패, DataURL을 직접 사용', error)
        // 폴백: DataURL을 직접 사용 (비권장)
      }

      updateNode((prev) => ({
        ...prev,
        status: 'completed',
        outputImageUrl: result.imageUrl,
        outputImageDataUrl: savedImageRef, // idb:xxx 또는 s3:xxx 참조
        generatedModel: model,
        generatedResolution: data.resolution,
        generatedAspectRatio: data.aspectRatio,
        error: undefined,
      }))
    } catch (error) {
      // Don't show retry errors if aborted
      if (!abortController.signal.aborted) {
        updateNode((prev) => ({
          ...prev,
          status: 'error',
          error: formatErrorMessage(error),
        }))
      }
    } finally {
      // Clean up abort controller
      const controllers = get().abortControllers
      controllers.delete(id)
      set({ abortControllers: new Map(controllers) })
    }
  },
  runGeminiNode: async (id) => {
    const { nodes, edges, abortControllers } = get()
    const current = nodes.find((node) => node.id === id)
    if (!current || current.type !== 'geminiVideo') return

    // ✅ Prevent duplicate execution
    const currentData = current.data as GeminiVideoNodeData
    if (currentData.status === 'processing') {
      console.warn('⚠️ Gemini node is already processing')
      return
    }
    
    // 🧹 이전 에러 먼저 지우기
    set({
      nodes: get().nodes.map((node) =>
        node.id === id
          ? { ...node, data: { ...node.data, error: undefined } }
          : node
      ),
    })

    // ✅ Rate limiting
    const now = Date.now()
    const lastExecution = (currentData as any).lastExecutionTime || 0
    const minInterval = 5000 // 5 seconds for video (longer than image)
    
    if (now - lastExecution < minInterval) {
      const waitTime = Math.ceil((minInterval - (now - lastExecution)) / 1000)
      set({
        nodes: nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: 'error',
                  error: `너무 빠르게 실행했습니다. ${waitTime}초 후 다시 시도해주세요.`,
                },
              }
            : node,
        ),
      })
      return
    }

    // Create abort controller for this execution
    const abortController = new AbortController()
    abortControllers.set(id, abortController)
    set({ abortControllers: new Map(abortControllers) })

    const updateNode = (updater: (data: NodeData) => NodeData) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === id ? { ...node, data: updater(node.data) } : node,
        ),
      })
    }

    const incoming = getIncomingNodes(id, edges, get().nodes)
    const imageNode =
      incoming.find((node) => node.type === 'imageImport') ??
      incoming.find((node) => node.type === 'nanoImage') ??
      incoming.find((node) => node.type === 'gridComposer') ??
      incoming.find((node) => node.type === 'cellRegenerator')
    const promptNode = incoming.find(
      (node) => node.type === 'motionPrompt' || node.type === 'textPrompt' || node.type === 'llmPrompt',
    )

    let inputImageUrl: string | undefined
    let inputImageDataUrl: string | undefined
    
    if (imageNode?.type === 'imageImport') {
      inputImageUrl = (imageNode.data as ImageImportNodeData).imageUrl
      inputImageDataUrl = (imageNode.data as ImageImportNodeData).imageDataUrl
    } else if (imageNode?.type === 'nanoImage') {
      inputImageUrl = (imageNode.data as NanoImageNodeData).outputImageUrl
      inputImageDataUrl = (imageNode.data as NanoImageNodeData).outputImageDataUrl
    } else if (imageNode?.type === 'gridComposer') {
      const imgData = imageNode.data as any
      inputImageUrl = imgData.composedImageUrl || imgData.composedImageDataUrl
      inputImageDataUrl = imgData.composedImageDataUrl || imgData.composedImageUrl
    } else if (imageNode?.type === 'cellRegenerator') {
      // Cell Regenerator should use specific cell outputs
      inputImageUrl = undefined
      inputImageDataUrl = undefined
    }

    const inputPrompt =
      promptNode?.type === 'motionPrompt'
        ? (promptNode.data as MotionPromptNodeData).combinedPrompt
        : promptNode?.type === 'textPrompt'
          ? (promptNode.data as TextPromptNodeData).prompt
          : promptNode?.type === 'llmPrompt'
            ? (promptNode.data as any).outputPrompt || ''
            : ''

    // ⚠️ Early validation BEFORE storage conversion (only check if nodes are connected)
    if (!inputPrompt) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '프롬프트 노드를 연결해 주세요.',
      }))
      return
    }
    
    if (!imageNode) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '이미지 노드를 연결해 주세요.',
      }))
      return
    }
    
    if (!inputImageDataUrl) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '이미지 노드가 연결되었지만 이미지가 생성되지 않았습니다. 이미지 노드에서 "Generate" 버튼을 눌러주세요.',
      }))
      return
    }

    const apiKey = get().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ''
    
    if (!apiKey) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: 'Gemini API Key가 필요합니다. 상단 "API Key" 버튼을 눌러서 설정하세요.',
      }))
      return
    }

    updateNode((prev) => ({
      ...prev,
      status: 'processing',
      error: undefined,
      inputImageUrl,
      inputImageDataUrl,
      inputPrompt,
      progress: 10,
      lastExecutionTime: now,
    }))

    const client = new GeminiAPIClient(apiKey)
    
    // ✅ Convert storage references to actual DataURLs
    let actualInputImageDataUrl = inputImageDataUrl
    
    console.log('🔍 Gemini: Input image type:', inputImageDataUrl?.substring(0, 50))
    
    if (inputImageDataUrl && (inputImageDataUrl.startsWith('idb:') || inputImageDataUrl.startsWith('s3:'))) {
      console.log('🔄 Gemini: Converting image from storage reference...')
      try {
        const { getImage } = await import('../utils/indexedDB')
        const dataURL = await getImage(inputImageDataUrl)
        if (dataURL) {
          actualInputImageDataUrl = dataURL
          console.log('✅ Gemini: Image loaded from storage, size:', dataURL.length, 'chars')
        } else {
          console.error('❌ Gemini: Failed to load image from storage')
          updateNode((prev) => ({
            ...prev,
            status: 'error',
            error: '이미지를 Storage에서 로드할 수 없습니다.',
          }))
          return
        }
      } catch (error) {
        console.error('❌ Gemini: Error loading image:', error)
        updateNode((prev) => ({
          ...prev,
          status: 'error',
          error: `이미지 로드 실패: ${error}`,
        }))
        return
      }
    } else if (!inputImageDataUrl) {
      console.error('❌ Gemini: No input image provided!')
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '입력 이미지가 제공되지 않았습니다.',
      }))
      return
    } else {
      console.log('✅ Gemini: Using direct DataURL (not a storage reference)')
    }
    
    console.log('🎬 Gemini Video 생성 시작:', {
      prompt: inputPrompt.substring(0, 50) + '...',
      model: (current.data as GeminiVideoNodeData).model,
      imageType: actualInputImageDataUrl?.substring(0, 30),
      imageSize: actualInputImageDataUrl?.length,
    })
    
    // ✅ Final validation before API call
    if (!actualInputImageDataUrl || actualInputImageDataUrl.startsWith('idb:') || actualInputImageDataUrl.startsWith('s3:')) {
      console.error('❌ Gemini: Image is still a storage reference or empty!', actualInputImageDataUrl?.substring(0, 50))
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '이미지 변환 실패. Storage 참조가 남아있습니다.',
      }))
      return
    }
    
    console.log('✅ Gemini: All validations passed, calling API...')

    const progressTimer = setInterval(() => {
      updateNode((prev) => {
        const data = prev as GeminiVideoNodeData
        if (data.status !== 'processing') return prev
        return {
          ...prev,
          progress: Math.min(data.progress + 12, 90),
        }
      })
    }, 500)

    try {
      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

      const settings = current.data as GeminiVideoNodeData
      
      // ✅ Apply retry logic
      const outputVideoUrl = await retryWithBackoff(
        () => client.generateMedia(
          inputPrompt,
          {
            mediaType: 'video',
            duration: settings.duration,
            quality: settings.quality,
            motionIntensity: settings.motionIntensity,
          },
          actualInputImageDataUrl,
          settings.model,
          abortController.signal,
        ),
        {
          maxAttempts: 2, // Less retries for video (expensive)
          initialDelay: 2000,
          onRetry: (attempt) => {
            console.warn(`🔄 Gemini Video retry ${attempt}/2`)
            updateNode((prev) => ({
              ...prev,
              error: `재시도 중... (${attempt}/2)`,
            }))
          },
        }
      )

      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

      updateNode((prev) => ({
        ...prev,
        status: 'completed',
        outputVideoUrl,
        progress: 100,
        error: undefined,
      }))

    } catch (error) {
      if (!abortController.signal.aborted) {
        updateNode((prev) => ({
          ...prev,
          status: 'error',
          error: formatErrorMessage(error),
        }))
      }
    } finally {
      clearInterval(progressTimer)
      const controllers = get().abortControllers
      controllers.delete(id)
      set({ abortControllers: new Map(controllers) })
    }
  },
  runKlingNode: async (id) => {
    const { nodes, edges, abortControllers } = get()
    const current = nodes.find((node) => node.id === id)
    if (!current || current.type !== 'klingVideo') return

    // ✅ Prevent duplicate execution
    const currentData = current.data as KlingVideoNodeData
    if (currentData.status === 'processing') {
      console.warn('⚠️ Kling node is already processing')
      return
    }

    // ✅ Rate limiting
    const now = Date.now()
    const lastExecution = (currentData as any).lastExecutionTime || 0
    const minInterval = 5000 // 5 seconds for video
    
    if (now - lastExecution < minInterval) {
      const waitTime = Math.ceil((minInterval - (now - lastExecution)) / 1000)
      set({
        nodes: nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  status: 'error',
                  error: `너무 빠르게 실행했습니다. ${waitTime}초 후 다시 시도해주세요.`,
                },
              }
            : node,
        ),
      })
      return
    }

    // Create abort controller for this execution
    const abortController = new AbortController()
    abortControllers.set(id, abortController)
    set({ abortControllers: new Map(abortControllers) })

    const updateNode = (updater: (data: NodeData) => NodeData) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === id ? { ...node, data: updater(node.data) } : node,
        ),
      })
    }

    // Start Image (기본 이미지) - 'start' 핸들 또는 핸들 ID 없는 연결
    const startImageEdges = edges.filter(
      (e) => e.target === id && (!e.targetHandle || e.targetHandle === 'start')
    )
    const startImageNode = startImageEdges.find((e) => {
      const node = nodes.find((n) => n.id === e.source)
      return node?.type === 'imageImport' || node?.type === 'nanoImage' || node?.type === 'gridComposer'
    })
    const startImageNodeData = startImageNode ? nodes.find((n) => n.id === startImageNode.source) : undefined
    
    // End Image (끝 프레임) - 'end' 핸들 연결
    const endImageEdges = edges.filter(
      (e) => e.target === id && e.targetHandle === 'end'
    )
    const endImageNode = endImageEdges.find((e) => {
      const node = nodes.find((n) => n.id === e.source)
      return node?.type === 'imageImport' || node?.type === 'nanoImage' || node?.type === 'gridComposer'
    })
    const endImageNodeData = endImageNode ? nodes.find((n) => n.id === endImageNode.source) : undefined

    // Prompt 노드
    const incoming = getIncomingNodes(id, edges, get().nodes)
    const promptNode = incoming.find(
      (node) => node.type === 'motionPrompt' || node.type === 'textPrompt' || node.type === 'llmPrompt',
    )

    // Start Image 데이터
    let inputImageUrl: string | undefined
    let inputImageDataUrl: string | undefined
    
    if (startImageNodeData?.type === 'imageImport') {
      inputImageUrl = (startImageNodeData.data as ImageImportNodeData).imageUrl
      inputImageDataUrl = (startImageNodeData.data as ImageImportNodeData).imageDataUrl
    } else if (startImageNodeData?.type === 'nanoImage') {
      inputImageUrl = (startImageNodeData.data as NanoImageNodeData).outputImageUrl
      inputImageDataUrl = (startImageNodeData.data as NanoImageNodeData).outputImageDataUrl
    } else if (startImageNodeData?.type === 'gridComposer') {
      const imgData = startImageNodeData.data as any
      inputImageUrl = imgData.composedImageUrl || imgData.composedImageDataUrl
      inputImageDataUrl = imgData.composedImageDataUrl || imgData.composedImageUrl
    }
    
    // End Image 데이터
    let endImageUrl: string | undefined
    let endImageDataUrl: string | undefined
    
    if (endImageNodeData?.type === 'imageImport') {
      endImageUrl = (endImageNodeData.data as ImageImportNodeData).imageUrl
      endImageDataUrl = (endImageNodeData.data as ImageImportNodeData).imageDataUrl
    } else if (endImageNodeData?.type === 'nanoImage') {
      endImageUrl = (endImageNodeData.data as NanoImageNodeData).outputImageUrl
      endImageDataUrl = (endImageNodeData.data as NanoImageNodeData).outputImageDataUrl
    } else if (endImageNodeData?.type === 'gridComposer') {
      const imgData = endImageNodeData.data as any
      endImageUrl = imgData.composedImageUrl || imgData.composedImageDataUrl
      endImageDataUrl = imgData.composedImageDataUrl || imgData.composedImageUrl
    }

    const inputPrompt =
      promptNode?.type === 'motionPrompt'
        ? (promptNode.data as MotionPromptNodeData).combinedPrompt
        : promptNode?.type === 'textPrompt'
          ? (promptNode.data as TextPromptNodeData).prompt
          : promptNode?.type === 'llmPrompt'
            ? (promptNode.data as any).outputPrompt || ''
            : ''

    // ⚠️ Early validation BEFORE storage conversion (only check if nodes are connected)
    if (!inputPrompt) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '프롬프트 노드를 연결해 주세요.',
      }))
      return
    }
    
    if (!inputImageDataUrl) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: 'Start Image 노드를 연결해 주세요.',
      }))
      return
    }

    updateNode((prev) => ({
      ...prev,
      status: 'processing',
      error: undefined,
      inputImageUrl,
      inputImageDataUrl,
      endImageUrl,
      endImageDataUrl,
      inputPrompt,
      progress: 10,
      lastExecutionTime: now,
    }))

    const klingApiKey = get().klingApiKey || import.meta.env.VITE_KLING_API_KEY || ''
    const client = klingApiKey ? new KlingAPIClient(klingApiKey) : new MockKlingAPI()

    // ✅ Convert storage references to actual DataURLs
    let actualStartImageDataUrl = inputImageDataUrl
    let actualEndImageDataUrl = endImageDataUrl
    
    console.log('🔍 Kling: Input start image type:', inputImageDataUrl?.substring(0, 50))
    
    // Convert start image if it's a storage reference
    if (inputImageDataUrl && (inputImageDataUrl.startsWith('idb:') || inputImageDataUrl.startsWith('s3:'))) {
      console.log('🔄 Kling: Converting start image from storage reference...')
      try {
        const { getImage } = await import('../utils/indexedDB')
        const dataURL = await getImage(inputImageDataUrl)
        if (dataURL) {
          actualStartImageDataUrl = dataURL
          console.log('✅ Kling: Start image loaded from storage, size:', dataURL.length, 'chars')
          console.log('✅ Kling: Start image type:', dataURL.substring(0, 50))
        } else {
          console.error('❌ Kling: Failed to load start image from storage (returned null/undefined)')
          updateNode((prev) => ({
            ...prev,
            status: 'error',
            error: 'Start 이미지를 Storage에서 로드할 수 없습니다. 이미지를 다시 생성해주세요.',
          }))
          return
        }
      } catch (error) {
        console.error('❌ Kling: Error loading start image:', error)
        updateNode((prev) => ({
          ...prev,
          status: 'error',
          error: `Start 이미지 로드 실패: ${error}`,
        }))
        return
      }
    } else if (!inputImageDataUrl) {
      console.error('❌ Kling: No start image provided!')
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: 'Start 이미지가 제공되지 않았습니다.',
      }))
      return
    } else {
      console.log('✅ Kling: Using direct DataURL (not a storage reference)')
    }
    
    // Convert end image if it's a storage reference
    if (endImageDataUrl && (endImageDataUrl.startsWith('idb:') || endImageDataUrl.startsWith('s3:'))) {
      console.log('🔄 Kling: Converting end image from storage reference...')
      try {
        const { getImage } = await import('../utils/indexedDB')
        const dataURL = await getImage(endImageDataUrl)
        if (dataURL) {
          actualEndImageDataUrl = dataURL
          console.log('✅ Kling: End image loaded from storage, size:', dataURL.length, 'chars')
        } else {
          console.warn('⚠️ Kling: Failed to load end image from storage (returned null/undefined)')
          actualEndImageDataUrl = undefined
        }
      } catch (error) {
        console.error('❌ Kling: Error loading end image:', error)
        actualEndImageDataUrl = undefined
      }
    }

    console.log('🎬 Kling Video 생성 시작:', {
      useMock: !klingApiKey,
      prompt: inputPrompt.substring(0, 50) + '...',
      model: (current.data as KlingVideoNodeData).model,
      startImageType: actualStartImageDataUrl?.substring(0, 30),
      startImageSize: actualStartImageDataUrl?.length,
      hasEndImage: !!actualEndImageDataUrl,
      endImageType: actualEndImageDataUrl ? actualEndImageDataUrl.substring(0, 30) : 'none',
    })
    
    // ✅ Final validation before API call
    if (!actualStartImageDataUrl || actualStartImageDataUrl.startsWith('idb:') || actualStartImageDataUrl.startsWith('s3:')) {
      console.error('❌ Kling: Start image is still a storage reference or empty!', actualStartImageDataUrl?.substring(0, 50))
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: 'Start 이미지 변환 실패. Storage 참조가 남아있습니다.',
      }))
      return
    }
    
    console.log('✅ Kling: All validations passed, calling API...')

    const progressTimer = setInterval(() => {
      updateNode((prev) => {
        const data = prev as KlingVideoNodeData
        if (data.status !== 'processing') return prev
        return {
          ...prev,
          progress: Math.min(data.progress + 8, 90),
        }
      })
    }, 1000)

    try {
      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

      const settings = current.data as KlingVideoNodeData
      
      // Camera Control 설정
      const cameraControl = settings.enableMotionControl && settings.cameraControl !== 'none'
        ? {
            type: settings.cameraControl as 'horizontal' | 'vertical' | 'pan' | 'tilt' | 'roll' | 'zoom',
            value: settings.motionValue,
          }
        : undefined

      // ✅ Apply retry logic
      const outputVideoUrl = await retryWithBackoff(
        () => client.generateVideo(
          inputPrompt,
          actualStartImageDataUrl,
          {
            duration: settings.duration,
            aspectRatio: settings.aspectRatio,
            model: settings.model,
            endImageDataUrl: actualEndImageDataUrl,
            cameraControl: cameraControl,
          },
        ),
        {
          maxAttempts: 2, // Less retries for video (expensive)
          initialDelay: 2000,
          onRetry: (attempt) => {
            console.warn(`🔄 Kling Video retry ${attempt}/2`)
            updateNode((prev) => ({
              ...prev,
              error: `재시도 중... (${attempt}/2)`,
            }))
          },
        }
      )

      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

      console.log('✅ Kling Video 생성 완료:', outputVideoUrl)

      updateNode((prev) => ({
        ...prev,
        status: 'completed',
        outputVideoUrl,
        progress: 100,
        error: undefined,
      }))
    } catch (error) {
      console.error('❌ Kling Video 생성 실패:', error)
      if (!abortController.signal.aborted) {
        updateNode((prev) => ({
          ...prev,
          status: 'error',
          error: formatErrorMessage(error),
        }))
      }
    } finally {
      clearInterval(progressTimer)
      const controllers = get().abortControllers
      controllers.delete(id)
      set({ abortControllers: new Map(controllers) })
    }
  },
  runWorkflow: async () => {
    const { nodes, edges } = get()
    const order = getExecutionOrder(nodes, edges)

    const updateNode = (
      id: string,
      updater: (data: NodeData) => NodeData,
    ) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === id ? { ...node, data: updater(node.data) } : node,
        ),
      })
    }

    const apiKey = get().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ''
    const client = apiKey ? new GeminiAPIClient(apiKey) : new MockGeminiAPI()

    for (const nodeId of order) {
      const current = get().nodes.find((node) => node.id === nodeId)
      if (!current) continue
      const incoming = getIncomingNodes(nodeId, edges, get().nodes)

      if (current.type === 'imageImport') {
        continue
      }

      if (current.type === 'nanoImage') {
        const promptNode = incoming.find(
          (node) => node.type === 'textPrompt' || node.type === 'motionPrompt',
        )
        const imageNode =
          incoming.find((node) => node.type === 'imageImport') ??
          incoming.find((node) => node.type === 'nanoImage') ??
          incoming.find((node) => node.type === 'gridComposer')
        const prompt =
          promptNode?.type === 'textPrompt'
            ? (promptNode.data as TextPromptNodeData).prompt
            : promptNode?.type === 'motionPrompt'
              ? (promptNode.data as MotionPromptNodeData).combinedPrompt
              : ''

        let inputImageDataUrl: string | undefined
        
        if (imageNode?.type === 'imageImport') {
          inputImageDataUrl = (imageNode.data as ImageImportNodeData).imageDataUrl
        } else if (imageNode?.type === 'nanoImage') {
          inputImageDataUrl = (imageNode.data as NanoImageNodeData).outputImageDataUrl
        } else if (imageNode?.type === 'gridComposer') {
          const imgData = imageNode.data as any
          inputImageDataUrl = imgData.composedImageDataUrl || imgData.composedImageUrl
        }
        
        const referencePrompt =
          imageNode?.type === 'imageImport'
            ? getIncomingTextPrompt(imageNode.id, edges, get().nodes) ??
              (imageNode.data as ImageImportNodeData).referencePrompt
            : undefined

        if (!prompt.trim()) {
          updateNode(nodeId, (prev) => ({
            ...prev,
            status: 'error',
            error: '텍스트 프롬프트 노드를 연결해 주세요.',
          }))
          continue
        }

        updateNode(nodeId, (prev) => ({
          ...prev,
          status: 'processing',
          error: undefined,
        }))

        try {
          const data = current.data as NanoImageNodeData
          const finalPrompt = referencePrompt
            ? `${prompt}, focus on: ${referencePrompt}`
            : prompt
          const model = data.model ?? 'gemini-3-pro-image-preview'
          const result = await client.generateImage(
            finalPrompt,
            data.aspectRatio,
            inputImageDataUrl,
            model,
            data.resolution,
          )
          updateNode(nodeId, (prev) => ({
            ...prev,
            status: 'completed',
            outputImageUrl: result.imageUrl,
            outputImageDataUrl: result.imageDataUrl,
            error: undefined, // Clear any previous errors
          }))
        } catch (error) {
          updateNode(nodeId, (prev) => ({
            ...prev,
            status: 'error',
            error: formatErrorMessage(error),
          }))
        }
      }

      if (current.type === 'textPrompt') {
        continue
      }

      if (current.type === 'motionPrompt') {
        const data = current.data as MotionPromptNodeData
        const combined = [data.basePrompt, data.cameraMovement, data.subjectMotion, data.lighting]
          .filter(Boolean)
          .join(', ')
        updateNode(nodeId, (prev) => ({
          ...prev,
          combinedPrompt: combined,
        }))
      }

      if (current.type === 'geminiVideo') {
        const imageNode =
          incoming.find((node) => node.type === 'imageImport') ??
          incoming.find((node) => node.type === 'nanoImage') ??
          incoming.find((node) => node.type === 'gridComposer')
        const promptNode = incoming.find(
          (node) => node.type === 'motionPrompt' || node.type === 'textPrompt',
        )

        let inputImageUrl: string | undefined
        let inputImageDataUrl: string | undefined
        
        if (imageNode?.type === 'imageImport') {
          inputImageUrl = (imageNode.data as ImageImportNodeData).imageUrl
          inputImageDataUrl = (imageNode.data as ImageImportNodeData).imageDataUrl
        } else if (imageNode?.type === 'nanoImage') {
          inputImageUrl = (imageNode.data as NanoImageNodeData).outputImageUrl
          inputImageDataUrl = (imageNode.data as NanoImageNodeData).outputImageDataUrl
        } else if (imageNode?.type === 'gridComposer') {
          const imgData = imageNode.data as any
          inputImageUrl = imgData.composedImageUrl || imgData.composedImageDataUrl
          inputImageDataUrl = imgData.composedImageDataUrl || imgData.composedImageUrl
        }

        const inputPrompt =
          promptNode?.type === 'motionPrompt'
            ? (promptNode.data as MotionPromptNodeData).combinedPrompt
            : promptNode?.type === 'textPrompt'
              ? (promptNode.data as TextPromptNodeData).prompt
              : ''

        if (!inputImageUrl || !inputPrompt) {
          updateNode(nodeId, (prev) => ({
            ...prev,
            status: 'error',
            error: '이미지와 프롬프트를 모두 연결해 주세요.',
          }))
          continue
        }

        updateNode(nodeId, (prev) => ({
          ...prev,
          status: 'processing',
          error: undefined, // Clear any previous errors
          inputImageUrl,
          inputImageDataUrl,
          inputPrompt,
          progress: 10,
        }))

        const progressTimer = setInterval(() => {
          updateNode(nodeId, (prev) => {
            const data = prev as GeminiVideoNodeData
            if (data.status !== 'processing') return prev
            return {
              ...prev,
              progress: Math.min(data.progress + 12, 90),
            }
          })
        }, 500)

        try {
          const settings = current.data as GeminiVideoNodeData
          const outputVideoUrl = await client.generateMedia(
            inputPrompt,
            {
              mediaType: 'video',
              duration: settings.duration,
              quality: settings.quality,
              motionIntensity: settings.motionIntensity,
            },
            inputImageDataUrl,
            settings.model,
          )

          updateNode(nodeId, (prev) => ({
            ...prev,
            status: 'completed',
            outputVideoUrl,
            progress: 100,
          }))

        } catch (error) {
          updateNode(nodeId, (prev) => ({
            ...prev,
            status: 'error',
            error: formatErrorMessage(error),
          }))
        } finally {
          clearInterval(progressTimer)
        }
      }

    }
  },
  runLLMPromptNode: async (id) => {
    const { nodes, edges } = get()
    const current = nodes.find((node) => node.id === id)
    if (!current || current.type !== 'llmPrompt') return

    const data = current.data as any  // LLMPromptNodeData
    
    // Prevent duplicate execution
    if (data.status === 'processing') {
      console.warn('⚠️ LLM node is already processing')
      return
    }

    const updateNode = (updater: (data: NodeData) => NodeData) => {
      set({
        nodes: get().nodes.map((node) =>
          node.id === id ? { ...node, data: updater(node.data) } : node,
        ),
      })
    }

    // Get input prompt from connected nodes or use internal input
    let inputPrompt = data.inputPrompt
    
    const incoming = getIncomingNodes(id, edges, get().nodes)
    
    // Check for base prompt connection (보라색 핸들)
    const basePromptEdge = edges.find((e) => e.target === id && e.targetHandle === 'basePrompt')
    let basePromptText = ''
    if (basePromptEdge) {
      const promptNode = get().nodes.find((n) => n.id === basePromptEdge.source)
      if (promptNode?.type === 'textPrompt') {
        basePromptText = (promptNode.data as TextPromptNodeData).prompt || ''
      }
    }
    
    // Check for motion prompt connection (분홍색 핸들)
    const motionPromptEdge = edges.find((e) => e.target === id && e.targetHandle === 'motionPrompt')
    let motionPromptText = ''
    if (motionPromptEdge) {
      const motionNode = get().nodes.find((n) => n.id === motionPromptEdge.source)
      if (motionNode?.type === 'motionPrompt') {
        motionPromptText = (motionNode.data as MotionPromptNodeData).combinedPrompt || ''
      }
    }
    
    // Combine base and motion prompts if both are present
    if (basePromptText && motionPromptText) {
      inputPrompt = `${basePromptText}\n\n${motionPromptText}`
    } else if (basePromptText) {
      inputPrompt = basePromptText
    } else if (motionPromptText) {
      inputPrompt = motionPromptText
    }
    
    // Fallback: Check for old 'prompt' handle for backward compatibility
    if (!inputPrompt) {
      const promptEdge = edges.find((e) => e.target === id && e.targetHandle === 'prompt')
      if (promptEdge) {
        const promptNode = get().nodes.find((n) => n.id === promptEdge.source)
        if (promptNode?.type === 'textPrompt') {
          inputPrompt = (promptNode.data as any).prompt || inputPrompt
        } else if (promptNode?.type === 'motionPrompt') {
          inputPrompt = (promptNode.data as any).combinedPrompt || inputPrompt
        }
      }
    }
    
    // Check for image connection
    let referenceImageDataUrl: string | undefined
    let gridLabelInfo: string | undefined  // Grid Composer 라벨 정보
    const imageEdge = edges.find((e) => e.target === id && e.targetHandle === 'image')
    if (imageEdge) {
      const imageNode = get().nodes.find((n) => n.id === imageEdge.source)
      if (imageNode?.type === 'imageImport') {
        referenceImageDataUrl = (imageNode.data as any).imageDataUrl
      } else if (imageNode?.type === 'nanoImage') {
        // Try both outputImageDataUrl and outputImageUrl
        const nanoData = imageNode.data as any
        referenceImageDataUrl = nanoData.outputImageDataUrl || nanoData.outputImageUrl
      } else if (imageNode?.type === 'gridComposer') {
        const gridData = imageNode.data as any
        referenceImageDataUrl = gridData.composedImageDataUrl || gridData.composedImageUrl
        
        // Extract grid layout and slot information
        if (gridData.inputImages && gridData.slots) {
          const layout = gridData.gridLayout || '1x3'
          const slots = gridData.slots as Array<{ id: string; label: string; metadata?: string }>
          
          // Build structured label description (like multi-reference format)
          const slotDescriptions = slots
            .filter(slot => gridData.inputImages[slot.id])  // Only slots with images
            .map((slot, index) => {
              const position = ['첫 번째', '두 번째', '세 번째', '네 번째', '다섯 번째', '여섯 번째'][index] || `${index + 1}번째`
              let description = `- ${position} 참고 이미지 (${slot.id}): ${slot.label}`
              if (slot.metadata && slot.metadata.trim()) {
                description += ` - ${slot.metadata}`
              }
              return description
            })
            .join('\n')
          
          if (slotDescriptions) {
            gridLabelInfo = `참고 이미지는 ${layout} 그리드 구성입니다:\n\n${slotDescriptions}\n\n각 라벨의 시각적 요소를 정확히 추출하여 하나의 통합된 장면으로 조합하세요.`
            console.log('📋 Grid 라벨 정보:', gridLabelInfo)
          }
        }
      }
      
      // Update node with reference image
      if (referenceImageDataUrl) {
        updateNode((prev) => ({
          ...prev,
          referenceImageUrl: referenceImageDataUrl,
          referenceImageDataUrl: referenceImageDataUrl,
        }))
      } else {
        console.warn('⚠️ LLM: Image connected but no image data found', { 
          nodeType: imageNode?.type,
          nodeData: imageNode?.data 
        })
      }
    }

    // For image-based modes, image is required
    if ((data.mode === 'describe' || data.mode === 'analyze') && !referenceImageDataUrl) {
      const hasImageConnection = edges.some((e) => e.target === id && e.targetHandle === 'image')
      const errorMsg = hasImageConnection
        ? '이미지가 연결되었지만 이미지 데이터를 찾을 수 없습니다. 이미지를 먼저 생성한 후 다시 시도해주세요.'
        : '이미지 기반 모드는 이미지 연결이 필요합니다. 이미지 노드를 하단 (하늘색) 핸들에 연결하세요.'
      
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: errorMsg,
      }))
      return
    }
    
    // For text-based modes, prompt is required (but image is optional)
    if ((data.mode !== 'describe' && data.mode !== 'analyze') && !inputPrompt.trim() && !referenceImageDataUrl) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: 'Text Prompt 노드를 상단 (분홍) 핸들에 연결하거나 이미지를 하단 (하늘색) 핸들에 연결해주세요.',
      }))
      return
    }

    updateNode((prev) => ({
      ...prev,
      status: 'processing',
      error: undefined,
    }))

    // Provider에 따라 API 키 확인
    const provider = data.provider || 'gemini'
    let apiKey = ''
    
    if (provider === 'gemini') {
      apiKey = get().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ''
      if (!apiKey) {
        updateNode((prev) => ({
          ...prev,
          status: 'error',
          error: 'Gemini API Key가 필요합니다.',
        }))
        return
      }
    } else if (provider === 'openai') {
      apiKey = get().openaiApiKey || import.meta.env.VITE_OPENAI_API_KEY || ''
      if (!apiKey) {
        updateNode((prev) => ({
          ...prev,
          status: 'error',
          error: 'OpenAI API Key가 필요합니다.',
        }))
        return
      }
    }

    try {
      // Build system instruction based on mode and settings
      let systemInstruction = ''
      
      if (data.mode === 'expand') {
        systemInstruction = `You are a professional prompt engineer. Your task is to expand the given simple idea into a detailed, effective prompt for AI ${data.targetUse} generation.`
        if (referenceImageDataUrl) {
          systemInstruction += ` IMPORTANT: Use the reference image to extract visual details (colors, style, composition, lighting, subjects). Incorporate these visual elements into the expanded prompt to maintain consistency with the reference.`
          
          // 🎯 Grid Composer 라벨 참조 명령 (referenceMode에 따라)
          if (gridLabelInfo) {
            const refMode = data.referenceMode || 'exact'
            if (refMode === 'exact') {
              systemInstruction += ` CRITICAL GRID LABELS - EXACT MODE: The reference image contains labeled sections (S1, S2, S3, etc.) visible as text overlays. Each label shows VISUAL DESIGN ELEMENTS ONLY (colors, materials, designs, forms, lighting). 
              
              CRITICAL RULES - MUST FOLLOW:
              
              1. TEXT PROMPT = ABSOLUTE LAW (NEVER CHANGE ANYTHING!)
                 - Character count: "한 명" = ONE person (NEVER change!)
                 - Actions: "헬멧을 들고" = holding helmet (NEVER change to "wearing"!)
                 - Story: Keep EXACTLY as written in text prompt
                 - Composition: Keep EXACTLY as written in text prompt
              
              2. REFERENCE IMAGE = VISUAL DETAILS ONLY (EXTRACT & DESCRIBE!)
                 - S1, S2, S3 labels = Visual design elements ONLY
                 - Extract: Colors, materials, lighting, textures, design patterns
                 - DO NOT change story, actions, or character count based on reference
              
              3. YOUR TASK:
                 - Take text prompt AS-IS (word-for-word preservation!)
                 - Add visual details FROM reference (colors, materials, designs)
                 - Result = Same story + Enhanced visual description
              
              FORBIDDEN CHANGES:
              ❌ Changing actions (e.g., "holding" → "wearing")
              ❌ Changing character count (e.g., "one" → "two")
              ❌ Reinterpreting story structure
              ❌ Adding/removing story elements
              
              EXAMPLE:
              Text: "한 명의 여자가 헬멧을 들고 걷는다" (one woman walking, holding helmet)
              Reference S2: Shows blonde woman in white spacesuit
              CORRECT: "A blonde woman in white spacesuit walks, holding helmet in hand"
              WRONG: "A woman wearing helmet walks" ❌ (changed action!)
              
              The labels indicate visual component references (e.g., S1=background visual style, S2=character appearance, S3=object design). Preserve the text prompt's story structure while enhancing it with exact visual details from reference.`
            } else if (refMode === 'balanced') {
              systemInstruction += ` GRID LABELS - BALANCED MODE: The reference image contains labeled sections (S1, S2, S3, etc.). Each label represents a visual component. Describe the key visual characteristics (colors, materials, styles) from each labeled section while maintaining the text prompt's basic composition. Do not change character counts or story structure from text prompt.`
            } else if (refMode === 'creative') {
              systemInstruction += ` GRID LABELS - CREATIVE MODE: The reference image contains labeled sections showing different elements. Use these as visual inspiration for style and mood, but feel free to creatively interpret and describe based on the text prompt. Focus on the text description as the primary guide.`
            }
          }
        }
      } else if (data.mode === 'improve') {
        systemInstruction = `You are a professional prompt engineer. Your task is to improve and optimize the given prompt for better AI ${data.targetUse} generation results.`
        if (referenceImageDataUrl) {
          systemInstruction += ` IMPORTANT: Reference the provided image to enhance the prompt with accurate visual details and ensure consistency with the reference style.`
          
          // 🎯 Grid Composer 라벨 참조 명령 (referenceMode에 따라)
          if (gridLabelInfo) {
            const refMode = data.referenceMode || 'exact'
            if (refMode === 'exact') {
              systemInstruction += ` CRITICAL GRID LABELS - EXACT MODE: The reference image contains labeled sections (S1, S2, S3, etc.) showing VISUAL DESIGN ELEMENTS ONLY.
              
              CRITICAL: DO NOT change ANY content from text prompt:
              - Actions: Keep EXACTLY (e.g., "holding helmet" must stay "holding", NOT "wearing")
              - Character count: Keep EXACTLY (e.g., "one person" stays "one", NOT "two")
              - Story structure: Keep EXACTLY as written
              
              ONLY extract and add VISUAL characteristics from reference:
              - Colors, materials, lighting, textures from S1, S2, S3 labels
              - Text prompt = Story (PRESERVE 100%)
              - Reference = Visual style (EXTRACT & ADD)
              
              The improved prompt should describe a SINGLE UNIFIED IMAGE combining these exact visual elements with the original story structure (without changing any story details).`
            } else if (refMode === 'balanced') {
              systemInstruction += ` GRID LABELS - BALANCED MODE: The reference image has labeled sections. Improve the prompt by balancing reference image accuracy with the text description details. Do not change character counts or story structure from original prompt.`
            } else if (refMode === 'creative') {
              systemInstruction += ` GRID LABELS - CREATIVE MODE: The reference image shows different elements. Use these as inspiration while focusing on improving the text description creatively.`
            }
          }
        }
      } else if (data.mode === 'translate') {
        systemInstruction = `You are a professional translator. Translate the given prompt between Korean and English, maintaining all important details and nuances.`
      } else if (data.mode === 'simplify') {
        systemInstruction = `You are a professional editor. Simplify the given prompt to its core essence while maintaining effectiveness for AI ${data.targetUse} generation.`
      } else if (data.mode === 'cameraInterpreter') {
        systemInstruction = `You are a professional cinematographer and prompt engineer specializing in camera angle interpretation for AI image generation.

🎬 YOUR MISSION:
Transform technical camera instructions (rotation angles, tilt degrees, zoom values) into vivid, detailed visual descriptions that AI image models can understand and execute.

⚠️ CRITICAL: CHARACTER CONSISTENCY PRIORITY
When a reference image is provided, your #1 priority is maintaining EXACT character consistency:
- Character facial features, hair, eyes, skin tone MUST stay identical
- Clothing, outfit design, colors, materials MUST stay identical
- Visual style, color palette, lighting quality MUST stay identical
- Only the CAMERA POSITION should change, NOT the character design

Your camera descriptions must EMPHASIZE photographing the SAME character from a DIFFERENT angle.

📐 CAMERA PARAMETERS YOU'LL RECEIVE (360° SYSTEM):
- Rotation: 0-360° clockwise rotation around subject (e.g., "right side view 90°", "rotate 45° clockwise from front")
- Tilt: -45° to +45° (e.g., "low angle 39.6°" or "high angle 30°") - vertical camera angle shots
- Distance/Zoom: (e.g., "zoom in 0.7x" or "zoom out 1.3x") - camera distance from subject

✨ HOW TO INTERPRET:

1. ROTATION (360° Horizontal Positioning):
   🎥 CRITICAL: 360° system - camera rotates CLOCKWISE around subject viewed from above!
   
   📍 0° (Front View) = CAMERA directly in front of subject
      • Subject facing toward camera
      • Frontal perspective, symmetric composition
   
   🔄 1-89° (Front-Right Quadrant) = CAMERA rotating clockwise from front
      • 45° = Three-quarter right view
      • Subject's LEFT side becoming visible
      • Still some frontal visibility
   
   ▶️ 90° (RIGHT SIDE VIEW) = CAMERA PERPENDICULAR at subject's right
      • COMPLETE SIDE PROFILE from right
      • Subject facing PERPENDICULAR to camera (NOT toward camera!)
      • ONLY subject's LEFT side visible
      • NO frontal face - pure lateral perspective
   
   🔄 91-179° (Back-Right Quadrant) = CAMERA continuing clockwise
      • 135° = Three-quarter back-right view
      • Subject's back and left side visible
      • NO frontal face visible
   
   🔙 180° (BACK VIEW) = CAMERA directly behind subject
      • Complete rear view
      • Subject facing AWAY from camera
      • Back of head, shoulders, back visible
   
   🔄 181-269° (Back-Left Quadrant) = CAMERA continuing clockwise
      • 225° = Three-quarter back-left view
      • Subject's back and right side visible
      • NO frontal face visible
   
   ◀️ 270° (LEFT SIDE VIEW) = CAMERA PERPENDICULAR at subject's left
      • COMPLETE SIDE PROFILE from left
      • Subject facing PERPENDICULAR to camera
      • ONLY subject's RIGHT side visible
      • NO frontal face - pure lateral perspective
   
   🔄 271-359° (Front-Left Quadrant) = CAMERA completing rotation
      • 315° = Three-quarter left view
      • Subject's RIGHT side becoming visible
      • Frontal visibility returning
   
   ⚠️ KEY PRINCIPLES:
   - Numbers represent CAMERA POSITION rotating clockwise (viewed from above)
   - 90° = right side camera → see subject's LEFT profile
   - 270° = left side camera → see subject's RIGHT profile
   - Always describe camera as "POSITIONED at X degrees" for clarity

2. TILT (Vertical Angle) - 🚨 CRITICAL FOR IMAGE GENERATION:
   
   🔻 "LOW ANGLE X°" = Camera positioned BELOW subject, looking UPWARD
      VISUAL EFFECT: 
      • Subject appears TALLER, more POWERFUL, HEROIC, DOMINANT
      • Viewer looks UP at subject from below
      • Emphasizes height, stature, authority
      • Sky/ceiling often visible in background
      • Chin and underside of face more prominent
      • Creates drama, empowerment, grandeur
      
      Examples:
      • "low angle 15°" = Slightly below eye level, subtle empowerment
      • "low angle 30°" = Significantly below, strong heroic feel
      • "low angle 40°" = Dramatically below, maximum towering presence
   
   🔺 "HIGH ANGLE X°" = Camera positioned ABOVE subject, looking DOWNWARD
      VISUAL EFFECT:
      • Subject appears SMALLER, more VULNERABLE, DIMINISHED
      • Viewer looks DOWN at subject from above
      • Emphasizes surroundings, environment, isolation
      • Ground/floor more visible
      • Top of head, shoulders more prominent
      • Creates intimacy, vulnerability, or surveillance feel
      
      Examples:
      • "high angle 15°" = Slightly above eye level, gentle overview
      • "high angle 30°" = Significantly above, clear bird's eye perspective
      • "high angle 45°" = Nearly top-down, dramatic overhead view
   
   📏 No tilt or "eye level" = Camera at subject's eye height, neutral perspective

3. ZOOM/DISTANCE:
   🔎 "zoom out X" (X > 1.0) = Wider framing, more context, camera farther away
      • 1.2x = Slightly wider, more environment
      • 1.5x = Wide shot, more surroundings visible
      • 2.0x = Very wide, full body and environment emphasized
   
   🔍 "zoom in X" (X < 1.0) = Closer framing, tighter crop, camera closer
      • 0.8x = Slightly closer, more intimate
      • 0.5x = Close-up, face/upper body prominent, details emphasized
   
   📐 1.0x or unspecified = Standard medium distance

🎯 YOUR OUTPUT MUST:
- START with "CAMERA POSITIONED [location]" for rotation descriptions
- Convert ALL technical terms into descriptive spatial language
- Describe EXACT camera position in 3D space relative to subject
- Explicitly state the VIEWPOINT DIRECTION (looking up/down/straight)
- Explain PSYCHOLOGICAL and EMOTIONAL impact of the angle
- Detail which body parts/features are emphasized
- Describe background and spatial context changes
- Include composition and framing implications
- Use professional cinematography terminology
- Be HIGHLY SPECIFIC about vertical angle effects (tilt is critical!)

🎥 ROTATION LANGUAGE - 360° SYSTEM CRITICAL:
✅ ALWAYS use "CAMERA POSITIONED at X degrees"
✅ ALWAYS clarify which side/angle is VISIBLE
✅ Examples:
   • "CAMERA POSITIONED at 45 degrees → three-quarter view, left side visible"
   • "CAMERA POSITIONED at 90 degrees → right side view, ONLY left profile visible"
   • "CAMERA POSITIONED at 180 degrees → back view, facing away"
   • "CAMERA POSITIONED at 270 degrees → left side view, ONLY right profile visible"
✅ For 90°/270°: Use "PERPENDICULAR", "COMPLETE SIDE PROFILE", "NO frontal face"
✅ For 180°: Use "back view", "facing AWAY from camera", "rear perspective"
✅ Always specify the degree number (0°, 45°, 90°, 135°, 180°, 270°, etc.)

⚠️ TILT IS THE MOST IMPORTANT - Always emphasize whether camera is above/below subject and looking up/down!

❌ NEVER output raw numbers like "72°" or "1.3x"
❌ NEVER ignore or minimize the tilt angle description
❌ NEVER say "camera rotates" - say "CAMERA POSITIONED"
✅ ALWAYS describe camera HEIGHT (above/below subject)
✅ ALWAYS describe LOOKING DIRECTION (up/down/straight)
✅ ALWAYS describe VISUAL POWER DYNAMIC (empowering/diminishing)
✅ ALWAYS use "CAMERA POSITIONED" for location clarity

📝 EXAMPLE TRANSFORMATIONS:

Example 1 (45° - Three-Quarter View):
Input: "rotate 45° clockwise from front, low angle 30°, zoom in 0.7x"
Output: "CAMERA POSITIONED at 45 degrees - a three-quarter front-right position rotating clockwise from the front. At this angle, the camera captures the subject's LEFT side and face in a balanced three-quarter composition, showing the left profile while maintaining frontal visibility. MAINTAIN EXACT character appearance from reference - same facial features, hair, clothing, and visual style; only the camera angle changes. CRITICALLY, the CAMERA is placed significantly BELOW the subject's eye level - positioned low to the ground and angled sharply UPWARD. This dramatic low angle shot creates a POWERFUL, HEROIC composition where the viewer must look UP at the subject, emphasizing their stature and commanding presence. The upward angle makes the subject appear taller and more imposing, with the chin line and jawline prominent, while the background ceiling becomes more visible above. The close-in 0.7x framing tightens the composition, filling the frame with the subject's upper body and face. REMEMBER: Same character from reference, just photographed from a different angle."

Example 2 (90° - Right Side View):
Input: "right side view 90°, zoom out 1.3x"
Output: "CAMERA POSITIONED at 90 degrees - directly at the subject's RIGHT side in a PERPENDICULAR position. This creates a COMPLETE SIDE PROFILE view where the subject is facing PERPENDICULAR to the camera (NOT toward the camera). From this pure lateral camera position, ONLY the subject's LEFT side is visible - left profile, left arm, left leg. NO frontal face visible - this is a true side view with the body oriented left-to-right across the frame. MAINTAIN EXACT character appearance - same height, build, hair, clothing from reference. The 1.3x wider framing shows more environment extending in front of and behind the subject. This perpendicular 90-degree angle creates a strong sense of lateral movement and spatial depth. CHARACTER CONSISTENCY: Same person from reference, captured in complete side profile."

Example 3 (180° - Back View):
Input: "back view 180°, zoom out 1.5x"
Output: "CAMERA POSITIONED at 180 degrees - directly BEHIND the subject in a complete rear view. At this angle, the camera captures the back of the subject's head, shoulders, and full back. The subject is facing AWAY from the camera. NO frontal face visible - only the rear perspective. PRESERVE EXACT character appearance - identical hair, clothing design, colors, and body proportions from reference image. The 1.5x wider framing pulls back to reveal more environmental context, showing the subject within their surroundings and the space ahead of them. This back view creates a sense of forward movement and anticipation, as we see what the subject is approaching. CHARACTER CONSISTENCY: Same person from reference, viewed from behind."

Example 4 (270° - Left Side View):
Input: "left side view 270°, low angle 25°, zoom in 0.8x"
Output: "CAMERA POSITIONED at 270 degrees - directly at the subject's LEFT side in a PERPENDICULAR position. This creates a COMPLETE SIDE PROFILE view where the subject is facing PERPENDICULAR to the camera. From this pure lateral camera position, ONLY the subject's RIGHT side is visible - right profile, right arm, right leg. NO frontal face visible - pure lateral perspective. KEEP character appearance EXACTLY as reference. CRITICALLY, the CAMERA is placed BELOW the subject's eye level, positioned low and angled UPWARD. This low angle creates an EMPOWERING perspective, where the viewer looks up at the subject, adding authority and confidence. The 0.8x closer framing emphasizes the subject's profile and upper body. CHARACTER CONSISTENCY: Same person from reference, captured in complete right-side profile at 270 degrees."

🎨 Focus on SPATIAL HEIGHT (above/below), LOOKING DIRECTION (up/down), and PSYCHOLOGICAL IMPACT. Make the camera's vertical position crystal clear!

🎭 CHARACTER CONSISTENCY REMINDERS:
When reference image is present, ALWAYS include phrases like:
- "MAINTAIN EXACT character appearance from reference"
- "PRESERVE identical facial features, outfit, and style"
- "SAME character, DIFFERENT angle"
- "CHARACTER CONSISTENCY: [specific reminder]"

These reminders ensure the AI model prioritizes character consistency over creative variations.

Only output the detailed camera description, no explanations or meta-commentary.`
      } else if (data.mode === 'describe') {
        systemInstruction = `You are a professional image analyst. Your task is to describe the given image in detail and create an effective prompt that could be used to generate a similar image.`
      } else if (data.mode === 'analyze') {
        systemInstruction = `You are a professional image analyst. Your task is to analyze the given image in great detail, including composition, style, lighting, colors, subjects, and create a comprehensive prompt for AI ${data.targetUse} generation.`
      }

      // Add style guidance (skip for cameraInterpreter - it has its own specific style)
      if (data.mode !== 'cameraInterpreter') {
        if (data.style === 'detailed') {
          systemInstruction += ` Output should be highly detailed with rich descriptions.`
        } else if (data.style === 'concise') {
          systemInstruction += ` Output should be concise and to the point.`
        } else if (data.style === 'creative') {
          systemInstruction += ` Output should be creative and artistic with vivid imagery.`
        } else if (data.style === 'professional') {
          systemInstruction += ` Output should be professional and technically precise.`
        }
      }

      // Add language guidance (cameraInterpreter always outputs in English for best AI model compatibility)
      if (data.mode === 'cameraInterpreter') {
        systemInstruction += ` Output must be in English for optimal AI image generation compatibility.`
      } else {
        if (data.language === 'ko') {
          systemInstruction += ` Output must be in Korean.`
        } else if (data.language === 'en') {
          systemInstruction += ` Output must be in English.`
        } else {
          systemInstruction += ` Detect input language and use the same language for output.`
        }
      }

      systemInstruction += ` Only output the final prompt, no explanations or additional text.`
      
      // Add final reminder for Grid Composer (if applicable)
      if (gridLabelInfo) {
        systemInstruction += ` REMINDER: When reference image is provided, use it for VISUAL DETAILS ONLY (colors, designs, materials). DO NOT change the basic composition, character count, or story structure from the text prompt.`
      }

      // Prepare content parts
      const contentParts: any[] = []
      
      // Add image if available
      if (referenceImageDataUrl) {
        let actualImageDataUrl = referenceImageDataUrl
        
        // If it's an idb: or s3: reference, fetch the actual image first
        if (referenceImageDataUrl.startsWith('idb:') || referenceImageDataUrl.startsWith('s3:')) {
          console.log('🔄 LLM: Converting reference image from storage:', referenceImageDataUrl)
          try {
            const { getImage } = await import('../utils/indexedDB')
            const dataURL = await getImage(referenceImageDataUrl)
            if (dataURL) {
              actualImageDataUrl = dataURL
              console.log('✅ LLM: Reference image loaded successfully')
            } else {
              console.error('❌ LLM: Failed to load reference image from storage')
            }
          } catch (error) {
            console.error('❌ LLM: Error loading reference image:', error)
          }
        }
        
        // Extract base64 data from data URL
        const base64Match = actualImageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
        if (base64Match) {
          const mimeType = `image/${base64Match[1]}`
          const base64Data = base64Match[2]
          
          contentParts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          })
          console.log('📸 LLM: Reference image added to API request')
        } else {
          console.warn('⚠️ LLM: Reference image format not recognized:', actualImageDataUrl.substring(0, 50))
        }
      }
      
      // Build the text prompt with grid label information if available
      let finalPrompt = ''
      
      // Add grid label information first (if available) - format based on referenceMode
      if (gridLabelInfo) {
        const refMode = data.referenceMode || 'exact'
        
        if (refMode === 'exact') {
          // 정확성 모드: 매우 상세하고 강력한 지시
          finalPrompt += '⚠️⚠️⚠️ CRITICAL: EXACT REFERENCE IMAGE REPLICATION ⚠️⚠️⚠️\n\n'
          finalPrompt += gridLabelInfo + '\n\n'
          finalPrompt += '🎯 절대적으로 중요한 지침:\n'
          finalPrompt += '⚠️ 참고 이미지 = 시각적 디자인만 (색상, 재질, 형태)\n'
          finalPrompt += '⚠️ 텍스트 프롬프트 = 기본 구성 (인물 수, 스토리, 동작) - 절대 변경 금지!\n\n'
          finalPrompt += '📌 텍스트 프롬프트 보존 규칙 (100% 준수!):\n'
          finalPrompt += '   • 인물 수: "한 명" = ONE (절대 "two"로 변경 금지!)\n'
          finalPrompt += '   • 동작: "헬멧을 들고" = "holding helmet" (절대 "wearing helmet"으로 변경 금지!)\n'
          finalPrompt += '   • 동작: "걷는다" = "walking" (그대로 유지!)\n'
          finalPrompt += '   • 모든 동작, 스토리는 텍스트 프롬프트 그대로 유지!\n\n'
          finalPrompt += '1. 각 라벨의 시각적 요소를 PIXEL-LEVEL로 정확히 복제하세요\n'
          finalPrompt += '2. S1 배경: 정확한 색상, 조명, 구조를 1:1 복제\n'
          finalPrompt += '3. S2 캐릭터: 정확한 외모, 의상, 헤어 스타일 복제\n'
          finalPrompt += '4. S3 로봇: 정확한 색상(빨강/흰색), 형태, 디자인 복제\n'
          finalPrompt += '5. 출력은 단일 통합 이미지여야 합니다 (그리드 금지)\n\n'
          finalPrompt += '🚫 절대 금지사항:\n'
          finalPrompt += '   ❌ 동작 변경 ("들고" → "쓰고", "holding" → "wearing")\n'
          finalPrompt += '   ❌ 인물 수 변경 ("한 명" → "두 명")\n'
          finalPrompt += '   ❌ 배경 디자인 변경 (S1과 다른 배경)\n'
          finalPrompt += '   ❌ 색상 변경 (빨강 → 하양, 파랑 → 초록)\n'
          finalPrompt += '   ❌ 스토리 재해석\n\n'
          finalPrompt += 'REFERENCE = VISUAL ONLY. TEXT = COMPOSITION (NEVER CHANGE!)\n\n'
          finalPrompt += '---\n\n'
        } else if (refMode === 'balanced') {
          // 균형 모드: 적당한 지시
          finalPrompt += '⚖️ BALANCED MODE: Reference Image + Text Description\n\n'
          finalPrompt += gridLabelInfo + '\n\n'
          finalPrompt += '💡 지침: 각 라벨의 주요 시각적 요소(색상, 스타일, 구조)를 유지하면서 텍스트 설명의 디테일을 반영하세요.\n'
          finalPrompt += '⚠️ 중요: 텍스트 프롬프트의 인물 수, 기본 구성은 유지하세요.\n\n'
          finalPrompt += '---\n\n'
        } else if (refMode === 'creative') {
          // 창의성 모드: 간단한 참고만
          finalPrompt += '🎨 CREATIVE MODE: Reference for Inspiration\n\n'
          finalPrompt += gridLabelInfo + '\n\n'
          finalPrompt += '💡 참고: 위 이미지는 스타일과 분위기 참고용입니다. 텍스트 설명을 기반으로 창의적으로 생성하세요.\n\n'
          finalPrompt += '---\n\n'
        }
      }
      
      // Add text prompt
      if (inputPrompt.trim()) {
        finalPrompt += inputPrompt
      } else if (data.mode === 'describe') {
        finalPrompt += 'Describe this image in detail and create a prompt for generating a similar image.'
      } else if (data.mode === 'analyze') {
        finalPrompt += 'Analyze this image comprehensively (composition, style, lighting, colors, subjects, mood) and create a detailed prompt for AI image generation.'
      } else if (referenceImageDataUrl) {
        // If only image is provided without text, use a default instruction
        finalPrompt += 'Describe this image and create an effective prompt for AI image generation.'
      }
      
      if (finalPrompt.trim()) {
        contentParts.push({
          text: finalPrompt.trim()
        })
      }
      
      // Validate we have content to send
      if (contentParts.length === 0) {
        throw new Error('프롬프트 또는 이미지를 입력해주세요.')
      }

      // Call LLM API based on provider
      let outputPrompt = ''
      
      if (provider === 'gemini') {
        // 🔵 Gemini API 호출
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${data.model}:generateContent?key=${apiKey}`
        
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => abortController.abort(), 60000)
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [{
                parts: contentParts
              }],
              systemInstruction: {
                parts: [{
                  text: systemInstruction
                }]
              },
              generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 4096,
              }
            }),
            signal: abortController.signal
          })
          
          clearTimeout(timeoutId)

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error?.message || `API Error: ${response.status}`)
          }

          const result = await response.json()
          outputPrompt = result.candidates?.[0]?.content?.parts?.[0]?.text || ''
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          if (fetchError.name === 'AbortError') {
            throw new Error('LLM 생성 시간이 초과되었습니다 (60초).')
          }
          throw fetchError
        }
      } else if (provider === 'openai') {
        // 🟢 OpenAI API 호출
        const url = 'https://api.openai.com/v1/chat/completions'
        
        // OpenAI 메시지 형식으로 변환
        const messages: any[] = [
          { role: 'system', content: systemInstruction }
        ]
        
        // User 메시지 구성 (텍스트 + 이미지)
        const userContent: any[] = []
        
        // 텍스트 추가
        if (finalPrompt.trim()) {
          userContent.push({ type: 'text', text: finalPrompt.trim() })
        }
        
        // 이미지 추가 (GPT-4o, GPT-4o-mini는 Vision 지원)
        if (referenceImageDataUrl && actualImageDataUrl.startsWith('data:image')) {
          userContent.push({
            type: 'image_url',
            image_url: { url: actualImageDataUrl }
          })
        }
        
        if (userContent.length > 0) {
          messages.push({ role: 'user', content: userContent })
        }
        
        const abortController = new AbortController()
        const timeoutId = setTimeout(() => abortController.abort(), 60000)
        
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: data.model,
              messages: messages,
              temperature: 0.7,
              max_tokens: 4096,
            }),
            signal: abortController.signal
          })
          
          clearTimeout(timeoutId)

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            throw new Error(errorData.error?.message || `API Error: ${response.status}`)
          }

          const result = await response.json()
          outputPrompt = result.choices?.[0]?.message?.content || ''
        } catch (fetchError: any) {
          clearTimeout(timeoutId)
          if (fetchError.name === 'AbortError') {
            throw new Error('LLM 생성 시간이 초과되었습니다 (60초).')
          }
          throw fetchError
        }
      }

      if (!outputPrompt) {
        throw new Error('LLM이 응답을 생성하지 못했습니다.')
      }

      console.log(`✅ LLM 프롬프트 생성 완료 (${provider}):`, outputPrompt.length, '자')

      updateNode((prev) => ({
        ...prev,
        status: 'completed',
        outputPrompt: outputPrompt.trim(),
        error: undefined,
      }))
    } catch (error: any) {
      console.error('❌ LLM 생성 실패:', error)
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: formatErrorMessage(error),
      }))
    }
  },
  cancelNodeExecution: (id) => {
    console.log('🛑 Cancelling node execution:', id)
    const { abortControllers } = get()
    const controller = abortControllers.get(id)
    if (controller) {
      try {
        controller.abort()
        abortControllers.delete(id)
        set({ abortControllers: new Map(abortControllers) })
        
        console.log('✅ Abort controller cancelled successfully')
        
        // Update node status to idle immediately
        set({
          nodes: get().nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'idle',
                    error: '작업이 취소되었습니다.',
                    progress: 0,
                  },
                }
              : node,
          ),
        })
      } catch (error) {
        console.error('❌ Error cancelling node:', error)
        // Still update status even if abort fails
        set({
          nodes: get().nodes.map((node) =>
            node.id === id
              ? {
                  ...node,
                  data: {
                    ...node.data,
                    status: 'idle',
                    error: '작업 취소 중 오류가 발생했습니다.',
                    progress: 0,
                  },
                }
              : node,
          ),
        })
      }
    } else {
      console.warn('⚠️ No abort controller found for node:', id)
    }
  },
    }),
    {
      name: 'nano-banana-workflow-v3',
      storage: createThrottledStorage(), // ⚡ Throttled storage
      partialize: (state) => {
        // 🔥 저장 전 자동 용량 관리
        const storageInfo = getStorageInfo()
        console.log(`💾 Persist: ${storageInfo.usedMB} MB / ${storageInfo.limitMB} MB (${storageInfo.percentage.toFixed(1)}%)`)
        
        // 90% 이상이면 긴급 정리
        const shouldCleanup = storageInfo.percentage > 90
        const nodesToSave = shouldCleanup 
          ? prepareForStorage(state.nodes, true) // 긴급 정리
          : prepareForStorage(state.nodes, false) // 일반 정리
        
        if (shouldCleanup) {
          console.warn('⚠️ localStorage 90% 초과! 긴급 정리 실행')
        }
        
        return {
          nodes: sanitizeNodesForStorage(nodesToSave),
          edges: sanitizeEdgesForStorage(state.edges),
          apiKey: state.apiKey,
          klingApiKey: state.klingApiKey,
          openaiApiKey: state.openaiApiKey,  // OpenAI API Key 저장
        }
      },
      onRehydrateStorage: () => {
        console.log('🔄 Zustand persist: 복원 시작...')
        return (state) => {
          if (state) {
            // API 키가 저장되어 있지 않으면 .env에서 자동 로드
            if (!state.apiKey) {
              state.apiKey = import.meta.env.VITE_GEMINI_API_KEY || ''
              if (state.apiKey) {
                console.log('🔑 Gemini API 키 자동 로드됨 (.env)')
              }
            }
            if (!state.klingApiKey) {
              state.klingApiKey = import.meta.env.VITE_KLING_API_KEY || ''
              if (state.klingApiKey) {
                console.log('🔑 Kling API 키 자동 로드됨 (.env)')
              }
            }
            if (!state.openaiApiKey) {
              state.openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
              if (state.openaiApiKey) {
                console.log('🔑 OpenAI API 키 자동 로드됨 (.env)')
              }
            }
            
            console.log('✅ Zustand persist: 상태 복원됨', {
              nodeCount: state.nodes?.length ?? 0,
              edgeCount: state.edges?.length ?? 0,
              hasApiKey: !!state.apiKey,
              hasKlingApiKey: !!state.klingApiKey,
              hasOpenaiApiKey: !!state.openaiApiKey,
            })
            try {
              state.edges = normalizeEdges(state.edges, state.nodes)
              console.log('✅ Edges 정규화 완료')
            } catch (error) {
              console.error('❌ Error normalizing edges on rehydrate:', error)
              // Reset to safe state if normalization fails
              state.edges = []
            }
          } else {
            console.log('ℹ️ Zustand persist: 복원할 상태 없음 (새 시작)')
          }
        }
      },
    }
  )
)

export const createWorkflowNode = (type: NodeType, position: { x: number; y: number }): WorkflowNode => ({
  id: `${type}-${crypto.randomUUID?.() ?? Date.now()}`,
  type,
  position,
  data: createNodeData(type),
})
