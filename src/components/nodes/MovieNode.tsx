import { Handle, Position, type NodeProps } from 'reactflow'
import { Film, Loader2 } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import type { MovieNodeData } from '../../types/nodes'

const PROVIDER_LABELS: Record<string, string> = {
  veo: 'Veo',
  kling: 'Kling',
  sora: 'Sora',
}

const PROVIDER_COLORS: Record<string, { border: string; ring: string; accent: string }> = {
  veo: { border: 'border-blue-400', ring: 'ring-blue-400/30 shadow-blue-400/20', accent: 'text-blue-400' },
  kling: { border: 'border-blue-400', ring: 'ring-blue-400/30 shadow-blue-400/20', accent: 'text-blue-400' },
  sora: { border: 'border-blue-400', ring: 'ring-blue-400/30 shadow-blue-400/20', accent: 'text-blue-400' },
}

export default function MovieNode({
  id,
  data,
  selected,
}: NodeProps<MovieNodeData>) {
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)

  const provider = data.provider || 'veo'
  const colors = PROVIDER_COLORS[provider] || PROVIDER_COLORS.veo
  const label = PROVIDER_LABELS[provider] || 'Veo'

  return (
    <div 
      className={`node-card w-56 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected ? `${colors.border} border-2 ring-4 ${colors.ring} shadow-lg` : `${colors.border}/40`
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className={`rounded-t-xl border-b ${colors.border}/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className={`h-4 w-4 ${colors.accent}`} />
            Movie
          </div>
          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${colors.accent} bg-white/5`}>
            {label}
          </span>
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
              <span className="text-[10px] text-slate-500">No output yet</span>
            )}
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="image"
        className="!h-[7px] !w-[7px] !bg-yellow-500"
        style={{ top: '40%' }}
        title="Image Input"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        className="!h-[7px] !w-[7px] !bg-violet-400"
        style={{ top: '60%' }}
        title="Prompt Input"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-[7px] !w-[7px] !bg-blue-400"
        title="Video Output"
      />
    </div>
  )
}
