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
import type {
  GeminiVideoNodeData,
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
  setSelectedNodeId: (id: string | null) => void
  setApiKey: (key: string) => void
  setKlingApiKey: (key: string) => void
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
    default:
      return 'edge-default'
  }
}

const normalizeEdges = (edges: WorkflowEdge[], nodes: WorkflowNode[]) =>
  edges.map((edge) => ({
    ...edge,
    type: 'bezier',
    className: getEdgeClass(edge, nodes),
  }))

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

const sanitizeNodesForStorage = (nodes: WorkflowNode[]): WorkflowNode[] =>
  nodes.map((node) => {
    const data = { ...(node.data as Record<string, unknown>) }
    delete data.imageDataUrl
    delete data.outputImageDataUrl
    delete data.inputImageDataUrl
    if (typeof data.imageUrl === 'string' && data.imageUrl.startsWith('blob:')) {
      delete data.imageUrl
      delete data.width
      delete data.height
    }
    if (typeof data.outputImageUrl === 'string' && data.outputImageUrl.startsWith('blob:')) {
      delete data.outputImageUrl
    }
    if (typeof data.outputVideoUrl === 'string' && data.outputVideoUrl.startsWith('blob:')) {
      delete data.outputVideoUrl
    }
    if (node.type === 'nanoImage') {
      data.status = 'idle'
      delete data.error
    }
    if (node.type === 'geminiVideo') {
      data.status = 'idle'
      data.progress = 0
      delete data.error
    }
    if (node.type === 'klingVideo') {
      data.status = 'idle'
      data.progress = 0
      delete data.error
      delete data.taskId
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
      setSelectedNodeId: (id) => set({ selectedNodeId: id }),
      setApiKey: (key) => set({ apiKey: key }),
      setKlingApiKey: (key) => set({ klingApiKey: key }),
  onNodesChange: (changes) => {
    const newNodes = applyNodeChanges(changes, get().nodes) as WorkflowNode[]
    set({ 
      nodes: newNodes,
      edges: normalizeEdges(get().edges, newNodes)
    })
    // Save to history for add/remove changes (not for select/drag)
    const shouldSaveHistory = changes.some(change => 
      change.type === 'add' || change.type === 'remove'
    )
    if (shouldSaveHistory) {
      saveToHistory(get, set)
    }
  },
  onEdgesChange: (changes) => {
    set({
      edges: normalizeEdges(
        applyEdgeChanges(changes, get().edges),
        get().nodes,
      ),
    })
    // Save to history for add/remove changes
    const shouldSaveHistory = changes.some(change => 
      change.type === 'add' || change.type === 'remove'
    )
    if (shouldSaveHistory) {
      saveToHistory(get, set)
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
  updateNodeData: (id, data) =>
    set({
      nodes: get().nodes.map((node) =>
        node.id === id ? { ...node, data } : node,
      ),
    }),
  saveWorkflow: () => {
    try {
      const payload = JSON.stringify({
        nodes: sanitizeNodesForStorage(get().nodes),
        edges: get().edges,
      })
      localStorage.setItem(STORAGE_KEY, payload)
      return true
    } catch {
      return false
    }
  },
  loadWorkflow: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return false
      const parsed = JSON.parse(raw) as { nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }
      const nodes = Array.isArray(parsed.nodes) ? parsed.nodes : []
      const edges = Array.isArray(parsed.edges) ? parsed.edges : []
      set({
        nodes,
        edges: normalizeEdges(edges, nodes),
        selectedNodeId: null,
      })
      return true
    } catch {
      return false
    }
  },
  importWorkflow: (nodes, edges) => {
    try {
      set({
        nodes,
        edges: normalizeEdges(edges, nodes),
        selectedNodeId: null,
      })
      saveToHistory(get, set)
      return true
    } catch {
      return false
    }
  },
  exportWorkflow: () => {
    const { nodes, edges } = get()
    return JSON.stringify({
      version: '1.0',
      timestamp: new Date().toISOString(),
      nodes: sanitizeNodesForStorage(nodes),
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
    const promptNode = incoming.find(
      (node) => node.type === 'textPrompt' || node.type === 'motionPrompt',
    )
    const imageNode =
      incoming.find((node) => node.type === 'imageImport') ??
      incoming.find((node) => node.type === 'nanoImage')
    const prompt =
      promptNode?.type === 'textPrompt'
        ? (promptNode.data as TextPromptNodeData).prompt
        : promptNode?.type === 'motionPrompt'
          ? (promptNode.data as MotionPromptNodeData).combinedPrompt
          : ''

    const inputImageDataUrl =
      imageNode?.type === 'imageImport'
        ? (imageNode.data as ImageImportNodeData).imageDataUrl
        : imageNode?.type === 'nanoImage'
          ? (imageNode.data as NanoImageNodeData).outputImageDataUrl
          : undefined
    const referencePrompt =
      imageNode?.type === 'imageImport'
        ? getIncomingTextPrompt(imageNode.id, edges, get().nodes) ??
          (imageNode.data as ImageImportNodeData).referencePrompt
        : undefined

    if (!prompt.trim()) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '텍스트 프롬프트 노드를 연결해 주세요.',
      }))
      return
    }

    updateNode((prev) => ({
      ...prev,
      status: 'processing',
      error: undefined,
    }))

    const apiKey = get().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ''
    const client = apiKey ? new GeminiAPIClient(apiKey) : new MockGeminiAPI()

    try {
      // Check if aborted before starting
      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

      const data = current.data as NanoImageNodeData
      const finalPrompt = referencePrompt
        ? `${prompt}, focus on: ${referencePrompt}`
        : prompt
      const model = data.model ?? 'gemini-3-pro-image-preview'
      
      // Debug log for aspect ratio
      console.log('🎨 Nano Image Generation Settings:', {
        model,
        resolution: data.resolution,
        aspectRatio: data.aspectRatio,
        prompt: finalPrompt.substring(0, 50) + '...'
      })
      
      const result = await client.generateImage(
        finalPrompt,
        data.aspectRatio,
        inputImageDataUrl,
        model,
        data.resolution,
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
        error: undefined, // Clear any previous errors
      }))
    } catch (error) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: formatErrorMessage(error),
      }))
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
      incoming.find((node) => node.type === 'nanoImage')
    const promptNode = incoming.find(
      (node) => node.type === 'motionPrompt' || node.type === 'textPrompt',
    )

    const inputImageUrl =
      imageNode?.type === 'imageImport'
        ? (imageNode.data as ImageImportNodeData).imageUrl
        : imageNode?.type === 'nanoImage'
          ? (imageNode.data as NanoImageNodeData).outputImageUrl
          : undefined
    const inputImageDataUrl =
      imageNode?.type === 'imageImport'
        ? (imageNode.data as ImageImportNodeData).imageDataUrl
        : imageNode?.type === 'nanoImage'
          ? (imageNode.data as NanoImageNodeData).outputImageDataUrl
          : undefined

    const inputPrompt =
      promptNode?.type === 'motionPrompt'
        ? (promptNode.data as MotionPromptNodeData).combinedPrompt
        : promptNode?.type === 'textPrompt'
          ? (promptNode.data as TextPromptNodeData).prompt
          : ''

    if (!inputImageUrl || !inputPrompt) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: '이미지와 프롬프트를 모두 연결해 주세요.',
      }))
      return
    }

    updateNode((prev) => ({
      ...prev,
      status: 'processing',
      error: undefined, // Clear any previous errors
      inputImageUrl,
      inputImageDataUrl,
      inputPrompt,
      progress: 10,
    }))

    const apiKey = get().apiKey || import.meta.env.VITE_GEMINI_API_KEY || ''
    const client = apiKey ? new GeminiAPIClient(apiKey) : new MockGeminiAPI()

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
      // Check if aborted before starting
      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

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

      // Check if aborted after completion
      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

      updateNode((prev) => ({
        ...prev,
        status: 'completed',
        outputVideoUrl,
        progress: 100,
        error: undefined, // Clear any previous errors
      }))

    } catch (error) {
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: formatErrorMessage(error),
      }))
    } finally {
      clearInterval(progressTimer)
      // Clean up abort controller
      const controllers = get().abortControllers
      controllers.delete(id)
      set({ abortControllers: new Map(controllers) })
    }
  },
  runKlingNode: async (id) => {
    const { nodes, edges, abortControllers } = get()
    const current = nodes.find((node) => node.id === id)
    if (!current || current.type !== 'klingVideo') return

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
      return node?.type === 'imageImport' || node?.type === 'nanoImage'
    })
    const startImageNodeData = startImageNode ? nodes.find((n) => n.id === startImageNode.source) : undefined
    
    // End Image (끝 프레임) - 'end' 핸들 연결
    const endImageEdges = edges.filter(
      (e) => e.target === id && e.targetHandle === 'end'
    )
    const endImageNode = endImageEdges.find((e) => {
      const node = nodes.find((n) => n.id === e.source)
      return node?.type === 'imageImport' || node?.type === 'nanoImage'
    })
    const endImageNodeData = endImageNode ? nodes.find((n) => n.id === endImageNode.source) : undefined

    // Prompt 노드
    const incoming = getIncomingNodes(id, edges, get().nodes)
    const promptNode = incoming.find(
      (node) => node.type === 'motionPrompt' || node.type === 'textPrompt',
    )

    // Start Image 데이터
    const inputImageUrl =
      startImageNodeData?.type === 'imageImport'
        ? (startImageNodeData.data as ImageImportNodeData).imageUrl
        : startImageNodeData?.type === 'nanoImage'
          ? (startImageNodeData.data as NanoImageNodeData).outputImageUrl
          : undefined
    const inputImageDataUrl =
      startImageNodeData?.type === 'imageImport'
        ? (startImageNodeData.data as ImageImportNodeData).imageDataUrl
        : startImageNodeData?.type === 'nanoImage'
          ? (startImageNodeData.data as NanoImageNodeData).outputImageDataUrl
          : undefined

    // End Image 데이터
    const endImageUrl =
      endImageNodeData?.type === 'imageImport'
        ? (endImageNodeData.data as ImageImportNodeData).imageUrl
        : endImageNodeData?.type === 'nanoImage'
          ? (endImageNodeData.data as NanoImageNodeData).outputImageUrl
          : undefined
    const endImageDataUrl =
      endImageNodeData?.type === 'imageImport'
        ? (endImageNodeData.data as ImageImportNodeData).imageDataUrl
        : endImageNodeData?.type === 'nanoImage'
          ? (endImageNodeData.data as NanoImageNodeData).outputImageDataUrl
          : undefined

    const inputPrompt =
      promptNode?.type === 'motionPrompt'
        ? (promptNode.data as MotionPromptNodeData).combinedPrompt
        : promptNode?.type === 'textPrompt'
          ? (promptNode.data as TextPromptNodeData).prompt
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
      error: undefined, // Clear any previous errors
      inputImageUrl,
      inputImageDataUrl,
      endImageUrl,
      endImageDataUrl,
      inputPrompt,
      progress: 10,
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
      // Check if aborted before starting
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

      const outputVideoUrl = await client.generateVideo(
        inputPrompt,
        inputImageDataUrl,
        {
          duration: settings.duration,
          aspectRatio: settings.aspectRatio,
          model: settings.model,
          endImageDataUrl: endImageDataUrl,
          cameraControl: cameraControl,
        },
      )

      // Check if aborted after completion
      if (abortController.signal.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }

      console.log('✅ Kling Video 생성 완료:', outputVideoUrl)

      updateNode((prev) => ({
        ...prev,
        status: 'completed',
        outputVideoUrl,
        progress: 100,
        error: undefined, // Clear any previous errors
      }))
    } catch (error) {
      console.error('❌ Kling Video 생성 실패:', error)
      updateNode((prev) => ({
        ...prev,
        status: 'error',
        error: formatErrorMessage(error),
      }))
    } finally {
      clearInterval(progressTimer)
      // Clean up abort controller
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
          incoming.find((node) => node.type === 'nanoImage')
        const prompt =
          promptNode?.type === 'textPrompt'
            ? (promptNode.data as TextPromptNodeData).prompt
            : promptNode?.type === 'motionPrompt'
              ? (promptNode.data as MotionPromptNodeData).combinedPrompt
              : ''

        const inputImageDataUrl =
          imageNode?.type === 'imageImport'
            ? (imageNode.data as ImageImportNodeData).imageDataUrl
            : imageNode?.type === 'nanoImage'
              ? (imageNode.data as NanoImageNodeData).outputImageDataUrl
              : undefined
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
          incoming.find((node) => node.type === 'nanoImage')
        const promptNode = incoming.find(
          (node) => node.type === 'motionPrompt' || node.type === 'textPrompt',
        )

        const inputImageUrl =
          imageNode?.type === 'imageImport'
            ? (imageNode.data as ImageImportNodeData).imageUrl
            : imageNode?.type === 'nanoImage'
              ? (imageNode.data as NanoImageNodeData).outputImageUrl
              : undefined
        const inputImageDataUrl =
          imageNode?.type === 'imageImport'
            ? (imageNode.data as ImageImportNodeData).imageDataUrl
            : imageNode?.type === 'nanoImage'
              ? (imageNode.data as NanoImageNodeData).outputImageDataUrl
              : undefined

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
  cancelNodeExecution: (id) => {
    const { abortControllers } = get()
    const controller = abortControllers.get(id)
    if (controller) {
      controller.abort()
      abortControllers.delete(id)
      set({ abortControllers: new Map(abortControllers) })
      
      // Update node status to idle
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
    }
  },
    }),
    {
      name: 'nano-banana-workflow-v3',
      partialize: (state) => ({
        nodes: sanitizeNodesForStorage(state.nodes),
        edges: sanitizeEdgesForStorage(state.edges),
        apiKey: state.apiKey,
        klingApiKey: state.klingApiKey,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.edges = normalizeEdges(state.edges, state.nodes)
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
