/**
 * 자동 백업 시스템
 * - localStorage 외에 추가 백업 생성
 * - 데이터 손실 방지
 */

const BACKUP_PREFIX = 'nano-banana-backup-'
const MAX_BACKUPS = 3 // 10개에서 3개로 줄임 (저장공간 절약)

export interface Backup {
  timestamp: number
  data: string
  nodeCount: number
  edgeCount: number
}

/**
 * 현재 워크플로우를 백업합니다
 */
export function createBackup(data: string): void {
  try {
    const backup: Backup = {
      timestamp: Date.now(),
      data,
      nodeCount: (JSON.parse(data).nodes || []).length,
      edgeCount: (JSON.parse(data).edges || []).length,
    }

    const backupKey = `${BACKUP_PREFIX}${backup.timestamp}`
    localStorage.setItem(backupKey, JSON.stringify(backup))

    // 오래된 백업 정리
    cleanOldBackups()
    
    console.log(`✅ 백업 생성됨: ${new Date(backup.timestamp).toLocaleString('ko-KR')}`)
  } catch (error) {
    console.error('❌ 백업 실패:', error)
  }
}

/**
 * 모든 백업 목록 가져오기
 */
export function getAllBackups(): Backup[] {
  const backups: Backup[] = []

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(BACKUP_PREFIX)) {
      try {
        const backup = JSON.parse(localStorage.getItem(key) || '{}')
        backups.push(backup)
      } catch (error) {
        console.error('백업 파싱 실패:', key, error)
      }
    }
  }

  // 최신순 정렬
  return backups.sort((a, b) => b.timestamp - a.timestamp)
}

/**
 * 백업 복원
 */
export function restoreBackup(timestamp: number): string | null {
  try {
    const backupKey = `${BACKUP_PREFIX}${timestamp}`
    const backupStr = localStorage.getItem(backupKey)
    
    if (!backupStr) {
      console.error('백업을 찾을 수 없습니다:', timestamp)
      return null
    }

    const backup: Backup = JSON.parse(backupStr)
    console.log(`✅ 백업 복원됨: ${new Date(backup.timestamp).toLocaleString('ko-KR')}`)
    
    return backup.data
  } catch (error) {
    console.error('❌ 백업 복원 실패:', error)
    return null
  }
}

/**
 * 오래된 백업 정리 (최신 10개만 유지)
 */
function cleanOldBackups(): void {
  const backups = getAllBackups()
  
  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(MAX_BACKUPS)
    
    toDelete.forEach((backup) => {
      const key = `${BACKUP_PREFIX}${backup.timestamp}`
      localStorage.removeItem(key)
    })
    
    console.log(`🗑️ ${toDelete.length}개의 오래된 백업 삭제됨`)
  }
}

/**
 * 모든 백업 삭제
 */
export function clearAllBackups(): void {
  const backups = getAllBackups()
  
  backups.forEach((backup) => {
    const key = `${BACKUP_PREFIX}${backup.timestamp}`
    localStorage.removeItem(key)
  })
  
  console.log(`🗑️ ${backups.length}개의 백업 삭제됨`)
}

/**
 * 긴급 복구: 가장 최근 백업 복원
 */
export function emergencyRestore(): string | null {
  const backups = getAllBackups()
  
  if (backups.length === 0) {
    console.error('❌ 복구할 백업이 없습니다')
    return null
  }

  const latest = backups[0]
  console.log(`🚨 긴급 복구: ${new Date(latest.timestamp).toLocaleString('ko-KR')} 백업 사용`)
  
  return latest.data
}

/**
 * 백업 통계
 */
export function getBackupStats() {
  const backups = getAllBackups()
  
  if (backups.length === 0) {
    return {
      count: 0,
      oldest: null,
      latest: null,
      totalSize: 0,
    }
  }

  const oldest = backups[backups.length - 1]
  const latest = backups[0]
  
  let totalSize = 0
  backups.forEach((backup) => {
    const key = `${BACKUP_PREFIX}${backup.timestamp}`
    const item = localStorage.getItem(key)
    if (item) {
      totalSize += item.length
    }
  })

  return {
    count: backups.length,
    oldest: new Date(oldest.timestamp),
    latest: new Date(latest.timestamp),
    totalSize: (totalSize / 1024).toFixed(2) + ' KB',
  }
}
