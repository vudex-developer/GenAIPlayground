import type { DragEvent } from 'react'
import {
  Film,
  Image as ImageIcon,
  TextCursorInput,
  Camera,
  Sparkles,
} from 'lucide-react'
import type { NodeType } from '../types/nodes'

// Custom LLM text icon component
const LLMIcon = ({ className }: { className?: string }) => (
  <div className={`font-bold text-[10px] tracking-tight ${className}`}>
    LLM
  </div>
)

const paletteItems: Array<{
  type: NodeType
  label: string
  icon: typeof ImageIcon | typeof LLMIcon
  borderClass: string
  hoverBorderClass: string
  iconClass: string
}> = [
  {
    type: 'imageImport',
    label: 'Image Import',
    icon: ImageIcon,
    borderClass: 'border-blue-200',
    hoverBorderClass: 'hover:border-blue-400',
    iconClass: 'text-blue-500',
  },
  {
    type: 'nanoImage',
    label: 'Nano Image',
    icon: ImageIcon,
    borderClass: 'border-emerald-200',
    hoverBorderClass: 'hover:border-emerald-400',
    iconClass: 'text-emerald-500',
  },
  {
    type: 'textPrompt',
    label: 'Text Prompt',
    icon: TextCursorInput,
    borderClass: 'border-slate-200',
    hoverBorderClass: 'hover:border-slate-400',
    iconClass: 'text-slate-500',
  },
  {
    type: 'motionPrompt',
    label: 'Motion Prompt',
    icon: Camera,
    borderClass: 'border-purple-200',
    hoverBorderClass: 'hover:border-purple-400',
    iconClass: 'text-purple-500',
  },
  {
    type: 'llmPrompt',
    label: 'LLM Prompt',
    icon: LLMIcon,
    borderClass: 'border-pink-200',
    hoverBorderClass: 'hover:border-pink-400',
    iconClass: 'text-pink-500',
  },
  {
    type: 'geminiVideo',
    label: 'Gemini Video',
    icon: Film,
    borderClass: 'border-orange-200',
    hoverBorderClass: 'hover:border-orange-400',
    iconClass: 'text-orange-500',
  },
]

export default function NodePalette() {
  const handleDragStart = (event: DragEvent, type: NodeType) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
        Nodes
      </div>
      <div className="flex flex-col items-center gap-2">
        {paletteItems.map((item) => {
          const Icon = item.icon
          const isLLMIcon = item.type === 'llmPrompt'
          return (
            <div
              key={item.type}
              title={item.label}
              className={`group flex h-10 w-10 cursor-grab items-center justify-center rounded-lg border bg-white/80 text-slate-700 shadow-sm transition ${item.borderClass} ${item.hoverBorderClass} dark:border-white/10 dark:bg-white/5 dark:text-slate-200`}
              draggable
              onDragStart={(event) => handleDragStart(event, item.type)}
            >
              {isLLMIcon ? (
                <Icon className={`${item.iconClass} dark:text-slate-200`} />
              ) : (
                <Icon className={`h-4 w-4 ${item.iconClass} dark:text-slate-200`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
