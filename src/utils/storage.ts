/**
 * 저장공간 관리 유틸리티
 */

export interface StorageInfo {
  used: number
  usedMB: string
  limit: number
  limitMB: string
  percentage: number
  isNearLimit: boolean
  isCritical: boolean
}

/**
 * localStorage 사용량 확인
 */
export function getStorageInfo(): StorageInfo {
  let totalSize = 0
  
  // 모든 localStorage 항목 크기 계산
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const item = localStorage.getItem(key)
      if (item) {
        // UTF-16에서 각 문자는 2바이트
        totalSize += (key.length + item.length) * 2
      }
    }
  }
  
  // 브라우저 제한 (Chrome/Firefox: 10MB, Safari: 5MB)
  // 보수적으로 10MB로 설정 (대부분의 최신 브라우저)
  const limit = 10 * 1024 * 1024 // 10MB in bytes
  const percentage = (totalSize / limit) * 100
  
  return {
    used: totalSize,
    usedMB: (totalSize / 1024 / 1024).toFixed(2),
    limit: limit,
    limitMB: (limit / 1024 / 1024).toFixed(2),
    percentage: Math.min(percentage, 100),
    isNearLimit: percentage > 70,
    isCritical: percentage > 90,
  }
}

/**
 * 오래된 이미지 데이터 정리
 */
export function cleanupOldImages(nodes: any[]): any[] {
  console.log('🧹 Starting image cleanup...')
  
  // 이미지가 있는 노드만 필터링
  const imageNodes = nodes.filter(node => 
    node.data?.outputImageDataUrl || 
    node.data?.imageDataUrl || 
    node.data?.composedImageDataUrl
  )
  
  console.log(`📊 Found ${imageNodes.length} nodes with images`)
  
  // 🔥 localStorage를 더 공격적으로 정리: 긴 DataURL은 모두 제거
  const cleanedNodes = nodes.map(node => {
    const cleanedData = { ...node.data }
    
    // 🔥 긴 DataURL (1MB 이상) 제거 - IndexedDB 참조만 유지
    const isLongDataURL = (str: string) => 
      str?.startsWith('data:') && str.length > 1000000 // 1MB 이상
    
    // outputImageDataUrl 정리
    if (cleanedData.outputImageDataUrl && isLongDataURL(cleanedData.outputImageDataUrl)) {
      if (!cleanedData.outputImageDataUrl.startsWith('idb:') && !cleanedData.outputImageDataUrl.startsWith('s3:')) {
        console.warn(`⚠️ Removing long DataURL from node ${node.id} (${(cleanedData.outputImageDataUrl.length / 1024 / 1024).toFixed(2)}MB)`)
        delete cleanedData.outputImageDataUrl
      }
    }
    
    // imageDataUrl 정리
    if (cleanedData.imageDataUrl && isLongDataURL(cleanedData.imageDataUrl)) {
      if (!cleanedData.imageDataUrl.startsWith('idb:') && !cleanedData.imageDataUrl.startsWith('s3:')) {
        console.warn(`⚠️ Removing long DataURL from node ${node.id}`)
        delete cleanedData.imageDataUrl
      }
    }
    
    // composedImageDataUrl 정리
    if (cleanedData.composedImageDataUrl && isLongDataURL(cleanedData.composedImageDataUrl)) {
      if (!cleanedData.composedImageDataUrl.startsWith('idb:') && !cleanedData.composedImageDataUrl.startsWith('s3:')) {
        console.warn(`⚠️ Removing long DataURL from node ${node.id}`)
        delete cleanedData.composedImageDataUrl
      }
    }
    
    // referenceImageDataUrl 정리
    if (cleanedData.referenceImageDataUrl && isLongDataURL(cleanedData.referenceImageDataUrl)) {
      if (!cleanedData.referenceImageDataUrl.startsWith('idb:') && !cleanedData.referenceImageDataUrl.startsWith('s3:')) {
        console.warn(`⚠️ Removing long reference DataURL from node ${node.id}`)
        delete cleanedData.referenceImageDataUrl
      }
    }
    
    return { ...node, data: cleanedData }
  })
  
  console.log('✅ Image cleanup completed')
  return cleanedNodes
}

/**
 * 긴급 정리 - 모든 이미지 DataUrl 제거
 */
export function emergencyCleanup(nodes: any[]): any[] {
  console.warn('🚨 EMERGENCY CLEANUP: Removing large image data URLs (preserving idb:/s3: references)')
  
  const isStorageRef = (str: string | undefined) =>
    str?.startsWith('idb:') || str?.startsWith('s3:')

  return nodes.map(node => {
    const cleanedData = { ...node.data }
    
    // idb:/s3: 참조는 보존 (작은 문자열), 큰 DataURL만 제거
    if (cleanedData.outputImageDataUrl && !isStorageRef(cleanedData.outputImageDataUrl)) {
      delete cleanedData.outputImageDataUrl
    }
    if (cleanedData.imageDataUrl && !isStorageRef(cleanedData.imageDataUrl)) {
      delete cleanedData.imageDataUrl
    }
    if (cleanedData.composedImageDataUrl && !isStorageRef(cleanedData.composedImageDataUrl)) {
      delete cleanedData.composedImageDataUrl
    }
    if (cleanedData.referenceImageDataUrl && !isStorageRef(cleanedData.referenceImageDataUrl)) {
      delete cleanedData.referenceImageDataUrl
    }
    
    return { ...node, data: cleanedData }
  })
}

/**
 * 저장 전에 데이터 압축 (선택적 정리)
 */
export function prepareForStorage(nodes: any[], aggressive: boolean = false): any[] {
  if (aggressive) {
    return emergencyCleanup(nodes)
  }
  
  const info = getStorageInfo()
  
  // 90% 이상 사용 중이면 긴급 정리
  if (info.isCritical) {
    console.warn('🚨 Storage critical! Performing emergency cleanup')
    return emergencyCleanup(nodes)
  }
  
  // 70% 이상 사용 중이면 오래된 이미지 정리
  if (info.isNearLimit) {
    console.warn('⚠️ Storage near limit! Cleaning old images')
    return cleanupOldImages(nodes)
  }
  
  return nodes
}

/**
 * 오래된 백업 자동 정리 (최신 3개만 유지)
 */
export function cleanupOldBackups(): number {
  console.log('🧹 Cleaning up old backups...')
  const backupKeys: Array<{ key: string; timestamp: number }> = []
  
  // 모든 백업 키 수집
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith('nano-banana-backup-')) {
      const timestampStr = key.replace('nano-banana-backup-', '')
      const timestamp = parseInt(timestampStr)
      if (!isNaN(timestamp)) {
        backupKeys.push({ key, timestamp })
      }
    }
  }
  
  // 최신순 정렬
  backupKeys.sort((a, b) => b.timestamp - a.timestamp)
  
  // 최신 3개 제외하고 모두 삭제
  const MAX_BACKUPS = 3
  let deletedCount = 0
  
  for (let i = MAX_BACKUPS; i < backupKeys.length; i++) {
    try {
      localStorage.removeItem(backupKeys[i].key)
      deletedCount++
    } catch (error) {
      console.error('Failed to remove backup:', backupKeys[i].key, error)
    }
  }
  
  if (deletedCount > 0) {
    console.log(`✅ Deleted ${deletedCount} old backups`)
  }
  
  return deletedCount
}

/**
 * 특정 키 패턴의 모든 항목 삭제
 */
export function clearStorageByPattern(pattern: string): number {
  let count = 0
  const keysToDelete: string[] = []
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.includes(pattern)) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => {
    localStorage.removeItem(key)
    count++
  })
  
  console.log(`🗑️ Deleted ${count} items matching pattern: ${pattern}`)
  return count
}

/**
 * 저장공간 경고 메시지 생성
 */
export function getStorageWarning(info: StorageInfo): string | null {
  if (info.isCritical) {
    return `⛔ 저장공간이 거의 가득 찼습니다! (${info.percentage.toFixed(0)}% 사용 중)\n오래된 이미지를 자동으로 정리합니다.`
  }
  
  if (info.isNearLimit) {
    return `⚠️ 저장공간이 부족합니다. (${info.percentage.toFixed(0)}% 사용 중)\n일부 이미지 데이터가 정리될 수 있습니다.`
  }
  
  return null
}

/**
 * 항목별 크기 분석
 */
export function analyzeStorage(): { key: string; sizeMB: string; percentage: number }[] {
  const items: { key: string; sizeMB: string; percentage: number }[] = []
  let totalSize = 0
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key) {
      const item = localStorage.getItem(key)
      if (item) {
        const size = (key.length + item.length) * 2
        totalSize += size
        items.push({
          key,
          sizeMB: (size / 1024 / 1024).toFixed(2),
          percentage: 0, // 나중에 계산
        })
      }
    }
  }
  
  // 백분율 계산
  items.forEach(item => {
    item.percentage = (parseFloat(item.sizeMB) / (totalSize / 1024 / 1024)) * 100
  })
  
  // 크기순 정렬
  return items.sort((a, b) => parseFloat(b.sizeMB) - parseFloat(a.sizeMB))
}
