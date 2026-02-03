import type { GridPreset, GridPresetType } from '../types/nodes'

/**
 * 📐 Grid Preset Templates
 * 원클릭으로 그리드 레이아웃과 슬롯을 자동 설정
 */

export const GRID_PRESETS: Record<GridPresetType, GridPreset> = {
  // ═══════════════════════════════════════════════════
  // 🧑 CHARACTER MODE PRESETS
  // ═══════════════════════════════════════════════════
  
  'character-sheet-6': {
    type: 'character-sheet-6',
    name: '📋 Character Sheet (6-View)',
    description: 'Standard character reference sheet with 6 key angles',
    mode: 'character',
    gridLayout: '2x3',
    slots: [
      { 
        id: 'S1', 
        label: 'Front View', 
        metadata: 'Front facing, neutral pose',
        cameraRotation: 0,      // 정면
        cameraTilt: 0,          // Eye level
        cameraDistance: 1.0     // Normal distance
      },
      { 
        id: 'S2', 
        label: 'Left Side', 
        metadata: 'Left side profile, 90°',
        cameraRotation: 90,     // 왼쪽 프로필
        cameraTilt: 0,
        cameraDistance: 1.0
      },
      { 
        id: 'S3', 
        label: 'Back View', 
        metadata: 'Back view, 180°',
        cameraRotation: 180,    // 뒷모습
        cameraTilt: 0,
        cameraDistance: 1.0
      },
      { 
        id: 'S4', 
        label: 'Right 3/4', 
        metadata: 'Three-quarter view from right',
        cameraRotation: 315,    // 오른쪽 3/4 (45도)
        cameraTilt: 0,
        cameraDistance: 1.0
      },
      { 
        id: 'S5', 
        label: 'Face Close-up', 
        metadata: 'Detailed facial features',
        cameraRotation: 0,      // 정면
        cameraTilt: 0,
        cameraDistance: 0.6     // Zoom in
      },
      { 
        id: 'S6', 
        label: 'Hand Detail', 
        metadata: 'Hand gesture reference',
        cameraRotation: 315,    // 약간 측면
        cameraTilt: -20,        // Low angle
        cameraDistance: 0.5     // Close-up
      },
    ],
  },

  'turnaround-4': {
    type: 'turnaround-4',
    name: '🔄 Turnaround (4-View)',
    description: 'Classic turnaround reference: Front, Side, Back, Side',
    mode: 'character',
    gridLayout: '2x2',
    slots: [
      { 
        id: 'S1', 
        label: 'Front (0°)', 
        metadata: 'Front view, facing camera',
        cameraRotation: 0,
        cameraTilt: 0,
        cameraDistance: 1.0
      },
      { 
        id: 'S2', 
        label: 'Left Side (90°)', 
        metadata: 'Left side profile',
        cameraRotation: 90,
        cameraTilt: 0,
        cameraDistance: 1.0
      },
      { 
        id: 'S3', 
        label: 'Back (180°)', 
        metadata: 'Back view',
        cameraRotation: 180,
        cameraTilt: 0,
        cameraDistance: 1.0
      },
      { 
        id: 'S4', 
        label: 'Right Side (270°)', 
        metadata: 'Right side profile',
        cameraRotation: 270,
        cameraTilt: 0,
        cameraDistance: 1.0
      },
    ],
  },

  'expression-9': {
    type: 'expression-9',
    name: '😊 Expression Sheet (9)',
    description: 'Facial expression variations for animation',
    mode: 'character',
    gridLayout: '3x3',
    slots: [
      { id: 'S1', label: 'Neutral', metadata: 'Baseline neutral expression', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.7 },
      { id: 'S2', label: 'Happy', metadata: 'Joyful, smiling', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.7 },
      { id: 'S3', label: 'Sad', metadata: 'Melancholic, downturned', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.7 },
      { id: 'S4', label: 'Angry', metadata: 'Intense, furrowed brow', cameraRotation: 0, cameraTilt: -10, cameraDistance: 0.7 },
      { id: 'S5', label: 'Surprised', metadata: 'Wide-eyed, mouth open', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.7 },
      { id: 'S6', label: 'Disgusted', metadata: 'Wrinkled nose', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.7 },
      { id: 'S7', label: 'Fearful', metadata: 'Worried, tense', cameraRotation: 0, cameraTilt: 5, cameraDistance: 0.7 },
      { id: 'S8', label: 'Confused', metadata: 'Puzzled, tilted head', cameraRotation: 15, cameraTilt: 0, cameraDistance: 0.7 },
      { id: 'S9', label: 'Determined', metadata: 'Focused, confident', cameraRotation: 0, cameraTilt: -15, cameraDistance: 0.7 },
    ],
  },

  'pose-6': {
    type: 'pose-6',
    name: '🤸 Pose Sheet (6)',
    description: 'Action poses and body language variations',
    mode: 'character',
    gridLayout: '2x3',
    slots: [
      { id: 'S1', label: 'Standing', metadata: 'Neutral standing pose', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.2 },
      { id: 'S2', label: 'Walking', metadata: 'Mid-stride walking', cameraRotation: 315, cameraTilt: 0, cameraDistance: 1.2 },
      { id: 'S3', label: 'Running', metadata: 'Dynamic running pose', cameraRotation: 45, cameraTilt: -10, cameraDistance: 1.3 },
      { id: 'S4', label: 'Sitting', metadata: 'Seated position', cameraRotation: 0, cameraTilt: 10, cameraDistance: 1.1 },
      { id: 'S5', label: 'Jumping', metadata: 'Mid-air jump', cameraRotation: 0, cameraTilt: -20, cameraDistance: 1.3 },
      { id: 'S6', label: 'Action Pose', metadata: 'Dynamic action stance', cameraRotation: 315, cameraTilt: -15, cameraDistance: 1.2 },
    ],
  },

  'photography-master-9': {
    type: 'photography-master-9',
    name: '📸 Photography Master (9)',
    description: 'Professional photography angles - Google Gemini optimized',
    mode: 'character',
    gridLayout: '3x3',
    slots: [
      // Row 1: Different framing distances
      { 
        id: 'S1', 
        label: 'Low-Angle Close-up', 
        metadata: 'Dramatic upward perspective, heroic framing',
        cameraRotation: 0, 
        cameraTilt: -35,      // Looking UP
        cameraDistance: 0.7   // Close-up
      },
      { 
        id: 'S2', 
        label: 'Medium Shot', 
        metadata: 'Waist-up, balanced composition, eye level',
        cameraRotation: 0, 
        cameraTilt: 0,        // Eye level
        cameraDistance: 1.0   // Medium
      },
      { 
        id: 'S3', 
        label: 'Wide Shot', 
        metadata: 'Full environment context, establishing shot',
        cameraRotation: 0, 
        cameraTilt: 0, 
        cameraDistance: 2.0   // Wide
      },
      
      // Row 2: Different camera positions (rotation)
      { 
        id: 'S4', 
        label: 'Left Profile', 
        metadata: 'Complete side view, 90° perpendicular',
        cameraRotation: 90,   // Left side
        cameraTilt: 0, 
        cameraDistance: 1.0
      },
      { 
        id: 'S5', 
        label: 'Portrait Close-up', 
        metadata: 'Face detail, 85mm portrait lens effect',
        cameraRotation: 0, 
        cameraTilt: 0, 
        cameraDistance: 0.6   // Tight close-up
      },
      { 
        id: 'S6', 
        label: 'Right Profile', 
        metadata: 'Complete side view, 90° perpendicular',
        cameraRotation: 270,  // Right side
        cameraTilt: 0, 
        cameraDistance: 1.0
      },
      
      // Row 3: Different vertical angles
      { 
        id: 'S7', 
        label: 'High-Angle Close-up', 
        metadata: 'Downward perspective, vulnerable framing',
        cameraRotation: 0, 
        cameraTilt: 35,       // Looking DOWN
        cameraDistance: 0.7   // Close-up
      },
      { 
        id: 'S8', 
        label: 'Medium Front', 
        metadata: 'Standard medium shot, neutral',
        cameraRotation: 0, 
        cameraTilt: 0, 
        cameraDistance: 1.0
      },
      { 
        id: 'S9', 
        label: 'Full Body Wide', 
        metadata: 'Complete figure, head to toe',
        cameraRotation: 0, 
        cameraTilt: 0, 
        cameraDistance: 1.8   // Full body
      },
    ],
  },

  // ═══════════════════════════════════════════════════
  // 🎬 STORYBOARD MODE PRESETS
  // ═══════════════════════════════════════════════════

  'cinematic-3': {
    type: 'cinematic-3',
    name: '🎥 Cinematic Shots (3)',
    description: 'Essential shot types: Wide, Medium, Close-up',
    mode: 'storyboard',
    gridLayout: '1x3',
    slots: [
      { id: 'S1', label: 'Wide Shot', metadata: 'Establishing shot, full environment', cameraRotation: 0, cameraTilt: 0, cameraDistance: 2.0 },
      { id: 'S2', label: 'Medium Shot', metadata: 'Waist-up, balanced framing', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.0 },
      { id: 'S3', label: 'Close-up', metadata: 'Face/detail, emotional impact', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.6 },
    ],
  },

  'film-sequence-6': {
    type: 'film-sequence-6',
    name: '🎞️ Film Sequence (6)',
    description: 'Story progression from establishing to action',
    mode: 'storyboard',
    gridLayout: '2x3',
    slots: [
      { id: 'S1', label: 'Establishing', metadata: 'Wide shot, set location', cameraRotation: 0, cameraTilt: 10, cameraDistance: 2.5 },
      { id: 'S2', label: 'Character Enter', metadata: 'Subject enters frame', cameraRotation: 315, cameraTilt: 0, cameraDistance: 1.3 },
      { id: 'S3', label: 'Reaction', metadata: 'Close-up, emotional beat', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.7 },
      { id: 'S4', label: 'Action', metadata: 'Dynamic movement', cameraRotation: 45, cameraTilt: -15, cameraDistance: 1.2 },
      { id: 'S5', label: 'Consequence', metadata: 'Result of action', cameraRotation: 0, cameraTilt: 5, cameraDistance: 1.0 },
      { id: 'S6', label: 'Resolution', metadata: 'Closing shot', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.5 },
    ],
  },

  'shot-variety-9': {
    type: 'shot-variety-9',
    name: '📹 Shot Variety (9)',
    description: 'Comprehensive camera angle coverage',
    mode: 'storyboard',
    gridLayout: '3x3',
    slots: [
      { id: 'S1', label: 'Wide', metadata: 'Establishing wide shot', cameraRotation: 0, cameraTilt: 0, cameraDistance: 2.0 },
      { id: 'S2', label: 'Medium Wide', metadata: 'Full body in context', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.5 },
      { id: 'S3', label: 'Medium', metadata: 'Waist-up shot', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.0 },
      { id: 'S4', label: 'Medium Close-up', metadata: 'Chest-up framing', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.8 },
      { id: 'S5', label: 'Close-up', metadata: 'Face detail', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.6 },
      { id: 'S6', label: 'Extreme Close-up', metadata: 'Eyes/mouth detail', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.4 },
      { id: 'S7', label: 'Over-the-Shoulder', metadata: 'OTS perspective', cameraRotation: 135, cameraTilt: 0, cameraDistance: 1.0 },
      { id: 'S8', label: 'Low Angle', metadata: 'Camera below subject', cameraRotation: 0, cameraTilt: -30, cameraDistance: 1.0 },
      { id: 'S9', label: 'High Angle', metadata: 'Camera above subject', cameraRotation: 0, cameraTilt: 30, cameraDistance: 1.2 },
    ],
  },

  'emotion-journey-4': {
    type: 'emotion-journey-4',
    name: '😊😢 Emotion Journey (4)',
    description: 'Emotional progression through story beats',
    mode: 'storyboard',
    gridLayout: '2x2',
    slots: [
      { id: 'S1', label: 'Calm/Hope', metadata: 'Peaceful beginning, optimistic expression', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.8 },
      { id: 'S2', label: 'Tension/Worry', metadata: 'Rising conflict, concerned expression', cameraRotation: 15, cameraTilt: 5, cameraDistance: 0.7 },
      { id: 'S3', label: 'Crisis/Fear', metadata: 'Peak conflict, intense emotion', cameraRotation: 0, cameraTilt: -15, cameraDistance: 0.6 },
      { id: 'S4', label: 'Relief/Joy', metadata: 'Resolution, satisfied expression', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.8 },
    ],
  },

  'action-sequence-6': {
    type: 'action-sequence-6',
    name: '💥 Action Sequence (6)',
    description: 'Dynamic action scene progression',
    mode: 'storyboard',
    gridLayout: '2x3',
    slots: [
      { id: 'S1', label: 'Anticipation', metadata: 'Character prepares for action, tense stance', cameraRotation: 0, cameraTilt: -10, cameraDistance: 1.2 },
      { id: 'S2', label: 'Launch', metadata: 'Action begins, dynamic movement start', cameraRotation: 315, cameraTilt: -15, cameraDistance: 1.3 },
      { id: 'S3', label: 'Peak Action', metadata: 'Mid-action, highest energy point', cameraRotation: 45, cameraTilt: -20, cameraDistance: 1.4 },
      { id: 'S4', label: 'Impact', metadata: 'Action connects, dramatic moment', cameraRotation: 0, cameraTilt: 15, cameraDistance: 0.7 },
      { id: 'S5', label: 'Aftermath', metadata: 'Immediate consequence, settling dust', cameraRotation: 270, cameraTilt: 0, cameraDistance: 1.1 },
      { id: 'S6', label: 'Result', metadata: 'Final outcome, character reaction', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.0 },
    ],
  },

  'dialogue-scene-4': {
    type: 'dialogue-scene-4',
    name: '💬 Dialogue Scene (4)',
    description: 'Conversation shot/reverse-shot pattern',
    mode: 'storyboard',
    gridLayout: '2x2',
    slots: [
      { id: 'S1', label: 'Speaker A', metadata: 'Character A speaking, medium close-up', cameraRotation: 315, cameraTilt: 0, cameraDistance: 0.8 },
      { id: 'S2', label: 'Listener B', metadata: 'Character B listening, OTS reverse', cameraRotation: 45, cameraTilt: 0, cameraDistance: 0.8 },
      { id: 'S3', label: 'Speaker B Reply', metadata: 'Character B responds, emotional shift', cameraRotation: 45, cameraTilt: 0, cameraDistance: 0.7 },
      { id: 'S4', label: 'Two-Shot', metadata: 'Both in frame, resolution moment', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.3 },
    ],
  },

  'hero-journey-9': {
    type: 'hero-journey-9',
    name: '🦸 Hero Journey (9)',
    description: 'Complete hero\'s journey arc in 9 beats',
    mode: 'storyboard',
    gridLayout: '3x3',
    slots: [
      { id: 'S1', label: 'Ordinary World', metadata: 'Hero in normal life, wide establishing', cameraRotation: 0, cameraTilt: 0, cameraDistance: 2.0 },
      { id: 'S2', label: 'Call to Adventure', metadata: 'Moment of change, discovery', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.0 },
      { id: 'S3', label: 'Refusal', metadata: 'Hesitation, doubt in eyes', cameraRotation: 0, cameraTilt: 5, cameraDistance: 0.7 },
      { id: 'S4', label: 'Mentor', metadata: 'Guidance received, two-shot', cameraRotation: 315, cameraTilt: 0, cameraDistance: 1.2 },
      { id: 'S5', label: 'Crossing Threshold', metadata: 'Hero commits, determined expression', cameraRotation: 0, cameraTilt: -15, cameraDistance: 1.0 },
      { id: 'S6', label: 'Ordeal', metadata: 'Greatest challenge, intense struggle', cameraRotation: 45, cameraTilt: -25, cameraDistance: 1.1 },
      { id: 'S7', label: 'Revelation', metadata: 'Moment of truth, epiphany close-up', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.6 },
      { id: 'S8', label: 'Transformation', metadata: 'Changed hero, new confidence', cameraRotation: 0, cameraTilt: -10, cameraDistance: 1.0 },
      { id: 'S9', label: 'Return', metadata: 'Hero returns victorious, triumphant', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.5 },
    ],
  },

  'satire-slice-of-life-6': {
    type: 'satire-slice-of-life-6',
    name: '🎭 Satire / Slice of Life (6)',
    description: 'Daily life with satirical commentary - modern existential humor',
    mode: 'storyboard',
    gridLayout: '2x3',
    slots: [
      { id: 'S1', label: 'Establishing Reality', metadata: 'Wide shot: mundane environment, absurd detail', cameraRotation: 0, cameraTilt: 0, cameraDistance: 2.0 },
      { id: 'S2', label: 'Overwhelming System', metadata: 'Overhead: character vs bureaucracy/technology', cameraRotation: 0, cameraTilt: 30, cameraDistance: 1.2 },
      { id: 'S3', label: 'Small Disaster', metadata: 'Side profile: everyday failure, physical comedy', cameraRotation: 90, cameraTilt: 0, cameraDistance: 1.0 },
      { id: 'S4', label: 'Ironic Choice', metadata: 'Wide shot: character makes absurd decision', cameraRotation: 315, cameraTilt: 0, cameraDistance: 1.5 },
      { id: 'S5', label: 'Micro-Drama', metadata: 'Extreme close-up: trivial detail becomes existential', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.5 },
      { id: 'S6', label: 'Resigned Comfort', metadata: 'Medium back shot: finding peace in absurdity', cameraRotation: 180, cameraTilt: -10, cameraDistance: 1.0 },
    ],
  },

  'emotional-beat-6': {
    type: 'emotional-beat-6',
    name: '💭 Emotional Beat (6)',
    description: 'Character emotional journey - internal struggle and resolution',
    mode: 'storyboard',
    gridLayout: '2x3',
    slots: [
      { id: 'S1', label: 'Isolation', metadata: 'Wide shot: character alone, contemplative', cameraRotation: 0, cameraTilt: 5, cameraDistance: 1.8 },
      { id: 'S2', label: 'Distraction', metadata: 'Medium close-up: escaping into device/activity', cameraRotation: 45, cameraTilt: 10, cameraDistance: 0.8 },
      { id: 'S3', label: 'Breaking Point', metadata: 'Dynamic shot: moment of crisis or realization', cameraRotation: 90, cameraTilt: 0, cameraDistance: 1.0 },
      { id: 'S4', label: 'Internal Struggle', metadata: 'Static shot: character making difficult choice', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.2 },
      { id: 'S5', label: 'Vulnerability', metadata: 'Extreme close-up: raw emotion revealed', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.6 },
      { id: 'S6', label: 'Acceptance', metadata: 'Medium shot from behind: quiet resolution', cameraRotation: 180, cameraTilt: 0, cameraDistance: 1.0 },
    ],
  },

  'comedy-timing-6': {
    type: 'comedy-timing-6',
    name: '😂 Comedy Timing (6)',
    description: 'Setup → Punchline structure with visual comedy',
    mode: 'storyboard',
    gridLayout: '2x3',
    slots: [
      { id: 'S1', label: 'Normal Setup', metadata: 'Establishing shot: everything seems fine', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.5 },
      { id: 'S2', label: 'Subtle Hint', metadata: 'Medium shot: first sign of comedy', cameraRotation: 315, cameraTilt: 0, cameraDistance: 1.0 },
      { id: 'S3', label: 'Build Tension', metadata: 'Close-up: anticipation, deadpan expression', cameraRotation: 0, cameraTilt: 0, cameraDistance: 0.7 },
      { id: 'S4', label: 'Visual Gag', metadata: 'Wide shot: physical comedy reveal', cameraRotation: 0, cameraTilt: -10, cameraDistance: 1.8 },
      { id: 'S5', label: 'Reaction Shot', metadata: 'Close-up: character\'s comic reaction', cameraRotation: 0, cameraTilt: 5, cameraDistance: 0.6 },
      { id: 'S6', label: 'Punchline', metadata: 'Final beat: ironic resolution or twist', cameraRotation: 0, cameraTilt: 0, cameraDistance: 1.2 },
    ],
  },

  'custom': {
    type: 'custom',
    name: '⚙️ Custom',
    description: 'User-defined grid layout',
    mode: 'character',
    gridLayout: '2x2',
    slots: [],
  },
}

/**
 * Get preset by type
 */
export const getGridPreset = (type: GridPresetType): GridPreset => {
  return GRID_PRESETS[type]
}

/**
 * Get all presets for a specific mode
 */
export const getPresetsForMode = (mode: 'character' | 'storyboard'): GridPreset[] => {
  return Object.values(GRID_PRESETS).filter(preset => preset.mode === mode && preset.type !== 'custom')
}

/**
 * Get character mode presets
 */
export const getCharacterPresets = (): GridPreset[] => {
  return getPresetsForMode('character')
}

/**
 * Get storyboard mode presets
 */
export const getStoryboardPresets = (): GridPreset[] => {
  return getPresetsForMode('storyboard')
}

/**
 * Apply preset to grid node data
 * @param cameraOnly - If true, only apply camera parameters (preserve LLM prompts)
 */
export const applyPreset = (preset: GridPreset, cameraOnly: boolean = false) => {
  const slots = cameraOnly
    ? preset.slots.map(slot => ({
        id: slot.id,
        label: '',  // Clear label to preserve LLM prompts
        metadata: '',  // Clear metadata to preserve LLM prompts
        cameraRotation: slot.cameraRotation,
        cameraTilt: slot.cameraTilt,
        cameraDistance: slot.cameraDistance,
      }))
    : preset.slots
  
  return {
    mode: preset.mode,
    gridLayout: preset.gridLayout,
    slots,
    currentPreset: preset.type,
    generatedPrompts: cameraOnly ? undefined : {},  // Don't reset prompts in camera-only mode
  }
}
