import { Handle, Position, type NodeProps } from 'reactflow'
import { Wand2 } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import type { MotionPromptNodeData } from '../../types/nodes'

export default function MotionPromptNode({
  id,
  data,
  selected,
}: NodeProps<MotionPromptNodeData>) {
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)

  return (
    <div 
      className={`node-card w-64 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected ? 'border-fuchsia-400 border-2 ring-4 ring-fuchsia-400/30 shadow-lg shadow-fuchsia-400/20' : 'border-fuchsia-400/40'
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="rounded-t-xl border-b border-fuchsia-400/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-fuchsia-400" />
          Motion Prompt
        </div>
      </div>

      <div className="p-3 text-[11px] text-slate-300">
        {data.combinedPrompt ? (
          <div className="max-h-24 overflow-hidden text-ellipsis">
            <div className="text-[10px] text-slate-500 mb-1">Combined:</div>
            {data.combinedPrompt}
          </div>
        ) : (
          <span className="text-slate-500 italic">Empty motion prompt...</span>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-fuchsia-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-fuchsia-500"
      />
    </div>
  )
}
