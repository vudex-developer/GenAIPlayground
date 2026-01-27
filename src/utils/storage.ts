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
  
  // 브라우저 제한 (일반적으로 5-10MB, 여기서는 5MB로 가정)
  const limit = 5 * 1024 * 1024 // 5MB in bytes
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
  
  // 최신 5개만 유지하고 나머지는 URL만 유지 (DataUrl 제거)
  const MAX_IMAGES_TO_KEEP = 5
  
  if (imageNodes.length <= MAX_IMAGES_TO_KEEP) {
    console.log('✅ Image count within limit')
    return nodes
  }
  
  // 타임스탬프로 정렬 (최신순)
  const sortedImageNodes = imageNodes.sort((a, b) => {
    const timeA = (a.data as any).generationTime || 0
    const timeB = (b.data as any).generationTime || 0
    return timeB - timeA
  })
  
  const nodesToClean = sortedImageNodes.slice(MAX_IMAGES_TO_KEEP)
  const nodeIdsToClean = new Set(nodesToClean.map(n => n.id))
  
  console.log(`🗑️ Cleaning ${nodesToClean.length} old images`)
  
  // 오래된 이미지의 DataUrl 제거
  const cleanedNodes = nodes.map(node => {
    if (nodeIdsToClean.has(node.id)) {
      const cleanedData = { ...node.data }
      
      // DataUrl만 제거, URL은 유지
      if (cleanedData.outputImageDataUrl) {
        delete cleanedData.outputImageDataUrl
      }
      if (cleanedData.imageDataUrl && cleanedData.imageUrl) {
        delete cleanedData.imageDataUrl
      }
      if (cleanedData.composedImageDataUrl && cleanedData.composedImageUrl) {
        delete cleanedData.composedImageDataUrl
      }
      
      return { ...node, data: cleanedData }
    }
    return node
  })
  
  console.log('✅ Image cleanup completed')
  return cleanedNodes
}

/**
 * 긴급 정리 - 모든 이미지 DataUrl 제거
 */
export function emergencyCleanup(nodes: any[]): any[] {
  console.warn('🚨 EMERGENCY CLEANUP: Removing all image data URLs')
  
  return nodes.map(node => {
    const cleanedData = { ...node.data }
    
    // 모든 DataUrl 제거
    if (cleanedData.outputImageDataUrl) {
      delete cleanedData.outputImageDataUrl
    }
    if (cleanedData.imageDataUrl) {
      delete cleanedData.imageDataUrl
    }
    if (cleanedData.composedImageDataUrl) {
      delete cleanedData.composedImageDataUrl
    }
    if (cleanedData.referenceImageDataUrl) {
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
