import type { Edge, Node } from 'reactflow'

export type NodeType =
  | 'imageImport'
  | 'nanoImage'
  | 'textPrompt'
  | 'motionPrompt'
  | 'geminiVideo'
  | 'klingVideo'

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
  confidence?: number
  subject?: string
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

export type NodeData =
  | ImageImportNodeData
  | NanoImageNodeData
  | TextPromptNodeData
  | MotionPromptNodeData
  | GeminiVideoNodeData
  | KlingVideoNodeData

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
    default:
      return {}
  }
}
