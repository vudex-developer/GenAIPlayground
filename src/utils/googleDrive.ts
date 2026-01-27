/**
 * Google Drive 이미지 저장 유틸리티
 * 
 * 이미지를 Google Drive 동기화 폴더에 저장하여
 * 자동으로 클라우드에 백업되고 다른 기기에서도 접근 가능하게 합니다.
 */

// Google Drive 이미지 저장 경로
const GOOGLE_DRIVE_BASE = `${process.env.HOME}/Google Drive/내 드라이브/GenAIPlayground/images`

/**
 * Google Drive 폴더가 존재하는지 확인
 */
export const isGoogleDriveAvailable = (): boolean => {
  try {
    // 브라우저 환경에서는 직접 파일 시스템 접근 불가
    // Electron이나 Tauri 같은 데스크톱 앱 환경에서만 가능
    return false
  } catch {
    return false
  }
}

/**
 * 이미지 파일을 Google Drive에 저장
 * 
 * @param file File 객체
 * @param nodeId 노드 ID (파일명에 사용)
 * @returns 저장된 파일 경로 또는 null
 */
export const saveImageToGoogleDrive = async (
  file: File,
  nodeId: string
): Promise<string | null> => {
  try {
    // 브라우저 환경에서는 직접 파일 시스템에 쓸 수 없음
    // 대신 File System Access API를 사용하거나
    // Electron/Tauri 같은 데스크톱 프레임워크 필요
    
    console.warn('Google Drive 저장은 브라우저 환경에서 직접 지원되지 않습니다.')
    console.warn('해결책:')
    console.warn('1. 사용자가 Google Drive 폴더를 선택하도록 안내')
    console.warn('2. Electron으로 데스크톱 앱 빌드')
    console.warn('3. Google Drive API 사용')
    
    return null
  } catch (error) {
    console.error('Failed to save image to Google Drive:', error)
    return null
  }
}

/**
 * Google Drive에서 이미지 로드
 * 
 * @param filePath 파일 경로
 * @returns DataURL 또는 null
 */
export const loadImageFromGoogleDrive = async (
  filePath: string
): Promise<string | null> => {
  try {
    // 브라우저에서는 직접 파일 시스템 접근 불가
    return null
  } catch (error) {
    console.error('Failed to load image from Google Drive:', error)
    return null
  }
}

/**
 * 사용자에게 Google Drive 폴더 선택을 요청
 * (File System Access API 사용)
 */
export const requestGoogleDriveFolderAccess = async (): Promise<FileSystemDirectoryHandle | null> => {
  try {
    // File System Access API 사용 (Chrome 86+)
    if ('showDirectoryPicker' in window) {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents',
      })
      return dirHandle
    }
    return null
  } catch (error) {
    console.error('Failed to access directory:', error)
    return null
  }
}

/**
 * 선택된 폴더에 이미지 저장
 */
export const saveImageToSelectedFolder = async (
  dirHandle: FileSystemDirectoryHandle,
  file: File,
  nodeId: string
): Promise<string | null> => {
  try {
    const fileName = `${nodeId}_${Date.now()}_${file.name}`
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(file)
    await writable.close()
    
    return fileName
  } catch (error) {
    console.error('Failed to save file:', error)
    return null
  }
}

/**
 * 선택된 폴더에서 이미지 로드
 */
export const loadImageFromSelectedFolder = async (
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<string | null> => {
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
    console.error('Failed to load file:', error)
    return null
  }
}
