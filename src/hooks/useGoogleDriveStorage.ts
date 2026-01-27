import { useState, useCallback } from 'react'

/**
 * Google Drive 폴더를 사용한 이미지 저장 Hook
 * 
 * File System Access API를 사용하여 사용자가 선택한 폴더에
 * 이미지를 저장하고 불러올 수 있습니다.
 */
export const useGoogleDriveStorage = () => {
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [isSupported, setIsSupported] = useState(() => 'showDirectoryPicker' in window)

  /**
   * 사용자에게 Google Drive 폴더 선택 요청
   */
  const selectFolder = useCallback(async () => {
    if (!isSupported) {
      alert('이 브라우저는 폴더 선택을 지원하지 않습니다. Chrome 86+ 이상을 사용하세요.')
      return false
    }

    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      })
      setDirHandle(handle)
      
      // 선택한 폴더 경로를 localStorage에 저장 (권한 유지)
      localStorage.setItem('google-drive-folder-name', handle.name)
      
      return true
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Failed to select folder:', error)
        alert('폴더 선택에 실패했습니다.')
      }
      return false
    }
  }, [isSupported])

  /**
   * 이미지 파일을 선택된 폴더에 저장
   */
  const saveImage = useCallback(async (
    file: File,
    nodeId: string
  ): Promise<{ fileName: string; filePath: string } | null> => {
    if (!dirHandle) {
      alert('먼저 저장 폴더를 선택해주세요.')
      return null
    }

    try {
      const timestamp = Date.now()
      const fileName = `${nodeId}_${timestamp}_${file.name}`
      
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(file)
      await writable.close()
      
      return {
        fileName,
        filePath: `${dirHandle.name}/${fileName}`,
      }
    } catch (error) {
      console.error('Failed to save image:', error)
      alert('이미지 저장에 실패했습니다.')
      return null
    }
  }, [dirHandle])

  /**
   * 저장된 이미지를 DataURL로 로드
   */
  const loadImage = useCallback(async (fileName: string): Promise<string | null> => {
    if (!dirHandle) {
      return null
    }

    try {
      const fileHandle = await dirHandle.getFileHandle(fileName)
      const file = await fileHandle.getFile()
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
    } catch (error) {
      console.error('Failed to load image:', error)
      return null
    }
  }, [dirHandle])

  /**
   * 폴더 권한 확인 및 재요청
   */
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!dirHandle) return false

    try {
      const permission = await dirHandle.queryPermission({ mode: 'readwrite' })
      if (permission === 'granted') {
        return true
      }

      const requestPermission = await dirHandle.requestPermission({ mode: 'readwrite' })
      return requestPermission === 'granted'
    } catch (error) {
      console.error('Failed to check permission:', error)
      return false
    }
  }, [dirHandle])

  return {
    isSupported,
    isFolderSelected: !!dirHandle,
    folderName: dirHandle?.name,
    selectFolder,
    saveImage,
    loadImage,
    checkPermission,
  }
}
