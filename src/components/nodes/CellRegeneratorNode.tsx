import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { NodeProps } from 'reactflow'
import { Sparkles, Grid3x3, CheckCircle2, AlertCircle, Image as ImageIcon } from 'lucide-react'
import type { CellRegeneratorNodeData } from '../../types/nodes'
import { useFlowStore } from '../../stores/flowStore'

const CellRegeneratorNode = ({ data, selected }: NodeProps<CellRegeneratorNodeData>) => {
  const openImageModal = useFlowStore((state) => state.openImageModal)
  const hasGridInfo = !!data.gridLayout && !!data.slots
  const hasInputImage = !!data.inputImageUrl || !!data.inputImageDataUrl
  const hasRegeneratedImages = Object.keys(data.regeneratedImages).length > 0
  const regeneratedCount = Object.keys(data.regeneratedImages).length

  // Parse grid layout
  const [rows, cols] = data.gridLayout
    ? data.gridLayout.split('x').map(Number)
    : [0, 0]

  return (
    <div
      className={`rounded-lg border-2 bg-slate-900 shadow-xl transition-all ${
        selected ? 'border-purple-400 shadow-purple-400/50' : 'border-slate-700'
      }`}
      style={{ width: 280 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-3 py-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <span className="text-sm font-semibold text-purple-400">Cell Regenerator</span>
        </div>
        {hasRegeneratedImages && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            {regeneratedCount}
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

        {/* Input Image Status */}
        {hasInputImage && (
          <div className="space-y-1">
            <div className="text-[9px] text-slate-400">Input Grid Image:</div>
            <div className="relative aspect-video overflow-hidden rounded border border-white/10 bg-slate-800 cursor-pointer hover:border-white/20 transition">
              <img
                src={data.inputImageUrl || data.inputImageDataUrl}
                alt="Grid"
                className="h-full w-full object-contain"
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  openImageModal(data.inputImageUrl || data.inputImageDataUrl || '')
                }}
                title="더블클릭하여 크게 보기"
              />
            </div>
          </div>
        )}

        {/* Regenerated Images Preview */}
        {hasRegeneratedImages && (
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-emerald-400">
              ✨ {regeneratedCount} cells regenerated
            </div>
            <div
              className="grid gap-1 rounded-lg border border-white/10 bg-slate-900/50 p-2"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
              }}
            >
              {data.slots?.map((slot) => {
                const imageUrl = data.regeneratedImages[slot.id]
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
                          className="h-full w-full object-cover cursor-pointer hover:opacity-80 transition"
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            openImageModal(imageUrl)
                          }}
                          title="더블클릭하여 크게 보기"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5 text-[8px] text-white text-center">
                          {slot.label || slot.id}
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
          </div>
        )}

        {/* Status Messages */}
        {!hasGridInfo && (
          <div className="flex items-center gap-1.5 rounded border border-yellow-400/20 bg-yellow-500/5 px-2 py-1.5 text-[10px] text-yellow-400">
            <Grid3x3 className="h-3 w-3" />
            Connect Grid Node
          </div>
        )}

        {!hasInputImage && hasGridInfo && (
          <div className="flex items-center gap-1.5 rounded border border-blue-400/20 bg-blue-500/5 px-2 py-1.5 text-[10px] text-blue-400">
            <ImageIcon className="h-3 w-3" />
            Connect labeled grid image
          </div>
        )}

        {/* Processing Status */}
        {data.status === 'processing' && (
          <div className="flex items-center gap-1.5 rounded border border-purple-400/20 bg-purple-500/5 px-2 py-1.5 text-[10px] text-purple-400">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Regenerating cells...
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
      <Handle
        type="target"
        position={Position.Left}
        id="grid-image"
        style={{ top: '70%', background: '#a855f7' }}
        title="Labeled Grid Image"
      />

      {/* Output Handles (one per slot) */}
      {data.slots?.map((slot, index) => {
        const totalSlots = data.slots?.length || 1
        const handlePosition = (index + 1) / (totalSlots + 1)
        
        return (
          <Handle
            key={slot.id}
            type="source"
            position={Position.Right}
            id={slot.id}
            style={{ 
              top: `${handlePosition * 100}%`,
              background: data.regeneratedImages[slot.id] ? '#10b981' : '#64748b'
            }}
            title={`${slot.id}: ${slot.label}`}
          />
        )
      })}
    </div>
  )
}

export default memo(CellRegeneratorNode)
