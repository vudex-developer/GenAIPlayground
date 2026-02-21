import { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { ImageIcon, Loader2 } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import { getImage } from '../../utils/indexedDB'
import type { GenImageNodeData } from '../../types/nodes'

const PROVIDER_COLORS: Record<string, { border: string; ring: string; accent: string }> = {
  nanoBanana: { border: 'border-yellow-400', ring: 'ring-yellow-400/30 shadow-yellow-400/20', accent: 'text-yellow-400' },
}

export default function GenImageNode({
  id,
  data,
  selected,
}: NodeProps<GenImageNodeData>) {
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)
  const updateNodeData = useFlowStore((state) => state.updateNodeData)
  const openImageModal = useFlowStore((state) => state.openImageModal)
  const [displayImageUrl, setDisplayImageUrl] = useState<string | undefined>(
    data.outputImageUrl
  )

  const colors = PROVIDER_COLORS[data.provider || 'nanoBanana'] || PROVIDER_COLORS.nanoBanana

  useEffect(() => {
    const loadImage = async () => {
      if (!data.outputImageUrl) {
        setDisplayImageUrl(undefined)
        return
      }

      if (
        typeof data.outputImageUrl === 'string' &&
        (data.outputImageUrl.startsWith('idb:') || data.outputImageUrl.startsWith('s3:'))
      ) {
        try {
          const dataURL = await getImage(data.outputImageUrl)
          if (dataURL) {
            setDisplayImageUrl(dataURL)
          } else {
            setDisplayImageUrl(undefined)
          }
        } catch (error) {
          console.error('❌ 이미지 복원 실패:', error)
          setDisplayImageUrl(undefined)
        }
      } else {
        setDisplayImageUrl(data.outputImageUrl)
      }
    }

    loadImage()
  }, [data.outputImageUrl, id, updateNodeData])

  return (
    <div 
      className={`node-card w-48 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected ? `${colors.border} border-2 ring-4 ${colors.ring} shadow-lg` : `${colors.border}/40`
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className={`rounded-t-xl border-b ${colors.border}/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100`}>
        <div className="flex items-center gap-2">
          <ImageIcon className={`h-4 w-4 ${colors.accent}`} />
          Gen Image
        </div>
      </div>

      <div className="p-3">
        {displayImageUrl ? (
          <div className="relative">
            <img
              src={displayImageUrl}
              alt="Generated"
              className="w-full rounded-md cursor-pointer hover:opacity-80 transition"
              onDoubleClick={(e) => {
                e.stopPropagation()
                openImageModal(displayImageUrl || '')
              }}
              onError={() => {
                setDisplayImageUrl(undefined)
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

      <Handle
        type="target"
        position={Position.Left}
        id="prompt"
        style={{ top: '20%' }}
        className="!h-[7px] !w-[7px] !bg-violet-400"
        title="Prompt"
      />
      
      {Array.from({ length: data.maxReferences || 3 }).map((_, index) => {
        const refNum = index + 1
        const handlePosition = 30 + (index * 20)
        
        return (
          <Handle
            key={`ref-${refNum}`}
            type="target"
            position={Position.Left}
            id={`ref-${refNum}`}
            style={{ top: `${handlePosition}%` }}
            className="!h-[7px] !w-[7px] !bg-yellow-500"
            title={`Reference Image ${refNum}`}
          />
        )
      })}

      <Handle
        type="target"
        position={Position.Left}
        id="character"
        style={{ top: '90%' }}
        className="!h-[7px] !w-[7px] !bg-yellow-500 !border-0"
        title="Character Reference Image"
      />
      
      <Handle
        type="source"
        position={Position.Right}
        className="!h-[7px] !w-[7px] !bg-yellow-500"
      />
    </div>
  )
}
