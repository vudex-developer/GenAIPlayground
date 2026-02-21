import { useState, type DragEvent } from 'react'
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
  borderColor: string
  hoverBorderColor: string
  iconColor: string
}> = [
  {
    type: 'imageImport',
    label: 'Image Import',
    icon: ImageIcon,
    borderColor: 'border-cyan-400/30',
    hoverBorderColor: 'hover:border-cyan-400',
    iconColor: 'text-cyan-400',
  },
  {
    type: 'genImage',
    label: 'Gen Image',
    icon: Sparkles,
    borderColor: 'border-yellow-400/30',
    hoverBorderColor: 'hover:border-yellow-400',
    iconColor: 'text-yellow-400',
  },
  {
    type: 'textPrompt',
    label: 'Text Prompt',
    icon: TextCursorInput,
    borderColor: 'border-slate-400/30',
    hoverBorderColor: 'hover:border-slate-400',
    iconColor: 'text-slate-400',
  },
  {
    type: 'motionPrompt',
    label: 'Motion Prompt',
    icon: Camera,
    borderColor: 'border-fuchsia-400/30',
    hoverBorderColor: 'hover:border-fuchsia-400',
    iconColor: 'text-fuchsia-400',
  },
  {
    type: 'movie',
    label: 'Movie',
    icon: Film,
    borderColor: 'border-blue-400/30',
    hoverBorderColor: 'hover:border-blue-400',
    iconColor: 'text-blue-400',
  },
  {
    type: 'gridNode',
    label: 'Grid Node',
    icon: ImageIcon,
    borderColor: 'border-violet-400/30',
    hoverBorderColor: 'hover:border-violet-400',
    iconColor: 'text-violet-400',
  },
  {
    type: 'llmPrompt',
    label: 'LLM Prompt',
    icon: LLMIcon,
    borderColor: 'border-pink-400/30',
    hoverBorderColor: 'hover:border-pink-400',
    iconColor: 'text-pink-400',
  },
]

export default function NodePalette() {
  const [hoveredType, setHoveredType] = useState<NodeType | null>(null)

  const handleDragStart = (event: DragEvent, type: NodeType) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="flex h-full flex-col items-center gap-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
        Nodes
      </div>
      <div className="flex flex-col items-center gap-2">
        {paletteItems.map((item) => {
          const Icon = item.icon
          const isLLMIcon = item.type === 'llmPrompt'
          const isHovered = hoveredType === item.type
          return (
            <div
              key={item.type}
              className="relative"
              onMouseEnter={() => setHoveredType(item.type)}
              onMouseLeave={() => setHoveredType(null)}
            >
              <div
                className={`group flex h-10 w-10 cursor-grab items-center justify-center rounded-lg border bg-white/5 shadow-sm transition ${item.borderColor} ${item.hoverBorderColor}`}
                draggable
                onDragStart={(event) => handleDragStart(event, item.type)}
              >
                {isLLMIcon ? (
                  <Icon className={item.iconColor} />
                ) : (
                  <Icon className={`h-4 w-4 ${item.iconColor}`} />
                )}
              </div>

              {isHovered && (
                <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-800 px-2.5 py-1.5 text-[11px] font-medium text-slate-100 shadow-lg ring-1 ring-white/10">
                  {item.label}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
