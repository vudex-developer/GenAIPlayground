import { Handle, Position, type NodeProps } from 'reactflow'
import { Grid3x3, Film, Users, Zap } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import type { GridNodeData } from '../../types/nodes'

export default function GridNode({
  id,
  data,
  selected,
}: NodeProps<GridNodeData>) {
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)
  const updateNodeData = useFlowStore((state) => state.updateNodeData)

  const totalSlots = data.slots.length
  const generatedPromptsCount = Object.keys(data.generatedPrompts).length
  const hasPrompts = generatedPromptsCount > 0

  const isCharacterMode = data.mode === 'character'
  const borderColor = isCharacterMode ? 'border-violet-400' : 'border-cyan-400'
  const bgColor = isCharacterMode ? 'bg-violet-500' : 'bg-cyan-500'
  const textColor = isCharacterMode ? 'text-violet-400' : 'text-cyan-400'
  const ringColor = isCharacterMode ? 'ring-violet-400/30' : 'ring-cyan-400/30'
  const shadowColor = isCharacterMode ? 'shadow-violet-400/20' : 'shadow-cyan-400/20'
  
  // Parse grid dimensions
  const [rows, cols] = data.gridLayout.split('x').map(Number)

  return (
    <div 
      className={`node-card w-80 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected 
          ? `${borderColor} border-2 ring-4 ${ringColor} shadow-lg ${shadowColor}` 
          : `${borderColor}/40`
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      {/* Header */}
      <div className={`rounded-t-xl border-b ${borderColor}/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Grid3x3 className={`h-4 w-4 ${textColor}`} />
            Grid Node
          </div>
          {hasPrompts && (
            <div className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Zap className="h-3 w-3" />
              {generatedPromptsCount}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-3">
        {/* Mode Toggle */}
        <div className="flex gap-1 p-1 bg-slate-900/50 rounded-lg border border-white/10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateNodeData(id, { ...data, mode: 'character' })
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-semibold transition ${
              isCharacterMode
                ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <Users className="h-3 w-3" />
            Character
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              updateNodeData(id, { ...data, mode: 'storyboard' })
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-semibold transition ${
              !isCharacterMode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30'
                : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <Film className="h-3 w-3" />
            Storyboard
          </button>
        </div>

        {/* Grid Info */}
        <div className="flex items-center gap-2 text-[10px]">
          <div className={`px-2 py-1 rounded ${isCharacterMode ? 'bg-violet-500/10 border-violet-400/20 text-violet-300' : 'bg-cyan-500/10 border-cyan-400/20 text-cyan-300'} border`}>
            Grid: {data.gridLayout}
          </div>
          <div className={`px-2 py-1 rounded ${isCharacterMode ? 'bg-violet-500/10 border-violet-400/20 text-violet-300' : 'bg-cyan-500/10 border-cyan-400/20 text-cyan-300'} border`}>
            Slots: {totalSlots}
          </div>
        </div>

        {/* Slots Preview */}
        <div className="text-[10px] text-slate-400">
          <div className="mb-1 font-semibold">
            {isCharacterMode ? 'View Angles:' : 'Shot Sequence:'}
          </div>
          <div className="flex flex-wrap gap-1">
            {data.slots.slice(0, 4).map((slot) => (
              <span 
                key={slot.id}
                className={`px-1.5 py-0.5 rounded border ${
                  data.generatedPrompts[slot.id]
                    ? 'bg-emerald-500/10 border-emerald-400/30 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {slot.label || slot.id}
              </span>
            ))}
            {data.slots.length > 4 && (
              <span className="px-1.5 py-0.5 text-slate-500">
                +{data.slots.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* Generated Prompts Preview */}
        {hasPrompts && (
          <div className={`text-[10px] rounded p-2 border ${isCharacterMode ? 'bg-violet-500/5 border-violet-400/20' : 'bg-cyan-500/5 border-cyan-400/20'}`}>
            <div className={`font-semibold mb-1 ${isCharacterMode ? 'text-violet-400' : 'text-cyan-400'}`}>✓ Prompts Ready</div>
            <div className="text-slate-400 line-clamp-2">
              {data.generatedPrompts[data.slots[0]?.id] || 'Connect to prompt nodes & generate'}
            </div>
          </div>
        )}

        {/* Error Display */}
        {data.error && (
          <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-400/20 rounded px-2 py-1">
            {data.error}
          </div>
        )}
      </div>

      {/* Input Handle - Left (for Prompt nodes) */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{ background: isCharacterMode ? '#a78bfa' : '#22d3ee' }}
        className="!h-4 !w-4"
        title="Connect Prompt nodes here"
      />

      {/* Output Handles - Right (one for each slot) */}
      <div className="relative">
        {data.slots.map((slot, index) => {
          const hasPrompt = !!data.generatedPrompts[slot.id]
          const yPosition = 20 + (index * 60 / data.slots.length)
          
          return (
            <Handle
              key={slot.id}
              type="source"
              position={Position.Right}
              id={slot.id}
              style={{ 
                top: `${yPosition}%`,
                background: hasPrompt ? (isCharacterMode ? '#a78bfa' : '#22d3ee') : '#64748b',
              }}
              className="!h-3 !w-3 !border-2 !border-[#1c2431]"
              title={`${slot.id}: ${slot.label}`}
            />
          )
        })}
      </div>
    </div>
  )
}
