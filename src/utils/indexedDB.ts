/**
 * IndexedDB 유틸리티
 * 이미지와 비디오를 효율적으로 저장하고 관리합니다.
 */

import { openDB, type IDBPDatabase } from 'idb'

const DB_NAME = 'NanoBananaDB'
const DB_VERSION = 1

// Object Store 이름들
const STORES = {
  IMAGES: 'images',      // 이미지 blob 저장
  VIDEOS: 'videos',      // 비디오 blob 저장
  METADATA: 'metadata',  // 메타데이터
}

export type MediaType = 'image' | 'video'

export interface MediaMetadata {
  id: string
  type: MediaType
  mimeType: string
  size: number
  createdAt: number
  nodeId?: string
}

let dbInstance: IDBPDatabase | null = null

/**
 * IndexedDB 초기화 및 열기
 */
export async function initDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance

  console.log('🗄️ IndexedDB 초기화 중...')

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 이미지 저장소
      if (!db.objectStoreNames.contains(STORES.IMAGES)) {
        db.createObjectStore(STORES.IMAGES)
        console.log('✅ Images store 생성')
      }

      // 비디오 저장소
      if (!db.objectStoreNames.contains(STORES.VIDEOS)) {
        db.createObjectStore(STORES.VIDEOS)
        console.log('✅ Videos store 생성')
      }

      // 메타데이터 저장소
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        const metaStore = db.createObjectStore(STORES.METADATA, { keyPath: 'id' })
        metaStore.createIndex('nodeId', 'nodeId', { unique: false })
        metaStore.createIndex('type', 'type', { unique: false })
        console.log('✅ Metadata store 생성')
      }
    },
  })

  console.log('✅ IndexedDB 준비 완료')
  return dbInstance
}

/**
 * DataURL을 Blob으로 변환
 */
export function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Blob을 DataURL로 변환
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 이미지 저장 (DataURL → Blob)
 */
export async function saveImage(
  id: string,
  dataURL: string,
  nodeId?: string
): Promise<string> {
  const db = await initDB()
  const blob = dataURLToBlob(dataURL)

  // Blob 저장
  await db.put(STORES.IMAGES, blob, id)

  // 메타데이터 저장
  const metadata: MediaMetadata = {
    id,
    type: 'image',
    mimeType: blob.type,
    size: blob.size,
    createdAt: Date.now(),
    nodeId,
  }
  await db.put(STORES.METADATA, metadata)

  console.log(`💾 이미지 저장: ${id} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
  
  // 참조용 ID 반환
  return `idb:${id}`
}

/**
 * 이미지 불러오기 (Blob → DataURL)
 */
export async function getImage(id: string): Promise<string | null> {
  // idb: 접두사 제거
  const cleanId = id.startsWith('idb:') ? id.slice(4) : id
  
  const db = await initDB()
  const blob = await db.get(STORES.IMAGES, cleanId)

  if (!blob) {
    console.warn(`⚠️ 이미지 없음: ${cleanId}`)
    return null
  }

  const dataURL = await blobToDataURL(blob)
  console.log(`📥 이미지 로드: ${cleanId} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
  
  return dataURL
}

/**
 * 비디오 저장 (Blob URL → Blob)
 */
export async function saveVideo(
  id: string,
  blobUrl: string,
  nodeId?: string
): Promise<string> {
  // Blob URL에서 실제 Blob 가져오기
  const response = await fetch(blobUrl)
  const blob = await response.blob()

  const db = await initDB()

  // Blob 저장
  await db.put(STORES.VIDEOS, blob, id)

  // 메타데이터 저장
  const metadata: MediaMetadata = {
    id,
    type: 'video',
    mimeType: blob.type,
    size: blob.size,
    createdAt: Date.now(),
    nodeId,
  }
  await db.put(STORES.METADATA, metadata)

  console.log(`🎬 비디오 저장: ${id} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
  
  // 참조용 ID 반환
  return `idb:${id}`
}

/**
 * 비디오 불러오기 (Blob → Blob URL)
 */
export async function getVideo(id: string): Promise<string | null> {
  // idb: 접두사 제거
  const cleanId = id.startsWith('idb:') ? id.slice(4) : id
  
  const db = await initDB()
  const blob = await db.get(STORES.VIDEOS, cleanId)

  if (!blob) {
    console.warn(`⚠️ 비디오 없음: ${cleanId}`)
    return null
  }

  const blobUrl = URL.createObjectURL(blob)
  console.log(`📥 비디오 로드: ${cleanId} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
  
  return blobUrl
}

/**
 * 미디어 삭제
 */
export async function deleteMedia(id: string, type: MediaType): Promise<void> {
  const cleanId = id.startsWith('idb:') ? id.slice(4) : id
  const db = await initDB()

  const store = type === 'image' ? STORES.IMAGES : STORES.VIDEOS
  await db.delete(store, cleanId)
  await db.delete(STORES.METADATA, cleanId)

  console.log(`🗑️ 미디어 삭제: ${cleanId}`)
}

/**
 * 노드의 모든 미디어 삭제
 */
export async function deleteNodeMedia(nodeId: string): Promise<void> {
  const db = await initDB()
  const tx = db.transaction(STORES.METADATA, 'readonly')
  const index = tx.store.index('nodeId')
  const items = await index.getAll(nodeId)

  for (const item of items) {
    await deleteMedia(item.id, item.type)
  }

  console.log(`🗑️ 노드 미디어 삭제: ${nodeId} (${items.length}개)`)
}

/**
 * 저장소 통계
 */
export async function getStorageStats(): Promise<{
  images: number
  videos: number
  totalSize: number
  totalSizeMB: string
}> {
  const db = await initDB()
  const metadata = await db.getAll(STORES.METADATA)

  const images = metadata.filter((m) => m.type === 'image').length
  const videos = metadata.filter((m) => m.type === 'video').length
  const totalSize = metadata.reduce((sum, m) => sum + m.size, 0)

  return {
    images,
    videos,
    totalSize,
    totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
  }
}

/**
 * IndexedDB 전체 정리
 */
export async function clearAllMedia(): Promise<void> {
  const db = await initDB()
  await db.clear(STORES.IMAGES)
  await db.clear(STORES.VIDEOS)
  await db.clear(STORES.METADATA)
  console.log('🧹 IndexedDB 전체 정리 완료')
}

/**
 * 오래된 미디어 정리 (30일 이상)
 */
export async function cleanupOldMedia(daysOld: number = 30): Promise<number> {
  const db = await initDB()
  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000
  const metadata = await db.getAll(STORES.METADATA)

  let cleaned = 0
  for (const item of metadata) {
    if (item.createdAt < cutoffTime) {
      await deleteMedia(item.id, item.type)
      cleaned++
    }
  }

  console.log(`🧹 오래된 미디어 ${cleaned}개 정리 완료`)
  return cleaned
}
