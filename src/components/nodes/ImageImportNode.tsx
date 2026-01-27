import React, { useEffect, useState } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Image as ImageIcon, Upload } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import { getImage } from '../../utils/indexedDB'
import type { ImageImportNodeData } from '../../types/nodes'

export default function ImageImportNode({
  id,
  data,
  selected,
}: NodeProps<ImageImportNodeData>) {
  const setSelectedNodeId = useFlowStore((state) => state.setSelectedNodeId)
  const updateNodeData = useFlowStore((state) => state.updateNodeData)
  const openImageModal = useFlowStore((state) => state.openImageModal)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [displayImageUrl, setDisplayImageUrl] = useState<string | undefined>(
    data.imageDataUrl || data.imageUrl
  )

  // 🔄 IndexedDB에서 이미지 복원
  useEffect(() => {
    const loadImage = async () => {
      // imageDataUrl이 idb: 참조인 경우
      if (data.imageDataUrl && typeof data.imageDataUrl === 'string' && data.imageDataUrl.startsWith('idb:')) {
        try {
          const dataURL = await getImage(data.imageDataUrl)
          if (dataURL) {
            setDisplayImageUrl(dataURL)
            // 실제 DataURL로 업데이트 (선택적)
            updateNodeData(id, { 
              imageDataUrl: dataURL,
              imageUrl: dataURL 
            })
          }
        } catch (error) {
          console.error('❌ 이미지 복원 실패:', error)
        }
      } else if (data.imageDataUrl || data.imageUrl) {
        setDisplayImageUrl(data.imageDataUrl || data.imageUrl)
      }
    }

    loadImage()
  }, [data.imageDataUrl, data.imageUrl, id, updateNodeData])

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return

    const url = URL.createObjectURL(file)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = () => {
        updateNodeData(id, {
          imageUrl: url,
          imageDataUrl: dataUrl,
          fileName: file.name,  // 파일 이름 저장
          filePath: file.webkitRelativePath || file.name,  // 가능한 경로 정보 저장
          width: img.width,
          height: img.height,
        })
      }
      img.src = url
    }
    reader.readAsDataURL(file)
  }

  return (
    <div 
      className={`node-card w-48 rounded-xl border bg-[#1c2431] shadow-sm transition-all cursor-pointer ${
        selected ? 'border-cyan-400 border-2 ring-4 ring-cyan-400/30 shadow-lg shadow-cyan-400/20' : 'border-cyan-400/40'
      }`}
      onClick={() => setSelectedNodeId(id)}
    >
      <div className="rounded-t-xl border-b border-cyan-400/20 bg-[#1c2431] px-3 py-2 text-[11px] font-semibold text-slate-100">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-cyan-400" />
          Image
        </div>
      </div>

      <div className="p-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFileUpload(file)
          }}
          onClick={(e) => e.stopPropagation()}
        />
        {displayImageUrl ? (
          <div className="relative">
            <img
              src={displayImageUrl}
              alt="Imported"
              className="w-full rounded-md cursor-pointer hover:opacity-80 transition"
              onClick={(e) => {
                e.stopPropagation()
                fileInputRef.current?.click()
              }}
              onDoubleClick={(e) => {
                e.stopPropagation()
                openImageModal(displayImageUrl || '')
              }}
              onError={() => {
                // 이미지 로드 실패 시 재로드 시도
                console.warn('⚠️ 이미지 로드 실패, IndexedDB에서 재시도...')
                if (data.imageDataUrl?.startsWith('idb:')) {
                  getImage(data.imageDataUrl).then((dataURL) => {
                    if (dataURL) {
                      setDisplayImageUrl(dataURL)
                    } else {
                      setDisplayImageUrl(undefined)
                    }
                  })
                } else {
                  setDisplayImageUrl(undefined)
                }
              }}
              title="더블클릭하여 크게 보기"
            />
            {data.fileName && (
              <div className="mt-1 text-[9px] text-slate-500 truncate" title={data.fileName}>
                📎 {data.fileName}
              </div>
            )}
          </div>
        ) : data.fileName ? (
          // 이미지는 삭제되었지만 파일 이름이 남아있는 경우
          <div 
            className="flex h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-yellow-400/30 bg-[#222d3d] text-[10px] text-slate-400 cursor-pointer hover:border-yellow-400/50 hover:bg-[#2a3544] transition"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            <Upload className="h-5 w-5 text-yellow-400/60" />
            <div className="font-medium text-yellow-400">이미지 다시 업로드</div>
            <div className="text-[9px] text-slate-500 px-2 text-center truncate w-full">
              {data.fileName}
            </div>
          </div>
        ) : (
          <div 
            className="flex h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-cyan-400/30 bg-[#222d3d] text-[10px] text-slate-400 cursor-pointer hover:border-cyan-400/50 hover:bg-[#2a3544] transition"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            <Upload className="h-5 w-5 text-cyan-400/60" />
            <div className="font-medium">Click to upload</div>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-cyan-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-cyan-500"
      />
    </div>
  )
}
