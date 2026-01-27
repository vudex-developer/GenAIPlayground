import React from 'react'
import { FolderOpen, Check, AlertCircle } from 'lucide-react'
import { useGoogleDriveStorage } from '../hooks/useGoogleDriveStorage'

/**
 * Google Drive 설정 컴포넌트
 * 
 * 사용자가 Google Drive 폴더를 선택하여
 * 이미지를 자동으로 저장하고 동기화할 수 있습니다.
 */
export const GoogleDriveSettings: React.FC = () => {
  const {
    isSupported,
    isFolderSelected,
    folderName,
    selectFolder,
  } = useGoogleDriveStorage()

  if (!isSupported) {
    return (
      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-400">
            <div className="font-medium mb-1">브라우저 미지원</div>
            <div className="text-xs text-yellow-400/80">
              Google Drive 자동 저장은 Chrome 86+ 이상에서 지원됩니다.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-300">
        Google Drive 자동 저장
      </div>

      {isFolderSelected ? (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-400 mb-1">
                폴더 선택됨
              </div>
              <div className="text-xs text-green-400/80 font-mono">
                📁 {folderName}
              </div>
              <div className="text-xs text-slate-400 mt-2">
                이미지가 자동으로 이 폴더에 저장되고 Google Drive에 동기화됩니다.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
          <div className="text-sm text-blue-400 mb-3">
            Google Drive 폴더를 선택하면 이미지가 자동으로 저장됩니다.
          </div>
          <div className="text-xs text-slate-400 space-y-1 mb-3">
            <div>• Google Drive 폴더를 선택하세요</div>
            <div>• 예: Google Drive/내 드라이브/GenAIPlayground/images</div>
            <div>• 이미지가 자동으로 클라우드에 동기화됩니다</div>
          </div>
        </div>
      )}

      <button
        onClick={selectFolder}
        className="w-full rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm text-blue-400 transition hover:bg-blue-500/20 flex items-center justify-center gap-2"
      >
        <FolderOpen className="h-4 w-4" />
        {isFolderSelected ? '다른 폴더 선택' : 'Google Drive 폴더 선택'}
      </button>
    </div>
  )
}
