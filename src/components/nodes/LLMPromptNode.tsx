import { Handle, Position, type NodeProps } from 'reactflow'
import { Sparkles, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFlowStore } from '../../stores/flowStore'
import type { LLMPromptNodeData } from '../../types/nodes'
import { getImage } from '../../utils/indexedDB'

export default function LLMPromptNode({
  id,
  data,
  selected,
}: NodeProps<LLMPromptNodeData>) {
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)
  const [displayImageUrl, setDisplayImageUrl] = useState<string | undefined>(undefined)

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

  // Load reference image from IndexedDB/S3 if needed
  useEffect(() => {
    const loadReferenceImage = async () => {
      const imageRef = (data as any).referenceImageDataUrl || data.referenceImageUrl
      
      if (!imageRef) {
        setDisplayImageUrl(undefined)
        return
      }

      // If it's an idb: or s3: reference, fetch the actual image
      if (typeof imageRef === 'string' && (imageRef.startsWith('idb:') || imageRef.startsWith('s3:'))) {
        try {
          const dataURL = await getImage(imageRef)
          if (dataURL) {
            setDisplayImageUrl(dataURL)
          } else {
            console.warn('⚠️ LLM: Failed to load reference image:', imageRef)
            setDisplayImageUrl(undefined)
          }
        } catch (error) {
          console.error('❌ LLM: Error loading reference image:', error)
          setDisplayImageUrl(undefined)
        }
      } else {
        // Direct data URL or regular URL
        setDisplayImageUrl(imageRef)
      }
    }

    loadReferenceImage()
  }, [data.referenceImageUrl, (data as any).referenceImageDataUrl])

  return (
    <div 
      className={`node-card w-56 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected ? 'border-pink-400 border-2 ring-4 ring-pink-400/30 shadow-lg shadow-pink-400/20' : 'border-pink-400/40'
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="rounded-t-xl border-b border-pink-400/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-4 h-4 text-[9px] font-bold text-pink-400 tracking-tight">
            LLM
          </div>
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
        {displayImageUrl ? (
          <div className="rounded-md border border-pink-400/30 bg-pink-500/5 p-1">
            <img
              src={displayImageUrl}
              alt="Reference"
              className="w-full rounded"
              onError={(e) => {
                console.error('❌ LLM: Image load error')
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="text-[9px] text-pink-400 text-center mt-1">참고 이미지</div>
          </div>
        ) : (data.referenceImageUrl || (data as any).referenceImageDataUrl) ? (
          <div className="rounded-md border border-pink-400/30 bg-pink-500/5 p-2">
            <div className="text-[9px] text-pink-400 text-center">이미지 로딩 중...</div>
          </div>
        ) : null}

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
        id="basePrompt"
        style={{ top: '20%' }}
        className="!h-[7px] !w-[7px] !bg-violet-400"
        title="기본 프롬프트"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="motionPrompt"
        style={{ top: '40%' }}
        className="!h-[7px] !w-[7px] !bg-fuchsia-400"
        title="모션 프롬프트"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="image"
        style={{ top: '70%' }}
        className="!h-[7px] !w-[7px] !bg-yellow-500"
        title="참고 이미지"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-[7px] !w-[7px] !bg-violet-400"
        title="정제된 프롬프트"
      />
    </div>
  )
}
