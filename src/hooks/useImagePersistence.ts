/**
 * 이미지 자동 저장 Hook
 * DataURL을 감지하고 자동으로 IndexedDB에 저장합니다.
 */

import { useEffect, useRef } from 'react'
import { useFlowStore } from '../stores/flowStore'
import { saveImage, getImage } from '../utils/indexedDB'
import type { WorkflowNode } from '../types/nodes'

/**
 * 노드의 이미지를 IndexedDB로 마이그레이션
 */
async function migrateNodeImages(node: WorkflowNode): Promise<boolean> {
  let updated = false
  const data = node.data as any

  // 처리할 이미지 필드들 (모든 가능한 이미지 필드)
  const imageFields = [
    'imageDataUrl',
    'imageUrl',
    'outputImageDataUrl',
    'outputImageUrl',
    'composedImageDataUrl',
    'composedImageUrl',
    'referenceImageDataUrl',
    'inputImageDataUrl',
    'inputImageUrl',
    'endImageDataUrl',
    'endImageUrl',
  ]

  for (const field of imageFields) {
    const value = data[field]
    
    // DataURL이고 아직 IndexedDB에 저장 안 됨
    if (value && typeof value === 'string' && value.startsWith('data:')) {
      try {
        const id = `${node.id}-${field}-${Date.now()}`
        const idbRef = await saveImage(id, value, node.id)
        
        // 노드 데이터 업데이트 - idb: 참조 저장
        data[field] = idbRef
        updated = true
        
        console.log(`✅ 마이그레이션: ${node.id}.${field} → IndexedDB`)
      } catch (error) {
        console.error(`❌ 이미지 저장 실패: ${node.id}.${field}`, error)
      }
    }
  }

  // regeneratedImages, inputImages 객체 처리
  const objectFields = ['regeneratedImages', 'inputImages']
  
  for (const field of objectFields) {
    const obj = data[field]
    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.startsWith('data:') && !value.startsWith('idb:')) {
          try {
            const id = `${node.id}-${field}-${key}-${Date.now()}`
            const idbRef = await saveImage(id, value, node.id)
            
            obj[key] = idbRef
            updated = true
            
            console.log(`✅ 이미지 마이그레이션: ${node.id}.${field}.${key} → ${idbRef}`)
          } catch (error) {
            console.error(`❌ 이미지 저장 실패: ${node.id}.${field}.${key}`, error)
          }
        }
      }
    }
  }

  return updated
}

/**
 * 노드의 이미지를 IndexedDB에서 복원
 */
async function restoreNodeImages(node: WorkflowNode): Promise<boolean> {
  let updated = false
  const data = node.data as any

  // 처리할 이미지 필드들
  const imageFields = [
    'imageDataUrl',
    'imageUrl',
    'outputImageDataUrl',
    'outputImageUrl',
    'composedImageDataUrl',
    'composedImageUrl',
    'referenceImageDataUrl',
    'inputImageDataUrl',
    'inputImageUrl',
    'endImageDataUrl',
    'endImageUrl',
  ]

  for (const field of imageFields) {
    const value = data[field]
    
    // IndexedDB 참조인 경우
    if (value && typeof value === 'string' && value.startsWith('idb:')) {
      try {
        const dataURL = await getImage(value)
        if (dataURL) {
          data[field] = dataURL
          updated = true
          console.log(`✅ 복원: ${node.id}.${field}`)
        }
      } catch (error) {
        console.error(`❌ 이미지 복원 실패: ${node.id}.${field}`, error)
      }
    }
  }

  // regeneratedImages, inputImages 객체 처리
  const objectFields = ['regeneratedImages', 'inputImages']
  
  for (const field of objectFields) {
    const obj = data[field]
    if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.startsWith('idb:')) {
          try {
            const dataURL = await getImage(value)
            if (dataURL) {
              obj[key] = dataURL
              updated = true
            }
          } catch (error) {
            console.error(`❌ 이미지 복원 실패: ${node.id}.${field}.${key}`, error)
          }
        }
      }
    }
  }

  return updated
}

/**
 * 전체 워크플로우의 이미지 마이그레이션
 */
export async function migrateAllImages(): Promise<void> {
  console.log('🔄 이미지 마이그레이션 시작...')
  
  const nodes = useFlowStore.getState().nodes
  const updateNodeData = useFlowStore.getState().updateNodeData
  
  let migratedCount = 0
  
  for (const node of nodes) {
    const updated = await migrateNodeImages(node)
    if (updated) {
      updateNodeData(node.id, node.data)
      migratedCount++
    }
  }
  
  console.log(`✅ 이미지 마이그레이션 완료: ${migratedCount}개 노드`)
}

/**
 * 전체 워크플로우의 이미지 복원
 */
export async function restoreAllImages(): Promise<void> {
  console.log('🔄 이미지 복원 시작...')
  
  const nodes = useFlowStore.getState().nodes
  const updateNodeData = useFlowStore.getState().updateNodeData
  
  let restoredCount = 0
  
  for (const node of nodes) {
    const updated = await restoreNodeImages(node)
    if (updated) {
      updateNodeData(node.id, node.data)
      restoredCount++
    }
  }
  
  console.log(`✅ 이미지 복원 완료: ${restoredCount}개 노드`)
}

/**
 * 자동 이미지 저장 Hook
 */
export function useImagePersistence() {
  const nodes = useFlowStore((state) => state.nodes)
  const isInitialMount = useRef(true)

  useEffect(() => {
    // 초기 마운트 시: 이미지 복원
    if (isInitialMount.current) {
      isInitialMount.current = false
      
      setTimeout(() => {
        restoreAllImages().catch((error) => {
          console.error('❌ 이미지 복원 실패:', error)
        })
      }, 1000) // 1초 후 복원 (UI 로드 후)
      
      return
    }

    // 노드 변경 시: 새 이미지를 IndexedDB로 마이그레이션
    const timer = setTimeout(() => {
      migrateAllImages().catch((error) => {
        console.error('❌ 이미지 마이그레이션 실패:', error)
      })
    }, 2000) // 2초 debounce

    return () => clearTimeout(timer)
  }, [nodes])
}
