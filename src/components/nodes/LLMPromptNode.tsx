import { Handle, Position, type NodeProps } from 'reactflow'
import { Sparkles, Loader2 } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import type { LLMPromptNodeData } from '../../types/nodes'

export default function LLMPromptNode({
  id,
  data,
  selected,
}: NodeProps<LLMPromptNodeData>) {
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)

  const getModeLabel = (mode: string) => {
    switch (mode) {
      case 'expand': return '📝 확장'
      case 'improve': return '✨ 개선'
      case 'translate': return '🌐 번역'
      case 'simplify': return '🎯 간결화'
      case 'describe': return '🖼️ 이미지 설명'
      case 'analyze': return '🔍 이미지 분석'
      default: return mode
    }
  }

  return (
    <div 
      className={`node-card w-56 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected ? 'border-pink-400 border-2 ring-4 ring-pink-400/30 shadow-lg shadow-pink-400/20' : 'border-pink-400/40'
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="rounded-t-xl border-b border-pink-400/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-pink-400" />
          LLM Prompt Helper
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Mode Badge */}
        <div className="flex items-center justify-center">
          <span className="rounded-full bg-pink-500/10 px-3 py-1 text-[10px] font-semibold text-pink-400 border border-pink-400/20">
            {getModeLabel(data.mode)}
          </span>
        </div>

        {/* Reference Image Preview */}
        {data.referenceImageUrl && (
          <div className="rounded-md border border-pink-400/30 bg-pink-500/5 p-1">
            <img
              src={data.referenceImageUrl}
              alt="Reference"
              className="w-full rounded"
            />
            <div className="text-[9px] text-pink-400 text-center mt-1">참고 이미지</div>
          </div>
        )}

        {/* Input Preview */}
        {data.inputPrompt ? (
          <div className="rounded-md border border-white/10 bg-white/5 p-2">
            <div className="text-[9px] text-slate-400 mb-1">✓ 입력 프롬프트:</div>
            <div className="text-[10px] text-slate-300 line-clamp-2">
              {data.inputPrompt}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-pink-400/20 bg-pink-500/5 p-2">
            <div className="text-[9px] text-pink-400 text-center">
              Text Prompt 연결 필요
            </div>
          </div>
        )}

        {/* Output Preview */}
        {data.outputPrompt ? (
          <div className="rounded-md border border-pink-400/30 bg-pink-500/5 p-2">
            <div className="text-[9px] text-pink-400 mb-1">출력:</div>
            <div className="text-[10px] text-slate-200 line-clamp-3">
              {data.outputPrompt}
            </div>
          </div>
        ) : data.status === 'processing' ? (
          <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-pink-400/30 bg-pink-500/5">
            <Loader2 className="h-5 w-5 animate-spin text-pink-400" />
          </div>
        ) : (
          <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-[#2f3a4a] bg-[#222d3d]">
            <span className="text-[10px] text-slate-500">Ready to generate</span>
          </div>
        )}

        {/* Status */}
        {data.error && (
          <div className="rounded-md border border-red-400/30 bg-red-500/5 px-2 py-1">
            <p className="text-[9px] text-red-400">{data.error}</p>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        style={{ top: '30%' }}
        className="!h-3 !w-3 !bg-pink-500"
        title="입력 프롬프트"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        style={{ top: '70%' }}
        className="!h-3 !w-3 !bg-cyan-400"
        title="참고 이미지"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-pink-500"
        title="정제된 프롬프트"
      />
    </div>
  )
}
