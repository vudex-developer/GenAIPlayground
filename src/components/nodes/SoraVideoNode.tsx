import { Handle, Position, type NodeProps } from 'reactflow'
import { Loader2 } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import type { SoraVideoNodeData } from '../../types/nodes'
import SoraIcon from '../icons/SoraIcon'

export default function SoraVideoNode({
  id,
  data,
  selected,
}: NodeProps<SoraVideoNodeData>) {
  const { setSelectedNodeId } = useFlowStore()

  return (
    <div
      className={`node-card w-56 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected ? 'border-orange-400 border-2 ring-4 ring-orange-400/30 shadow-lg shadow-orange-400/20' : 'border-orange-400/40'
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="rounded-t-xl border-b border-orange-400/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100">
        <div className="flex items-center gap-2">
          <SoraIcon className="h-4 w-4" />
          Sora Video
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
                <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-[#2f3a4a] bg-[#222d3d]">
            {data.status === 'processing' ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-orange-400" />
                {data.progress > 0 && (
                  <span className="text-[10px] text-slate-400">{data.progress}%</span>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-[10px] text-slate-500">No output yet</span>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="!h-3 !w-3 !bg-orange-500"
        style={{ top: '40%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        className="!h-3 !w-3 !bg-amber-500"
        style={{ top: '60%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-orange-500"
      />
    </div>
  )
}
