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
  abortControllers: Map<string, AbortController>
  history: HistoryState[]
  historyIndex: number
  imageModal: { isOpen: boolean; imageUrl: string | null }
  setSelectedNodeId: (id: string | null) => void
  setApiKey: (key: string) => void
  setKlingApiKey: (key: string) => void
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
      apiKey: '',
      klingApiKey: '',
      abortControllers: new Map(),
      history: [],
      historyIndex: -1,
      imageModal: { isOpen: false, imageUrl: null },
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setApiKey: (key) => set({ apiKey: key }),
      setKlingApiKey: (key) => set({ klingApiKey: key }),
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
            referenceImages.push(imageDataUrl)
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
        referenceImages.push(inputImageDataUrl)
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

      // Add reference prompts to main prompt if available
      const enhancedPrompt = referencePrompts.length > 0
        ? `${prompt}\n\n${referencePrompts.join('\n')}`
        : prompt
      
      const model = data.model ?? 'gemini-3-pro-image-preview'
      
      console.log('🎨 Nano Image Generation:', {
        model,
        resolution: data.resolution,
        aspectRatio: data.aspectRatio,
        referenceCount: referenceImages.length,
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

      updateNode((prev) => ({
        ...prev,
        status: 'completed',
        outputImageUrl: result.imageUrl,
        outputImageDataUrl: result.imageDataUrl,
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

    if (!inputImageUrl || !inputPrompt) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '이미지와 프롬프트를 모두 연결해 주세요.',
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
          inputImageDataUrl,
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

    if (!inputImageUrl || !inputImageDataUrl || !inputPrompt) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: 'Start Image와 프롬프트를 모두 연결해 주세요.',
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

    console.log('🎬 Kling Video 생성 시작:', {
      useMock: !klingApiKey,
      prompt: inputPrompt,
      model: (current.data as KlingVideoNodeData).model,
    })

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
          inputImageDataUrl,
          {
            duration: settings.duration,
            aspectRatio: settings.aspectRatio,
            model: settings.model,
            endImageDataUrl: endImageDataUrl,
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

    // Get input prompt from connected node or use internal input
    let inputPrompt = data.inputPrompt
    
    const incoming = getIncomingNodes(id, edges, get().nodes)
    
    // Check for prompt connection
    const promptEdge = edges.find((e) => e.target === id && e.targetHandle === 'prompt')
    if (promptEdge) {
      const promptNode = get().nodes.find((n) => n.id === promptEdge.source)
      if (promptNode?.type === 'textPrompt') {
        inputPrompt = (promptNode.data as any).prompt || inputPrompt
      }
    }
    
    // Check for image connection
    let referenceImageDataUrl: string | undefined
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
        referenceImageDataUrl = (imageNode.data as any).composedImageDataUrl || (imageNode.data as any).composedImageUrl
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

    const apiKey = get().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ''
    
    if (!apiKey) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: 'Gemini API Key가 필요합니다.',
      }))
      return
    }

    try {
      // Build system instruction based on mode and settings
      let systemInstruction = ''
      
      if (data.mode === 'expand') {
        systemInstruction = `You are a professional prompt engineer. Your task is to expand the given simple idea into a detailed, effective prompt for AI ${data.targetUse} generation.`
      } else if (data.mode === 'improve') {
        systemInstruction = `You are a professional prompt engineer. Your task is to improve and optimize the given prompt for better AI ${data.targetUse} generation results.`
      } else if (data.mode === 'translate') {
        systemInstruction = `You are a professional translator. Translate the given prompt between Korean and English, maintaining all important details and nuances.`
      } else if (data.mode === 'simplify') {
        systemInstruction = `You are a professional editor. Simplify the given prompt to its core essence while maintaining effectiveness for AI ${data.targetUse} generation.`
      } else if (data.mode === 'describe') {
        systemInstruction = `You are a professional image analyst. Your task is to describe the given image in detail and create an effective prompt that could be used to generate a similar image.`
      } else if (data.mode === 'analyze') {
        systemInstruction = `You are a professional image analyst. Your task is to analyze the given image in great detail, including composition, style, lighting, colors, subjects, and create a comprehensive prompt for AI ${data.targetUse} generation.`
      }

      // Add style guidance
      if (data.style === 'detailed') {
        systemInstruction += ` Output should be highly detailed with rich descriptions.`
      } else if (data.style === 'concise') {
        systemInstruction += ` Output should be concise and to the point.`
      } else if (data.style === 'creative') {
        systemInstruction += ` Output should be creative and artistic with vivid imagery.`
      } else if (data.style === 'professional') {
        systemInstruction += ` Output should be professional and technically precise.`
      }

      // Add language guidance
      if (data.language === 'ko') {
        systemInstruction += ` Output must be in Korean.`
      } else if (data.language === 'en') {
        systemInstruction += ` Output must be in English.`
      } else {
        systemInstruction += ` Detect input language and use the same language for output.`
      }

      systemInstruction += ` Only output the final prompt, no explanations or additional text.`

      // Prepare content parts
      const contentParts: any[] = []
      
      // Add image if available
      if (referenceImageDataUrl) {
        // Extract base64 data from data URL
        const base64Match = referenceImageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/)
        if (base64Match) {
          const mimeType = `image/${base64Match[1]}`
          const base64Data = base64Match[2]
          
          contentParts.push({
            inlineData: {
              mimeType: mimeType,
              data: base64Data
            }
          })
        }
      }
      
      // Add text prompt
      if (inputPrompt.trim()) {
        contentParts.push({
          text: inputPrompt
        })
      } else if (data.mode === 'describe') {
        contentParts.push({
          text: 'Describe this image in detail and create a prompt for generating a similar image.'
        })
      } else if (data.mode === 'analyze') {
        contentParts.push({
          text: 'Analyze this image comprehensively (composition, style, lighting, colors, subjects, mood) and create a detailed prompt for AI image generation.'
        })
      } else if (referenceImageDataUrl) {
        // If only image is provided without text, use a default instruction
        contentParts.push({
          text: 'Describe this image and create an effective prompt for AI image generation.'
        })
      }
      
      // Validate we have content to send
      if (contentParts.length === 0) {
        throw new Error('프롬프트 또는 이미지를 입력해주세요.')
      }

      // Call Gemini API
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${data.model}:generateContent?key=${apiKey}`
      
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
            maxOutputTokens: 1024,
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API Error: ${response.status}`)
      }

      const result = await response.json()
      const outputPrompt = result.candidates?.[0]?.content?.parts?.[0]?.text || ''

      if (!outputPrompt) {
        throw new Error('LLM이 응답을 생성하지 못했습니다.')
      }

      updateNode((prev) => ({
        ...prev,
        status: 'completed',
        outputPrompt: outputPrompt.trim(),
        error: undefined,
      }))
    } catch (error: any) {
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
        }
      },
      onRehydrateStorage: () => {
        console.log('🔄 Zustand persist: 복원 시작...')
        return (state) => {
          if (state) {
            console.log('✅ Zustand persist: 상태 복원됨', {
              nodeCount: state.nodes?.length ?? 0,
              edgeCount: state.edges?.length ?? 0,
              hasApiKey: !!state.apiKey,
              hasKlingApiKey: !!state.klingApiKey,
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
