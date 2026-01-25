import { Handle, Position, type NodeProps } from 'reactflow'
import { Loader2 } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import type { KlingVideoNodeData } from '../../types/nodes'
import KlingIcon from '../icons/KlingIcon'

export default function KlingVideoNode({
  id,
  data,
  selected,
}: NodeProps<KlingVideoNodeData>) {
  const { setSelectedNodeId, edges } = useFlowStore()
  
  const hasStartImage = edges.some(
    (e) => e.target === id && e.targetHandle === 'start'
  )
  const hasEndImage = edges.some(
    (e) => e.target === id && e.targetHandle === 'end'
  )

  return (
    <div 
      className={`node-card w-56 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected ? 'border-green-400 border-2 ring-4 ring-green-400/30 shadow-lg shadow-green-400/20' : 'border-green-400/40'
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="rounded-t-xl border-b border-green-400/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100">
        <div className="flex items-center gap-2">
          <KlingIcon className="h-4 w-4" />
          Kling Video
        </div>
      </div>

      <div className="p-3">
        {data.outputVideoUrl ? (
          <div className="relative">
            <video
              src={data.outputVideoUrl}
              controls
              className="w-full rounded-md"
              style={{ maxHeight: '200px' }}
            />
            {data.status === 'processing' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-[#2f3a4a] bg-[#222d3d]">
            {data.status === 'processing' ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                {data.progress > 0 && (
                  <span className="text-[10px] text-slate-400">{data.progress}%</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-slate-500">No output yet</span>
                {(hasStartImage || hasEndImage) && (
                  <div className="flex gap-2 text-[8px]">
                    {hasStartImage && <span className="text-blue-400">● Start</span>}
                    {hasEndImage && <span className="text-purple-400">● End</span>}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="start"
        className="!h-3 !w-3 !bg-blue-500"
        style={{ top: '30%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="end"
        className="!h-3 !w-3 !bg-purple-500"
        style={{ top: '50%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        className="!h-3 !w-3 !bg-green-500"
        style={{ top: '70%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-green-500"
      />
    </div>
  )
}
