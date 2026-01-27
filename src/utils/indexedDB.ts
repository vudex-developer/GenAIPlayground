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
  s3Url?: string // S3 URL (있으면 S3에 저장됨)
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
 * 이미지 압축 (큰 이미지를 최적화)
 * @param dataURL 원본 이미지 DataURL
 * @param maxWidth 최대 너비 (기본: 2048px)
 * @param quality 압축 품질 (0.0 ~ 1.0, 기본: 0.85)
 */
export async function compressImage(
  dataURL: string,
  maxWidth: number = 2048,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    
    img.onload = () => {
      try {
        // 원본 크기
        const originalSize = (dataURL.length * 0.75) / 1024 / 1024 // MB
        
        // 크기가 작으면 압축 스킵
        if (img.width <= maxWidth && originalSize < 1) {
          console.log(`ℹ️ 이미지 압축 스킵 (${img.width}x${img.height}, ${originalSize.toFixed(2)}MB)`)
          resolve(dataURL)
          return
        }
        
        // Canvas로 리사이즈
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          reject(new Error('Canvas context 생성 실패'))
          return
        }
        
        // 비율 유지하며 리사이즈
        let { width, height } = img
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        
        canvas.width = width
        canvas.height = height
        
        // 이미지 그리기
        ctx.drawImage(img, 0, 0, width, height)
        
        // JPEG로 압축 (PNG보다 훨씬 작음)
        const compressedDataURL = canvas.toDataURL('image/jpeg', quality)
        const compressedSize = (compressedDataURL.length * 0.75) / 1024 / 1024 // MB
        
        console.log(
          `✅ 이미지 압축: ${img.width}x${img.height} → ${width}x${height}, ` +
          `${originalSize.toFixed(2)}MB → ${compressedSize.toFixed(2)}MB ` +
          `(${((1 - compressedSize / originalSize) * 100).toFixed(1)}% 감소)`
        )
        
        resolve(compressedDataURL)
      } catch (error) {
        console.error('❌ 이미지 압축 실패:', error)
        resolve(dataURL) // 실패시 원본 반환
      }
    }
    
    img.onerror = () => {
      console.error('❌ 이미지 로드 실패')
      resolve(dataURL) // 실패시 원본 반환
    }
    
    img.src = dataURL
  })
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
 * 이미지 저장 (DataURL → S3 또는 IndexedDB)
 * @param compress 압축 여부 (기본: true)
 */
export async function saveImage(
  id: string,
  dataURL: string,
  nodeId?: string,
  compress: boolean = true
): Promise<string> {
  console.log(`💾 이미지 저장 시작: ${id}, nodeId: ${nodeId}`)
  
  // 압축 먼저 수행 (S3와 IndexedDB 모두에 사용)
  const finalDataURL = compress ? await compressImage(dataURL) : dataURL
  const blob = dataURLToBlob(finalDataURL)
  
  // 1️⃣ S3 업로드 시도
  let s3Url: string | null = null
  try {
    const { uploadImageToS3, isS3Available } = await import('./s3Client')
    
    if (isS3Available()) {
      s3Url = await uploadImageToS3(id, finalDataURL, nodeId)
      
      if (s3Url) {
        console.log(`☁️ S3 업로드 성공: ${id}`)
      }
    }
  } catch (error) {
    console.warn('⚠️ S3 업로드 실패, IndexedDB로 폴백:', error)
  }
  
  // 2️⃣ IndexedDB에 항상 캐시 저장 (S3 성공/실패 무관)
  const db = await initDB()
  await db.put(STORES.IMAGES, blob, id)
  
  const metadata: MediaMetadata = {
    id,
    type: 'image',
    mimeType: blob.type,
    size: blob.size,
    createdAt: Date.now(),
    nodeId,
    s3Url: s3Url || undefined, // S3 URL 저장 (있으면)
  }
  await db.put(STORES.METADATA, metadata)
  
  console.log(`💾 IndexedDB 캐시 저장 완료: ${id} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
  
  // 3️⃣ 참조용 ID 반환
  // S3 업로드 성공시에도 idb: 접두사 사용 (IndexedDB 캐시 우선)
  return `idb:${id}`
}

/**
 * 이미지 불러오기 (IndexedDB 우선, S3 폴백)
 */
export async function getImage(id: string): Promise<string | null> {
  // ID에서 실제 키 추출
  let cleanId = id
  let isS3 = false
  
  if (id.startsWith('s3:')) {
    isS3 = true
    // s3:https://bucket.s3.region.amazonaws.com/path/to/image.jpg
    // → image ID 추출 (파일명)
    const s3Url = id.slice(3)
    try {
      const urlParts = s3Url.split('/')
      cleanId = urlParts[urlParts.length - 1].replace(/\.[^/.]+$/, '') // 확장자 제거
    } catch (error) {
      console.warn('⚠️ S3 URL 파싱 실패:', error)
      cleanId = id.replace('s3:', '').replace('idb:', '')
    }
  } else if (id.startsWith('idb:')) {
    cleanId = id.slice(4)
  }
  
  console.log(`📥 이미지 로드 시도: ${cleanId} (원본: ${id})`)
  
  // 1️⃣ IndexedDB 캐시 확인 (가장 빠름)
  try {
    const db = await initDB()
    const blob = await db.get(STORES.IMAGES, cleanId)

    if (blob) {
      const dataURL = await blobToDataURL(blob)
      console.log(`✅ IndexedDB 캐시 로드: ${cleanId} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
      return dataURL
    }
  } catch (error) {
    console.warn('⚠️ IndexedDB 로드 실패:', error)
  }
  
  // 2️⃣ S3에서 가져오기 시도 (캐시 없을 때만)
  if (isS3) {
    try {
      const { getS3ImageUrl } = await import('./s3Client')
      const s3Url = id.slice(3) // 's3:' 제거
      const signedUrl = await getS3ImageUrl(s3Url)
      console.log(`☁️ S3 이미지 로드: ${s3Url}`)
      return signedUrl
    } catch (error) {
      console.error('❌ S3 로드 실패:', error)
    }
  }
  
  console.warn(`⚠️ 이미지를 찾을 수 없음: ${id}`)
  return null
}

/**
 * 비디오 저장 (Blob URL → S3 또는 IndexedDB)
 */
export async function saveVideo(
  id: string,
  blobUrl: string,
  nodeId?: string
): Promise<string> {
  // 1️⃣ S3 업로드 시도
  try {
    const { uploadVideoToS3, isS3Available } = await import('./s3Client')
    
    if (isS3Available()) {
      const s3Url = await uploadVideoToS3(id, blobUrl, nodeId)
      
      if (s3Url) {
        console.log(`☁️ S3 비디오 저장 완료: ${id}`)
        
        // S3 성공시에도 IndexedDB에 캐시 저장 (오프라인 대비)
        const response = await fetch(blobUrl)
        const blob = await response.blob()
        const db = await initDB()
        await db.put(STORES.VIDEOS, blob, id)
        
        const metadata: MediaMetadata = {
          id,
          type: 'video',
          mimeType: blob.type,
          size: blob.size,
          createdAt: Date.now(),
          nodeId,
          s3Url, // S3 URL 저장
        }
        await db.put(STORES.METADATA, metadata)
        
        return `s3:${s3Url}` // S3 URL 반환
      }
    }
  } catch (error) {
    console.warn('⚠️ S3 비디오 업로드 실패, IndexedDB로 폴백:', error)
  }
  
  // 2️⃣ IndexedDB 저장 (폴백)
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

  console.log(`🎬 IndexedDB 비디오 저장: ${id} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
  
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
