/**
 * AWS S3 클라이언트
 * 이미지와 비디오를 S3에 저장하고 불러옵니다.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// S3 설정 (환경 변수에서 가져옴)
const REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1'
const BUCKET = import.meta.env.VITE_AWS_S3_BUCKET || 'nanobanana-media'
const ACCESS_KEY = import.meta.env.VITE_AWS_ACCESS_KEY_ID
const SECRET_KEY = import.meta.env.VITE_AWS_SECRET_ACCESS_KEY

// S3 클라이언트 인스턴스
let s3Client: S3Client | null = null

/**
 * S3 클라이언트 초기화
 */
export function initS3Client(): S3Client | null {
  if (!ACCESS_KEY || !SECRET_KEY) {
    console.warn('⚠️ AWS 자격증명이 없습니다. S3 저장 비활성화.')
    return null
  }

  if (s3Client) return s3Client

  try {
    s3Client = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
      },
    })
    console.log('✅ S3 클라이언트 초기화 완료')
    return s3Client
  } catch (error) {
    console.error('❌ S3 클라이언트 초기화 실패:', error)
    return null
  }
}

/**
 * DataURL을 Blob으로 변환
 */
function dataURLToBlob(dataURL: string): Blob {
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
 * 이미지를 S3에 업로드
 * @param id 이미지 고유 ID
 * @param dataURL 이미지 DataURL
 * @param nodeId 노드 ID (선택)
 * @returns S3 URL 또는 null
 */
export async function uploadImageToS3(
  id: string,
  dataURL: string,
  nodeId?: string
): Promise<string | null> {
  const client = initS3Client()
  if (!client) {
    console.log('ℹ️ S3 비활성화 - IndexedDB 사용')
    return null
  }

  try {
    const blob = dataURLToBlob(dataURL)
    const key = `images/${nodeId || 'unknown'}/${id}.jpg`

    // 🔧 브라우저 호환성: Blob을 ArrayBuffer로 변환
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,  // Uint8Array로 전달
      ContentType: blob.type,
      Metadata: {
        nodeId: nodeId || '',
        uploadedAt: new Date().toISOString(),
      },
    })

    await client.send(command)
    
    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
    console.log(`☁️ S3 업로드 완료: ${key} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
    
    return url
  } catch (error) {
    console.error('❌ S3 업로드 실패:', error)
    return null
  }
}

/**
 * S3에서 이미지 다운로드 URL 생성 (Presigned URL)
 * @param s3Url S3 URL
 * @returns Presigned URL
 */
export async function getS3ImageUrl(s3Url: string): Promise<string> {
  const client = initS3Client()
  if (!client) {
    console.log('ℹ️ S3 클라이언트 없음, 원본 URL 반환')
    return s3Url
  }

  try {
    // S3 URL에서 Key 추출
    const url = new URL(s3Url)
    const key = url.pathname.slice(1) // 맨 앞 '/' 제거

    console.log(`🔗 Presigned URL 생성 시도: ${key}`)

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })

    // 1시간 유효한 Presigned URL 생성
    const signedUrl = await getSignedUrl(client, command, { expiresIn: 3600 })
    console.log(`✅ Presigned URL 생성 성공`)
    return signedUrl
  } catch (error) {
    console.error('❌ Presigned URL 생성 실패:', error)
    console.error('에러 세부사항:', error instanceof Error ? error.message : error)
    return s3Url // 실패시 원본 URL 반환
  }
}

/**
 * 비디오를 S3에 업로드
 * @param id 비디오 고유 ID
 * @param blobUrl Blob URL
 * @param nodeId 노드 ID (선택)
 * @returns S3 URL 또는 null
 */
export async function uploadVideoToS3(
  id: string,
  blobUrl: string,
  nodeId?: string
): Promise<string | null> {
  const client = initS3Client()
  if (!client) {
    console.log('ℹ️ S3 비활성화 - IndexedDB 사용')
    return null
  }

  try {
    // Blob URL에서 실제 Blob 가져오기
    const response = await fetch(blobUrl)
    const blob = await response.blob()
    const key = `videos/${nodeId || 'unknown'}/${id}.mp4`

    // 🔧 브라우저 호환성: Blob을 ArrayBuffer로 변환
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,  // Uint8Array로 전달
      ContentType: blob.type || 'video/mp4',
      Metadata: {
        nodeId: nodeId || '',
        uploadedAt: new Date().toISOString(),
      },
    })

    await client.send(command)
    
    const url = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
    console.log(`☁️ S3 비디오 업로드 완료: ${key} (${(blob.size / 1024 / 1024).toFixed(2)} MB)`)
    
    return url
  } catch (error) {
    console.error('❌ S3 비디오 업로드 실패:', error)
    return null
  }
}

/**
 * S3에서 미디어 삭제
 * @param s3Url S3 URL
 */
export async function deleteFromS3(s3Url: string): Promise<boolean> {
  const client = initS3Client()
  if (!client) return false

  try {
    const url = new URL(s3Url)
    const key = url.pathname.slice(1)

    const command = new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })

    await client.send(command)
    console.log(`🗑️ S3 삭제 완료: ${key}`)
    return true
  } catch (error) {
    console.error('❌ S3 삭제 실패:', error)
    return false
  }
}

/**
 * S3 사용 가능 여부 확인
 */
export function isS3Available(): boolean {
  return !!(ACCESS_KEY && SECRET_KEY)
}

/**
 * S3 설정 정보
 */
export function getS3Config() {
  return {
    region: REGION,
    bucket: BUCKET,
    available: isS3Available(),
  }
}
