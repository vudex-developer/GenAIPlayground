import React, { useEffect, useState, useCallback } from 'react'
import { Handle, Position, type NodeProps } from 'reactflow'
import { Image as ImageIcon, Upload, RefreshCw } from 'lucide-react'
import { useFlowStore } from '../../stores/flowStore'
import { getImage, saveImage, initDB, blobToDataURL } from '../../utils/indexedDB'
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
  const [displayImageUrl, setDisplayImageUrl] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  // 🔄 IndexedDB/S3에서 이미지 로드 (공통 함수)
  const loadImageFromStorage = useCallback(async () => {
    setIsLoading(true)
    setLoadFailed(false)

    try {
      // 1. idb:/s3: 참조로 직접 로드
      if (data.imageDataUrl && typeof data.imageDataUrl === 'string') {
        if (data.imageDataUrl.startsWith('idb:') || data.imageDataUrl.startsWith('s3:')) {
          console.log('🔄 Image Import: 이미지 로드 중...', data.imageDataUrl)
          const dataURL = await getImage(data.imageDataUrl)
          if (dataURL) {
            console.log('✅ Image Import: 이미지 로드 성공')
            setDisplayImageUrl(dataURL)
            setLoadFailed(false)
            setIsLoading(false)
            return
          }
        } else if (data.imageDataUrl.startsWith('data:')) {
          setDisplayImageUrl(data.imageDataUrl)
          setLoadFailed(false)
          setIsLoading(false)
          return
        }
      }

      if (data.imageUrl) {
        setDisplayImageUrl(data.imageUrl)
        setLoadFailed(false)
        setIsLoading(false)
        return
      }

      // 2. 참조 없으면 nodeId로 IndexedDB 검색 (폴백)
      try {
        const db = await initDB()
        const allMeta = await db.getAll('metadata')
        const nodeMeta = allMeta
          .filter((m: any) => m.nodeId === id && m.type === 'image')
          .sort((a: any, b: any) => b.createdAt - a.createdAt)

        if (nodeMeta.length > 0) {
          const blob = await db.get('images', nodeMeta[0].id)
          if (blob) {
            const dataURL = await blobToDataURL(blob)
            console.log('✅ Image Import: nodeId로 이미지 복구 성공:', nodeMeta[0].id)
            setDisplayImageUrl(dataURL)
            setLoadFailed(false)
            updateNodeData(id, { imageDataUrl: `idb:${nodeMeta[0].id}` })
            setIsLoading(false)
            return
          }
        }
      } catch (error) {
        console.warn('⚠️ Image Import: nodeId 검색 실패:', error)
      }

      // 3. 모두 실패
      setDisplayImageUrl(undefined)
      setLoadFailed(true)
    } catch (error) {
      console.error('❌ Image Import: 이미지 복원 실패:', error)
      setDisplayImageUrl(undefined)
      setLoadFailed(true)
    } finally {
      setIsLoading(false)
    }
  }, [data.imageDataUrl, data.imageUrl, id, updateNodeData])

  // 마운트 시 + 데이터 변경 시 자동 로드
  useEffect(() => {
    loadImageFromStorage()
  }, [loadImageFromStorage])

  // 수동 리로드 핸들러
  const handleReload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    console.log('🔄 Image Import: 수동 리로드 요청')
    await loadImageFromStorage()
  }, [loadImageFromStorage])

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return

    const url = URL.createObjectURL(file)
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const img = new Image()
      img.onload = async () => {
        try {
          const imageId = `img-import-${Date.now()}-${Math.random().toString(36).substring(7)}`
          const savedRef = await saveImage(imageId, dataUrl, id, true)

          updateNodeData(id, {
            imageUrl: url,
            imageDataUrl: savedRef,
            fileName: file.name,
            filePath: file.webkitRelativePath || file.name,
            width: img.width,
            height: img.height,
          })
          setDisplayImageUrl(dataUrl)
          setLoadFailed(false)
        } catch (error) {
          console.error('❌ Image Import: 저장 실패', error)
          updateNodeData(id, {
            imageUrl: url,
            imageDataUrl: dataUrl,
            fileName: file.name,
            filePath: file.webkitRelativePath || file.name,
            width: img.width,
            height: img.height,
          })
          setDisplayImageUrl(dataUrl)
          setLoadFailed(false)
        }
      }
      img.src = url
    }
    reader.readAsDataURL(file)
  }, [id, updateNodeData])

  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      void handleFileUpload(file)
    }
  }, [handleFileUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

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
        {isLoading ? (
          // 로딩 상태
          <div className="flex h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-cyan-400/30 bg-[#222d3d]">
            <RefreshCw className="h-5 w-5 text-cyan-400 animate-spin" />
            <div className="text-[10px] text-slate-400">이미지 로딩 중...</div>
          </div>
        ) : displayImageUrl ? (
          <div className="relative group">
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
                console.warn('⚠️ Image Import: 이미지 렌더링 실패')
                setDisplayImageUrl(undefined)
                setLoadFailed(true)
              }}
              title="클릭: 이미지 교체 / 더블클릭: 크게 보기"
            />
            {/* 리로드 버튼 (hover 시 표시) */}
            <button
              className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              onClick={handleReload}
              title="이미지 다시 로드"
            >
              <RefreshCw className="h-3 w-3" />
            </button>
            {data.fileName && (
              <div className="mt-1 text-[9px] text-slate-500 truncate" title={data.fileName}>
                {data.fileName}
              </div>
            )}
          </div>
        ) : loadFailed || (data.fileName && !displayImageUrl) ? (
          <div 
            className={`flex h-32 flex-col items-center justify-center gap-1.5 rounded-md border border-dashed text-[10px] text-slate-400 cursor-pointer transition ${
              isDragOver
                ? 'border-cyan-400 bg-cyan-400/10'
                : 'border-amber-400/40 bg-[#222d3d] hover:border-amber-400/60 hover:bg-[#2a3544]'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            <Upload className={`h-5 w-5 ${isDragOver ? 'text-cyan-400' : 'text-amber-400/70'}`} />
            <div className="font-medium text-amber-400">
              {isDragOver ? '여기에 놓기' : '클릭 또는 드래그'}
            </div>
            {data.fileName && (
              <div className="text-[8px] text-slate-600 px-2 text-center truncate w-full">
                {data.fileName}
              </div>
            )}
          </div>
        ) : (
          <div 
            className={`flex h-32 flex-col items-center justify-center gap-2 rounded-md border border-dashed text-[10px] text-slate-400 cursor-pointer transition ${
              isDragOver
                ? 'border-cyan-400 bg-cyan-400/10'
                : 'border-cyan-400/30 bg-[#222d3d] hover:border-cyan-400/50 hover:bg-[#2a3544]'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={(e) => {
              e.stopPropagation()
              fileInputRef.current?.click()
            }}
          >
            <Upload className={`h-5 w-5 ${isDragOver ? 'text-cyan-400' : 'text-cyan-400/60'}`} />
            <div className="font-medium">{isDragOver ? '여기에 놓기' : '클릭 또는 드래그'}</div>
          </div>
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="!h-[7px] !w-[7px] !bg-violet-400"
        title="Prompt Input"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-[7px] !w-[7px] !bg-yellow-500"
        title="Image Output"
      />
    </div>
  )
}
