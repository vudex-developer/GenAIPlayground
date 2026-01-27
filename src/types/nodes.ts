import type { Edge, Node } from 'reactflow'

export type NodeType =
  | 'imageImport'
  | 'nanoImage'
  | 'textPrompt'
  | 'motionPrompt'
  | 'geminiVideo'
  | 'klingVideo'
  | 'gridNode'
  | 'cellRegenerator'
  | 'gridComposer'
  | 'llmPrompt'

export type NodeStatus = 'idle' | 'processing' | 'completed' | 'error'

export type ImageImportNodeData = {
  imageUrl?: string
  imageDataUrl?: string
  width?: number
  height?: number
  referencePrompt?: string
}

export type TextPromptNodeData = {
  prompt: string
}

export type NanoImageModel = 'gemini-2.5-flash-image' | 'gemini-3-pro-image-preview'
export type NanoImageResolution = '1K' | '2K' | '4K'

export type NanoImageNodeData = {
  status: NodeStatus
  prompt: string
  model: NanoImageModel
  resolution: NanoImageResolution
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '3:2' | '2:3' | '5:4' | '4:5'
  outputImageUrl?: string
  outputImageDataUrl?: string
  error?: string
  // Store settings used for generation
  generatedModel?: NanoImageModel
  generatedResolution?: NanoImageResolution
  generatedAspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '3:2' | '2:3' | '5:4' | '4:5'
  // Multi-reference support
  maxReferences: number  // Number of reference input handles (1-5)
}

export type MotionPromptNodeData = {
  basePrompt: string
  cameraMovement: string
  subjectMotion: string
  lighting: string
  combinedPrompt: string
}

export type GeminiVideoModel =
  | 'veo-3.1-generate-preview'
  | 'veo-3.1-fast-generate-preview'
  | 'veo-3.0-generate-001'
  | 'veo-3.0-fast-generate-001'
  | 'veo-2.0-generate-001'

export type GeminiVideoNodeData = {
  status: NodeStatus
  inputImageUrl?: string
  inputImageDataUrl?: string
  inputPrompt?: string
  model: GeminiVideoModel
  duration: 5 | 10
  motionIntensity: 'low' | 'medium' | 'high'
  quality: 'standard' | 'high'
  outputVideoUrl?: string
  progress: number
  error?: string
}

export type KlingVideoModel = 
  | 'kling-v1' 
  | 'kling-v1-pro' 
  | 'kling-v2.1-pro' 
  | 'kling-v2.5-pro'

export type KlingCameraControl = 
  | 'none'
  | 'horizontal' 
  | 'vertical' 
  | 'pan' 
  | 'tilt' 
  | 'roll' 
  | 'zoom'

export type KlingVideoNodeData = {
  status: NodeStatus
  inputImageUrl?: string
  inputImageDataUrl?: string
  endImageUrl?: string
  endImageDataUrl?: string
  inputPrompt?: string
  model: KlingVideoModel
  duration: 5 | 10
  aspectRatio: '16:9' | '9:16' | '1:1'
  enableMotionControl: boolean
  cameraControl: KlingCameraControl
  motionValue: number
  outputVideoUrl?: string
  taskId?: string
  progress: number
  error?: string
}

// Grid Node Types
export type GridLayout = '1x2' | '1x3' | '1x4' | '1x6' | '2x2' | '2x3' | '3x2' | '3x3'
export type GridMode = 'character' | 'storyboard'

export type GridSlot = {
  id: string
  label: string  // Front, Side, Wide, Medium, etc.
  metadata: string  // Additional info
}

export type GridNodeData = {
  status: NodeStatus
  mode: GridMode  // Character or Storyboard
  gridLayout: GridLayout
  slots: GridSlot[]
  // Generated prompts (assembled from connected prompt nodes)
  generatedPrompts: { [slotId: string]: string }
  error?: string
}

// Cell Regenerator Node Types
export type CellRegeneratorNodeData = {
  status: NodeStatus
  gridLayout?: GridLayout  // From connected Grid Node
  slots?: GridSlot[]  // From connected Grid Node
  inputImageUrl?: string  // Labeled grid image
  inputImageDataUrl?: string
  model: NanoImageModel
  resolution: NanoImageResolution
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
  // Regenerated images (one per slot, without labels)
  regeneratedImages: { [slotId: string]: string }  // slotId -> image URL
  error?: string
}

// Grid Composer Node Types
export type GridComposerNodeData = {
  status: NodeStatus
  gridLayout?: GridLayout  // From connected Grid Node
  slots?: GridSlot[]  // From connected Grid Node
  // Individual images for each slot
  inputImages: { [slotId: string]: string }  // slotId -> image URL
  // Composed grid image
  composedImageUrl?: string
  composedImageDataUrl?: string
  // Options
  showLabels: boolean
  showBorders: boolean
  borderWidth: number
  borderColor: string
  labelSize: number
  labelColor: string
  backgroundColor: string
  cellPadding: number
  aspectRatioMode: 'stretch' | 'contain' | 'cover'  // How to fit images in cells
  error?: string
}

// LLM Prompt Helper Node Types
export type LLMPromptNodeData = {
  status: NodeStatus
  inputPrompt: string  // 사용자가 입력한 간단한 프롬프트
  outputPrompt: string  // LLM이 생성한 정제된 프롬프트
  mode: 'expand' | 'improve' | 'translate' | 'simplify' | 'describe' | 'analyze'  // 처리 모드
  style: 'detailed' | 'concise' | 'creative' | 'professional'  // 출력 스타일
  language: 'ko' | 'en' | 'auto'  // 출력 언어
  targetUse: 'image' | 'video' | 'general'  // 용도
  model: 'gemini-2.0-flash-exp' | 'gemini-1.5-flash' | 'gemini-1.5-pro'  // LLM 모델
  referenceImageUrl?: string  // 참고 이미지 URL
  referenceImageDataUrl?: string  // 참고 이미지 Data URL
  error?: string
}

export type NodeData =
  | ImageImportNodeData
  | NanoImageNodeData
  | TextPromptNodeData
  | MotionPromptNodeData
  | GeminiVideoNodeData
  | KlingVideoNodeData
  | GridNodeData
  | CellRegeneratorNodeData
  | GridComposerNodeData
  | LLMPromptNodeData

export type WorkflowNode = Node<NodeData, NodeType>

export type WorkflowEdge = Edge

export const createNodeData = (type: NodeType): NodeData => {
  switch (type) {
    case 'imageImport':
      return {}
    case 'textPrompt':
      return { prompt: '' }
    case 'nanoImage':
      return {
        status: 'idle',
        prompt: '',
        model: 'gemini-3-pro-image-preview',
        resolution: '2K',
        aspectRatio: '1:1',
        maxReferences: 3,  // Default: 3 reference images
      }
    case 'motionPrompt':
      return {
        basePrompt: '',
        cameraMovement: '',
        subjectMotion: '',
        lighting: '',
        combinedPrompt: '',
      }
    case 'geminiVideo':
      return {
        status: 'idle',
        model: 'veo-3.1-generate-preview',
        duration: 5,
        motionIntensity: 'medium',
        quality: 'high',
        progress: 0,
      }
    case 'klingVideo':
      return {
        status: 'idle',
        model: 'kling-v1',
        duration: 5,
        aspectRatio: '16:9',
        enableMotionControl: false,
        cameraControl: 'none',
        motionValue: 0,
        progress: 0,
      }
    case 'gridNode':
      return {
        status: 'idle',
        mode: 'character',
        gridLayout: '2x3',
        slots: [
          { id: 'S1', label: 'Front', metadata: '' },
          { id: 'S2', label: 'Side', metadata: '' },
          { id: 'S3', label: 'Back', metadata: '' },
          { id: 'S4', label: '3/4', metadata: '' },
          { id: 'S5', label: 'Face', metadata: '' },
          { id: 'S6', label: 'Hand', metadata: '' },
        ],
        generatedPrompts: {},
      }
    case 'cellRegenerator':
      return {
        status: 'idle',
        model: 'gemini-3-pro-image-preview',
        resolution: '2K',
        aspectRatio: '1:1',
        regeneratedImages: {},
      }
    case 'gridComposer':
      return {
        status: 'idle',
        inputImages: {},
        showLabels: true,
        showBorders: true,
        borderWidth: 2,
        borderColor: '#ffffff',
        labelSize: 24,
        labelColor: '#ffffff',
        backgroundColor: '#000000',
        cellPadding: 10,
        aspectRatioMode: 'contain',  // Default: maintain aspect ratio with padding
      }
    case 'llmPrompt':
      return {
        status: 'idle',
        inputPrompt: '',
        outputPrompt: '',
        mode: 'expand',
        style: 'detailed',
        language: 'auto',
        targetUse: 'image',
        model: 'gemini-2.0-flash-exp',
      }
    default:
      return {}
  }
}
