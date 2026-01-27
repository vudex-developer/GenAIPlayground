import React from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Image as ImageIcon, Upload } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
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
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt="Imported"
            className="w-full rounded-md cursor-pointer hover:opacity-80 transition"
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              openImageModal(data.imageUrl || '')
            }}
            title="더블클릭하여 크게 보기"
          />
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
