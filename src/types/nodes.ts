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
  filePath?: string  // 원본 파일 경로 저장
  fileName?: string  // 파일 이름 저장
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

export type RotationSubject = 'camera-orbit' | 'character-turn'

export type MotionPromptNodeData = {
  basePrompt: string
  cameraMovement: string
  subjectMotion: string
  lighting: string
  combinedPrompt: string
  // Camera Control (360도 시스템)
  cameraRotation: number  // 0 ~ 360 degrees (360도 회전: 0°=정면, 90°=오른쪽, 180°=뒤, 270°=왼쪽)
  cameraTilt: number      // -45 ~ 45 degrees (상하 틸트)
  cameraDistance: number  // 0.5 ~ 2.0 (거리/줌)
  // Rotation Subject (회전 기준)
  rotationSubject: RotationSubject  // 'camera-orbit' = 카메라가 회전 (배경도 회전), 'character-turn' = 인물만 회전 (배경 고정)
  // Keyframe Animation (시작/끝 프레임)
  enableKeyframes: boolean  // 키프레임 애니메이션 활성화
  // Start Frame
  startRotation: number   // 시작 프레임 회전
  startTilt: number       // 시작 프레임 틸트
  startDistance: number   // 시작 프레임 거리
  // End Frame
  endRotation: number     // 끝 프레임 회전
  endTilt: number         // 끝 프레임 틸트
  endDistance: number     // 끝 프레임 거리
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
  | 'kling-v1-5'
  | 'kling-v1-6'
  | 'kling-v1-pro' 
  | 'kling-v2-5'
  | 'kling-v2-6'

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
  // 🎥 Camera parameters (for precise angle control like Motion Prompt)
  cameraRotation?: number  // 0-360 degrees
  cameraTilt?: number      // -90 to +90 degrees
  cameraDistance?: number  // 0.1 to 3.0 (zoom multiplier)
}

// 📐 Grid Preset Templates
export type GridPresetType =
  // Character Mode Presets
  | 'character-sheet-6'  // 2x3: Character reference sheet
  | 'turnaround-4'       // 2x2: Basic turnaround
  | 'expression-9'       // 3x3: Facial expressions
  | 'pose-6'             // 2x3: Action poses
  | 'photography-master-9' // 3x3: Professional photography angles (Gemini optimized)
  // Storyboard Mode Presets
  | 'cinematic-3'        // 1x3: Wide, Medium, Close-up
  | 'film-sequence-6'    // 2x3: Story progression
  | 'shot-variety-9'     // 3x3: Camera angle variety
  | 'emotion-journey-4'  // 2x2: Emotional progression
  | 'action-sequence-6'  // 2x3: Dynamic action scene
  | 'dialogue-scene-4'   // 2x2: Conversation shot/reverse
  | 'hero-journey-9'     // 3x3: Complete hero's journey arc
  | 'satire-slice-of-life-6' // 2x3: Satire / Slice of life (Pink Bubble style)
  | 'emotional-beat-6'   // 2x3: Character emotional journey
  | 'comedy-timing-6'    // 2x3: Comedy setup → punchline
  | 'custom'             // User-defined

export type GridPreset = {
  type: GridPresetType
  name: string
  description: string
  mode: GridMode
  gridLayout: GridLayout
  slots: GridSlot[]
}

export type GridNodeData = {
  status: NodeStatus
  mode: GridMode  // Character or Storyboard
  gridLayout: GridLayout
  slots: GridSlot[]
  currentPreset?: GridPresetType  // Track active preset
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
  mode: 'expand' | 'improve' | 'translate' | 'simplify' | 'describe' | 'analyze' | 'cameraInterpreter'  // 처리 모드
  style: 'detailed' | 'concise' | 'creative' | 'professional'  // 출력 스타일
  language: 'ko' | 'en' | 'auto'  // 출력 언어
  targetUse: 'image' | 'video' | 'general'  // 용도
  provider: 'gemini' | 'openai'  // LLM Provider
  model: 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.5-pro' | 'gpt-4o' | 'gpt-4o-mini' | 'gpt-4-turbo' | 'gpt-3.5-turbo'  // LLM 모델
  referenceMode: 'creative' | 'balanced' | 'exact'  // Reference accuracy level (Grid Composer → Nano Banana)
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
        cameraRotation: 0,    // 기본값: 0도 (정면)
        cameraTilt: 0,        // 기본값: 0도 (Eye Level)
        cameraDistance: 1.0,  // 기본값: 1.0x (보통 거리)
        rotationSubject: 'character-turn',  // 기본값: 인물 회전 (AI가 더 잘 이해함)
        // Keyframe Animation
        enableKeyframes: false,  // 기본값: 비활성화
        startRotation: 0,
        startTilt: 0,
        startDistance: 1.0,
        endRotation: 0,
        endTilt: 0,
        endDistance: 1.0,
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
        model: 'kling-v1-6',  // 최신 안정 버전
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
        currentPreset: 'character-sheet-6',  // Default preset
        slots: [
          { id: 'S1', label: 'Front View', metadata: 'Front facing, neutral pose', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.0 },
          { id: 'S2', label: 'Left Side', metadata: 'Left side profile, 90°', cameraRotation: 90, cameraTilt: 0, cameraDistance: 1.0 },
          { id: 'S3', label: 'Back View', metadata: 'Back view, 180°', cameraRotation: 180, cameraTilt: 0, cameraDistance: 1.0 },
          { id: 'S4', label: 'Right 3/4', metadata: 'Three-quarter view from right', cameraRotation: 315, cameraTilt: 0, cameraDistance: 1.0 },
          { id: 'S5', label: 'Face Close-up', metadata: 'Detailed facial features', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.6 },
          { id: 'S6', label: 'Hand Detail', metadata: 'Hand gesture reference', cameraRotation: 315, cameraTilt: -20, cameraDistance: 0.5 },
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
        aspectRatioMode: 'cover',  // Default: maintain aspect ratio and fill cell (minimal padding)
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
        provider: 'gemini',  // 기본값: Gemini
        model: 'gemini-2.5-flash',
        referenceMode: 'exact',  // 기본값: 정확성 (프로 작업)
      }
    default:
      return {}
  }
}
