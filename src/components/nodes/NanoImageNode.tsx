import { Handle, Position, type NodeProps } from 'reactflow'
import { Banana, Loader2 } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import type { NanoImageNodeData } from '../../types/nodes'

export default function NanoImageNode({
  id,
  data,
  selected,
}: NodeProps<NanoImageNodeData>) {
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)
  const openImageModal = useFlowStore((state) => state.openImageModal)

  return (
    <div 
      className={`node-card w-48 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected ? 'border-yellow-400 border-2 ring-4 ring-yellow-400/30 shadow-lg shadow-yellow-400/20' : 'border-yellow-400/40'
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="rounded-t-xl border-b border-yellow-400/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100">
        <div className="flex items-center gap-2">
          <Banana className="h-4 w-4 text-yellow-400" />
          Nano Banana
        </div>
      </div>

      <div className="p-3">
        {data.outputImageUrl ? (
          <div className="relative">
            <img
              src={data.outputImageUrl}
              alt="Generated"
              className="w-full rounded-md cursor-pointer hover:opacity-80 transition"
              onDoubleClick={(e) => {
                e.stopPropagation()
                openImageModal(data.outputImageUrl || '')
              }}
              title="더블클릭하여 크게 보기"
            />
            {data.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-[#2f3a4a] bg-[#222d3d]">
            {data.status === 'processing' ? (
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            ) : (
              <span className="text-[10px] text-slate-500">No output yet</span>
            )}
          </div>
        )}
      </div>

      {/* Prompt input handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        style={{ top: '20%' }}
        className="!h-3 !w-3 !bg-violet-400"
        title="Prompt"
      />
      
      {/* Reference image input handles */}
      {Array.from({ length: data.maxReferences || 3 }).map((_, index) => {
        const refNum = index + 1
        const handlePosition = 35 + (index * 25)  // Distribute evenly
        
        return (
          <Handle
            key={`ref-${refNum}`}
            type="target"
            position={Position.Left}
            id={`ref-${refNum}`}
            style={{ top: `${handlePosition}%` }}
            className="!h-3 !w-3 !bg-cyan-400"
            title={`Reference ${refNum}`}
          />
        )
      })}
      
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-yellow-500"
      />
    </div>
  )
}
