import React, { useEffect } from 'react'
import { X, Download } from 'lucide-react'
import { useFlowStore } from '../stores/flowStore'

export const ImageModal: React.FC = () => {
  const { imageModal, closeImageModal } = useFlowStore()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && imageModal.isOpen) {
        closeImageModal()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [imageModal.isOpen, closeImageModal])

  if (!imageModal.isOpen || !imageModal.imageUrl) return null

  const handleDownload = () => {
    if (!imageModal.imageUrl) return

    const link = document.createElement('a')
    link.href = imageModal.imageUrl
    link.download = `image-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={closeImageModal}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeImageModal}
          className="absolute -right-12 top-0 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          title="닫기 (ESC)"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Download Button */}
        <button
          onClick={handleDownload}
          className="absolute -right-12 top-14 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
          title="다운로드"
        >
          <Download className="h-6 w-6" />
        </button>

        {/* Image */}
        <img
          src={imageModal.imageUrl}
          alt="Preview"
          className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-2xl"
          style={{ objectFit: 'contain' }}
        />

        {/* Info Text */}
        <div className="mt-4 text-center text-sm text-slate-400">
          클릭하거나 ESC 키를 눌러 닫기
        </div>
      </div>
    </div>
  )
}
