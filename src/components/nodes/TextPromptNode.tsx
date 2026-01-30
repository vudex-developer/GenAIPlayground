import { Handle, Position, type NodeProps } from 'reactflow'
import { MessageSquare } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import { useIMEInput } from '../../hooks/useIMEInput'
import type { TextPromptNodeData } from '../../types/nodes'

export default function TextPromptNode({
  id,
  data,
  selected,
}: NodeProps<TextPromptNodeData>) {
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)
  const updateNodeData = useFlowStore((state) => state.updateNodeData)

  const imeProps = useIMEInput(data.prompt, (value) => {
    updateNodeData(id, { prompt: value })
  })

  return (
    <div 
      className={`node-card w-64 rounded-xl border bg-[#1c2431] shadow-sm transition-all ${
        selected ? 'border-violet-400 border-2 ring-4 ring-violet-400/30 shadow-lg shadow-violet-400/20' : 'border-violet-400/40'
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="rounded-t-xl border-b border-violet-400/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-violet-400" />
          Prompt
        </div>
      </div>

      <div className="p-3">
        <textarea
          {...imeProps}
          onClick={(e) => e.stopPropagation()}
          placeholder="Type your prompt here..."
          className="w-full h-24 rounded-md border border-violet-400/20 bg-[#222d3d] px-2 py-2 text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-violet-400/50 focus:outline-none focus:ring-1 focus:ring-violet-400/50 resize-none"
        />
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!h-4 !w-4 !bg-violet-500"
        title="Prompt Output"
      />
    </div>
  )
}
