import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { Grid3x3, CheckCircle2, AlertCircle, Layers } from 'lucide-react'
import type { GridComposerNodeData } from '../../types/nodes'
import { useFlowStore } from '../../stores/flowStore'

const GridComposerNode = ({ data, selected }: NodeProps<GridComposerNodeData>) => {
  const openImageModal = useFlowStore((state) => state.openImageModal)
  const hasGridInfo = !!data.gridLayout && !!data.slots
  const inputCount = Object.keys(data.inputImages).length
  const isComposed = !!data.composedImageUrl || !!data.composedImageDataUrl

  // Parse grid layout
  const [rows, cols] = data.gridLayout
    ? data.gridLayout.split('x').map(Number)
    : [0, 0]

  return (
    <div
      className={`rounded-lg border-2 bg-slate-900 shadow-xl transition-all ${
        selected ? 'border-emerald-400 shadow-emerald-400/50' : 'border-slate-700'
      }`}
      style={{ width: 280 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold text-emerald-400">Grid Composer</span>
        </div>
        {isComposed && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Composed
          </div>
        )}
      </div>

      {/* Body */}
      <div className="space-y-2 p-3">
        {/* Grid Info */}
        {hasGridInfo && (
          <div className="flex items-center gap-2 rounded border border-blue-400/20 bg-blue-500/5 px-2 py-1.5 text-[10px]">
            <Grid3x3 className="h-3 w-3 text-blue-400" />
            <span className="text-blue-400 font-semibold">{data.gridLayout}</span>
            <span className="text-slate-400">({data.slots?.length} slots)</span>
          </div>
        )}

        {/* Input Progress */}
        <div className="space-y-1">
          <div className="text-[10px] text-slate-400">
            Input Images: {inputCount} / {data.slots?.length || 0}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
              style={{
                width: `${data.slots?.length ? (inputCount / data.slots.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Input Images Preview */}
        {inputCount > 0 && (
          <div
            className="grid gap-1 rounded-lg border border-white/10 bg-slate-900/50 p-2"
            style={{
              gridTemplateColumns: `repeat(${cols || 3}, 1fr)`,
            }}
          >
            {data.slots?.map((slot) => {
              const imageUrl = data.inputImages[slot.id]
              return (
                <div
                  key={slot.id}
                  className="relative aspect-square overflow-hidden rounded border border-white/10 bg-slate-800"
                >
                  {imageUrl ? (
                    <>
                      <img
                        src={imageUrl}
                        alt={slot.label}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[8px] text-white text-center">
                        {slot.id}
                      </div>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-600">
                      {slot.id}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Composed Image Preview */}
        {isComposed && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-emerald-400">
              ✨ Composed Grid
            </div>
            <div className="relative aspect-video overflow-hidden rounded border border-emerald-400/30 bg-slate-800 cursor-pointer hover:border-emerald-400/60 transition">
              <img
                src={data.composedImageUrl || data.composedImageDataUrl}
                alt="Composed Grid"
                className="h-full w-full object-contain"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  openImageModal(data.composedImageUrl || data.composedImageDataUrl || '')
                }}
                title="더블클릭하여 크게 보기"
              />
            </div>
          </div>
        )}

        {/* Status Messages */}
        {!hasGridInfo && (
          <div className="flex items-center gap-1.5 rounded border border-yellow-400/20 bg-yellow-500/5 px-2 py-1.5 text-[10px] text-yellow-400">
            <Grid3x3 className="h-3 w-3" />
            Connect Grid Node
          </div>
        )}

        {hasGridInfo && inputCount === 0 && (
          <div className="flex items-center gap-1.5 rounded border border-blue-400/20 bg-blue-500/5 px-2 py-1.5 text-[10px] text-blue-400">
            <Layers className="h-3 w-3" />
            Connect {data.slots?.length} images
          </div>
        )}

        {/* Processing Status */}
        {data.status === 'processing' && (
          <div className="flex items-center gap-1.5 rounded border border-emerald-400/20 bg-emerald-500/5 px-2 py-1.5 text-[10px] text-emerald-400">
            <Layers className="h-3 w-3 animate-pulse" />
            Composing grid...
          </div>
        )}

        {/* Error Display */}
        {data.error && (
          <div className="flex items-start gap-2 rounded border border-red-400/20 bg-red-500/5 px-2 py-1.5">
            <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-red-400" />
            <p className="text-[10px] text-red-400">{data.error}</p>
          </div>
        )}
      </div>

      {/* Input Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="grid-layout"
        style={{ top: '30%', background: '#3b82f6' }}
        title="Grid Layout (from Grid Node)"
      />

      {/* Dynamic Input Handles for each slot */}
      {data.slots?.map((slot, index) => {
        const totalSlots = data.slots?.length || 1
        const handlePosition = 40 + (index * 60) / totalSlots
        
        return (
          <Handle
            key={slot.id}
            type="target"
            position={Position.Left}
            id={`input-${slot.id}`}
            style={{ 
              top: `${handlePosition}%`,
              background: data.inputImages[slot.id] ? '#10b981' : '#64748b'
            }}
            title={`${slot.id}: ${slot.label}`}
          />
        )
      })}

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="composed-grid"
        style={{ 
          top: '50%',
          background: isComposed ? '#10b981' : '#64748b'
        }}
        title="Composed Grid Image"
      />
    </div>
  )
}

export default memo(GridComposerNode)
