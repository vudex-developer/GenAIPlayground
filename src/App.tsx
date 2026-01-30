import { useState, useEffect } from 'react'
import { ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'
import { Download, FolderOpen, Save, Settings, Undo2, Redo2, WifiOff, Shield, Database } from 'lucide-react'
import Canvas from './components/Canvas'
import { OnboardingGuide } from './components/OnboardingGuide'
import { useFlowStore } from './stores/flowStore'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useImagePersistence } from './hooks/useImagePersistence'
import { getStorageInfo, analyzeStorage, clearStorageByPattern } from './utils/storage'
import { getAllBackups, restoreBackup, getBackupStats } from './utils/backup'
import { getStorageStats as getIndexedDBStats } from './utils/indexedDB'
import type { WorkflowEdge, WorkflowNode } from './types/nodes'
import vudexLogo from './assets/vudex-logo.png'

function App() {
  const saveWorkflow = useFlowStore((state) => state.saveWorkflow)
  const loadWorkflow = useFlowStore((state) => state.loadWorkflow)
  const importWorkflow = useFlowStore((state) => state.importWorkflow)
  const exportWorkflow = useFlowStore((state) => state.exportWorkflow)
  const undo = useFlowStore((state) => state.undo)
  const redo = useFlowStore((state) => state.redo)
  const historyIndex = useFlowStore((state) => state.historyIndex)
  const history = useFlowStore((state) => state.history)
  const apiKey = useFlowStore((state) => state.apiKey)
  const setApiKey = useFlowStore((state) => state.setApiKey)
  const openaiApiKey = useFlowStore((state) => state.openaiApiKey)
  const setOpenaiApiKey = useFlowStore((state) => state.setOpenaiApiKey)
  const klingApiKey = useFlowStore((state) => state.klingApiKey)
  const setKlingApiKey = useFlowStore((state) => state.setKlingApiKey)
  const nodes = useFlowStore((state) => state.nodes)
  const edges = useFlowStore((state) => state.edges)
  const [showSettings, setShowSettings] = useState(false)
  const [showBackups, setShowBackups] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [idbStats, setIdbStats] = useState({ images: 0, videos: 0, totalSizeMB: '0' })
  const [s3Config, setS3Config] = useState({ available: false, region: '', bucket: '' })
  const isOnline = useNetworkStatus()
  
  // 🗄️ IndexedDB 자동 이미지 저장/복원
  useImagePersistence()
  
  // 📊 IndexedDB 통계 주기적 업데이트
  useEffect(() => {
    const updateIDBStats = async () => {
      try {
        const stats = await getIndexedDBStats()
        setIdbStats(stats)
      } catch (error) {
        console.error('❌ IndexedDB 통계 로드 실패:', error)
      }
    }
    
    updateIDBStats()
    const interval = setInterval(updateIDBStats, 10000) // 10초마다
    
    return () => clearInterval(interval)
  }, [])
  
  // ☁️ S3 설정 확인
  useEffect(() => {
    const checkS3Config = async () => {
      try {
        const { getS3Config } = await import('./utils/s3Client')
        const config = getS3Config()
        setS3Config(config)
      } catch (error) {
        console.error('❌ S3 설정 확인 실패:', error)
      }
    }
    
    checkS3Config()
  }, [])
  
  // 🧹 자동 정리 스케줄러 (매일 1회)
  useEffect(() => {
    const runCleanup = async () => {
      console.log('🧹 자동 정리 스케줄러 시작...')
      
      // 마지막 정리 시간 확인
      const lastCleanup = localStorage.getItem('last-cleanup-time')
      const now = Date.now()
      const dayInMs = 24 * 60 * 60 * 1000
      
      if (!lastCleanup || now - parseInt(lastCleanup) > dayInMs) {
        try {
          // IndexedDB 오래된 미디어 정리 (30일 이상)
          const { cleanupOldMedia } = await import('./utils/indexedDB')
          const cleaned = await cleanupOldMedia(30)
          
          if (cleaned > 0) {
            console.log(`✅ 오래된 미디어 ${cleaned}개 자동 정리됨`)
          }
          
          // localStorage 백업 정리 (7일 이상 오래된 백업만 유지)
          const backups = getAllBackups()
          const sevenDaysAgo = now - 7 * dayInMs
          let deletedBackups = 0
          
          backups.forEach(backup => {
            if (backup.timestamp < sevenDaysAgo) {
              localStorage.removeItem(backup.key)
              deletedBackups++
            }
          })
          
          if (deletedBackups > 0) {
            console.log(`✅ 오래된 백업 ${deletedBackups}개 삭제됨`)
          }
          
          // 정리 시간 기록
          localStorage.setItem('last-cleanup-time', now.toString())
          console.log('✅ 자동 정리 완료')
        } catch (error) {
          console.error('❌ 자동 정리 실패:', error)
        }
      } else {
        console.log('ℹ️ 자동 정리 스킵 (24시간 미경과)')
      }
    }
    
    // 앱 시작 5초 후 첫 정리 체크
    const initTimeout = setTimeout(runCleanup, 5000)
    
    // 이후 매 시간마다 체크 (24시간 지났는지 확인)
    const interval = setInterval(runCleanup, 60 * 60 * 1000) // 1시간마다
    
    return () => {
      clearTimeout(initTimeout)
      clearInterval(interval)
    }
  }, [])
  
  // 🔄 초기 로드: persist 미들웨어가 자동으로 복원하지만, 추가 안전장치
  useEffect(() => {
    console.log('🚀 App 마운트됨 - localStorage 확인...')
    
    // localStorage에 실제로 데이터가 있는지 확인
    const stored = localStorage.getItem('nano-banana-workflow-v3')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        console.log('📦 localStorage 데이터 발견:', {
          hasNodes: !!parsed.state?.nodes,
          nodeCount: parsed.state?.nodes?.length ?? 0,
          hasEdges: !!parsed.state?.edges,
          edgeCount: parsed.state?.edges?.length ?? 0,
        })
        
        // persist 미들웨어가 자동으로 복원하므로, 여기서는 확인만 함
        // 만약 persist가 실패했다면 수동으로 로드
        setTimeout(() => {
          const currentNodes = useFlowStore.getState().nodes
          if (currentNodes.length === 0 && parsed.state?.nodes?.length > 0) {
            console.warn('⚠️ persist 복원 실패 - 수동 로드 시도')
            loadWorkflow()
          }
        }, 100)
      } catch (error) {
        console.error('❌ localStorage 파싱 실패:', error)
      }
    } else {
      console.log('ℹ️ localStorage에 저장된 데이터 없음 (새 시작)')
    }
  }, [loadWorkflow]) // loadWorkflow만 의존성으로
  
  // 🔄 persist 미들웨어가 자동으로 저장하므로, 백업만 주기적으로 생성
  useEffect(() => {
    const backupInterval = setInterval(() => {
      saveWorkflow() // 백업 생성 (5분마다 한 번씩만 실제 생성)
      console.log('🔄 백업 체크 완료')
    }, 60000) // 1분마다 체크 (실제 백업은 5분마다)
    
    return () => clearInterval(backupInterval)
  }, [saveWorkflow])

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault()
        undo()
        setSaveStatus('되돌리기')
        setTimeout(() => setSaveStatus(''), 1000)
      }
      // Cmd+Shift+Z (Mac) or Ctrl+Shift+Z (Windows/Linux)
      else if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault()
        redo()
        setSaveStatus('다시 실행')
        setTimeout(() => setSaveStatus(''), 1000)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  const normalizeNodesForFile = (items: WorkflowNode[]) =>
    items.map((node) => {
      const data = { ...(node.data as Record<string, unknown>) }
      const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : ''
      const outputImageUrl =
        typeof data.outputImageUrl === 'string' ? data.outputImageUrl : ''
      const outputVideoUrl =
        typeof data.outputVideoUrl === 'string' ? data.outputVideoUrl : ''

      if (data.imageDataUrl && !imageUrl) {
        data.imageUrl = data.imageDataUrl
      }
      if (data.outputImageDataUrl && !outputImageUrl) {
        data.outputImageUrl = data.outputImageDataUrl
      }
      if (outputVideoUrl.startsWith('blob:')) {
        delete data.outputVideoUrl
      }
      return { ...node, data: data as WorkflowNode['data'] }
    })

  return (
    <div className="flex h-screen flex-col bg-[#0b0f14] text-slate-100">
      <header className="flex h-14 items-center justify-between border-b border-white/10 bg-[#0f141a]/95 px-5 backdrop-blur">
        <div className="flex items-end gap-3">
          <img 
            src={vudexLogo} 
            alt="VUDEX" 
            className="h-6 object-contain"
            style={{ filter: 'brightness(0) saturate(100%) invert(66%) sepia(88%) saturate(2098%) hue-rotate(163deg) brightness(103%) contrast(101%)' }}
          />
          <span className="text-[10px] font-light text-slate-400 tracking-wider leading-none" style={{ marginBottom: '2px' }}>
            GEN AI PLAYGROUND v0.1
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              undo()
              setSaveStatus('되돌리기')
              setTimeout(() => setSaveStatus(''), 1000)
            }}
            disabled={!canUndo}
            className={`rounded-full border border-white/10 bg-[#121824] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition ${
              canUndo ? 'hover:bg-white/5' : 'opacity-40 cursor-not-allowed'
            }`}
            title="되돌리기 (⌘Z)"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              redo()
              setSaveStatus('다시 실행')
              setTimeout(() => setSaveStatus(''), 1000)
            }}
            disabled={!canRedo}
            className={`rounded-full border border-white/10 bg-[#121824] px-3 py-1.5 text-[11px] font-semibold text-slate-200 transition ${
              canRedo ? 'hover:bg-white/5' : 'opacity-40 cursor-not-allowed'
            }`}
            title="다시 실행 (⌘⇧Z)"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <div className="w-px h-6 bg-white/10" />
          <button
            type="button"
            onClick={() => {
              const ok = saveWorkflow()
              setSaveStatus(ok ? '저장됨' : '저장 실패')
              setTimeout(() => setSaveStatus(''), 1500)
            }}
            className="rounded-full border border-white/10 bg-[#121824] px-4 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/5"
          >
            <span className="flex items-center gap-1">
              <Save className="h-4 w-4" />
              Save
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              try {
                const json = exportWorkflow()
                const blob = new Blob([json], {
                  type: 'application/json',
                })
                const url = URL.createObjectURL(blob)
                const link = document.createElement('a')
                link.href = url
                const date = new Date().toISOString().split('T')[0]
                link.download = `nano-banana-workflow-${date}.json`
                link.click()
                URL.revokeObjectURL(url)
                setSaveStatus('파일 저장됨')
              } catch {
                setSaveStatus('파일 저장 실패')
              } finally {
                setTimeout(() => setSaveStatus(''), 1500)
              }
            }}
            className="rounded-full border border-white/10 bg-[#121824] px-4 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/5"
            title="Export"
          >
            <span className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              Export
            </span>
          </button>
          <label className="cursor-pointer rounded-full border border-white/10 bg-[#121824] px-4 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/5" title="Import">
            <span className="flex items-center gap-1">
              <FolderOpen className="h-4 w-4" />
              Import
            </span>
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                const reader = new FileReader()
                reader.onload = () => {
                  try {
                    const text = String(reader.result ?? '')
                    const parsed = JSON.parse(text) as {
                      nodes?: WorkflowNode[]
                      edges?: WorkflowEdge[]
                    }
                    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
                      setSaveStatus('파일 형식 오류')
                      return
                    }
                    const ok = importWorkflow(
                      normalizeNodesForFile(parsed.nodes),
                      parsed.edges,
                    )
                    setSaveStatus(ok ? `${parsed.nodes?.length ?? 0}개 노드 추가됨` : '파일 불러오기 실패')
                  } catch {
                    setSaveStatus('파일 읽기 실패')
                  } finally {
                    setTimeout(() => setSaveStatus(''), 1500)
                  }
                }
                reader.readAsText(file)
                event.currentTarget.value = ''
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => setShowBackups(true)}
            className="rounded-full border border-white/10 bg-[#121824] px-4 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/5"
            title="백업 관리"
          >
            <span className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              Backup
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="rounded-full border border-white/10 bg-[#121824] px-4 py-1.5 text-[11px] font-semibold text-slate-200 hover:bg-white/5"
          >
            <span className="flex items-center gap-1">
              <Settings className="h-4 w-4" />
              API Key
            </span>
          </button>
          {saveStatus ? (
            <div className="ml-2 text-[11px] text-slate-400">{saveStatus}</div>
          ) : null}
        </div>
      </header>

      {!isOnline && (
        <div className="flex items-center justify-center gap-2 bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 text-yellow-400">
          <WifiOff className="h-4 w-4" />
          <span className="text-xs font-medium">
            오프라인 모드 - 인터넷 연결을 확인해주세요
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1">
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        </main>
      </div>

      {showBackups ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl space-y-4 rounded-xl bg-[#111821] p-5 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-400" />
                  자동 백업 관리
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  5분마다 자동으로 백업이 생성됩니다 (최대 3개 유지)
                </p>
              </div>
            </div>

            {(() => {
              const backups = getAllBackups()
              const stats = getBackupStats()

              if (backups.length === 0) {
                return (
                  <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-8 text-center">
                    <Shield className="mx-auto h-12 w-12 text-slate-600" />
                    <p className="mt-4 text-sm text-slate-400">아직 백업이 없습니다</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Save 버튼을 누르면 자동으로 백업이 생성됩니다
                    </p>
                  </div>
                )
              }

              return (
                <>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-slate-400">총 백업</div>
                        <div className="text-lg font-bold text-emerald-400">{stats.count}개</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">최신 백업</div>
                        <div className="text-xs font-semibold text-slate-300">
                          {stats.latest ? new Date(stats.latest).toLocaleTimeString('ko-KR') : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">용량</div>
                        <div className="text-xs font-semibold text-slate-300">{stats.totalSize}</div>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {backups.map((backup) => (
                      <div
                        key={backup.timestamp}
                        className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3 hover:border-slate-600 transition"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-slate-200">
                            {new Date(backup.timestamp).toLocaleString('ko-KR')}
                          </div>
                          <div className="mt-1 text-xs text-slate-400">
                            노드: {backup.nodeCount}개 / 연결: {backup.edgeCount}개
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm('이 백업으로 복원하시겠습니까?\n\n현재 작업 내용은 유실될 수 있습니다.')) {
                              const data = restoreBackup(backup.timestamp)
                              if (data) {
                                const parsed = JSON.parse(data)
                                importWorkflow(parsed.nodes || [], parsed.edges || [])
                                setSaveStatus('백업 복원됨')
                                setTimeout(() => setSaveStatus(''), 2000)
                                setShowBackups(false)
                              } else {
                                alert('백업 복원에 실패했습니다')
                              }
                            }
                          }}
                          className="rounded-md bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/30 transition"
                        >
                          복원
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBackups(false)}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showSettings ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-[#111821] p-5 shadow-lg">
            {/* 워크플로우 통계 */}
            {(() => {
              const nodeCount = nodes.length
              const edgeCount = edges.length
              const isWarning = nodeCount > 50
              const isCritical = nodeCount > 100
              
              return (
                <div className={`rounded-lg border px-4 py-3 ${
                  isCritical ? 'border-red-500/30 bg-red-500/5' :
                  isWarning ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-emerald-500/20 bg-emerald-500/5'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-slate-100">
                      📊 워크플로우 통계
                    </div>
                    <div className={`text-xs font-bold ${
                      isCritical ? 'text-red-400' :
                      isWarning ? 'text-yellow-400' :
                      'text-emerald-400'
                    }`}>
                      {nodeCount}개 노드
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    🔗 연결: {edgeCount}개
                  </div>
                  {isCritical && (
                    <div className="mt-2 text-[10px] text-red-400">
                      ⚠️ 노드가 너무 많습니다! (100개 초과)<br/>
                      워크플로우를 분리하거나 Export로 백업 후 정리하세요.
                    </div>
                  )}
                  {isWarning && !isCritical && (
                    <div className="mt-2 text-[10px] text-yellow-400">
                      💡 노드가 많습니다 (50개 초과)<br/>
                      성능을 위해 사용하지 않는 노드를 삭제하세요.
                    </div>
                  )}
                  {!isWarning && (
                    <div className="mt-2 text-[10px] text-emerald-300">
                      ✅ 최적의 노드 개수입니다
                    </div>
                  )}
                </div>
              )
            })()}

            {/* AWS S3 저장공간 정보 */}
            {s3Config.available ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-emerald-400" />
                    <div className="text-xs font-semibold text-slate-100">
                      AWS S3 (클라우드)
                    </div>
                  </div>
                  <div className="text-xs font-bold text-emerald-400">
                    ✅ 활성화
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  🌎 Region: {s3Config.region} | 📦 Bucket: {s3Config.bucket}
                </div>
                <div className="mt-2 text-[10px] text-emerald-300">
                  ☁️ 모든 미디어가 AWS S3에 자동 업로드됩니다
                </div>
                <div className="mt-1 text-[10px] text-slate-400">
                  💾 IndexedDB는 오프라인 캐시로 사용됩니다
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-400" />
                    <div className="text-xs font-semibold text-slate-100">
                      IndexedDB (브라우저)
                    </div>
                  </div>
                  <div className="text-xs font-bold text-blue-400">
                    {idbStats.totalSizeMB} MB
                  </div>
                </div>
                <div className="text-[10px] text-slate-400">
                  📸 이미지: {idbStats.images}개 | 🎬 비디오: {idbStats.videos}개
                </div>
                <div className="mt-2 text-[10px] text-blue-300">
                  💡 AWS 설정을 추가하면 무제한 클라우드 저장소를 사용할 수 있습니다
                </div>
                {idbStats.images + idbStats.videos > 50 && (
                  <div className="mt-2 text-[10px] text-yellow-400">
                    ⚠️ 오래된 미디어는 30일 후 자동 삭제됩니다
                  </div>
                )}
              </div>
            )}

            {/* localStorage 저장공간 정보 */}
            {(() => {
              const storageInfo = getStorageInfo()
              const isWarning = storageInfo.percentage > 70
              const isCritical = storageInfo.percentage > 90
              
              return (
                <div className={`rounded-lg border px-4 py-3 ${
                  isCritical ? 'border-red-500/30 bg-red-500/5' :
                  isWarning ? 'border-yellow-500/30 bg-yellow-500/5' :
                  'border-blue-500/20 bg-blue-500/5'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-semibold text-slate-100">
                      💾 저장공간 사용량
                    </div>
                    <div className={`text-xs font-bold ${
                      isCritical ? 'text-red-400' :
                      isWarning ? 'text-yellow-400' :
                      'text-blue-400'
                    }`}>
                      {storageInfo.percentage.toFixed(1)}%
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative h-2 w-full rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isCritical ? 'bg-red-500' :
                        isWarning ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(storageInfo.percentage, 100)}%` }}
                    />
                  </div>
                  
                  <div className="mt-2 text-[10px] text-slate-400">
                    {storageInfo.usedMB} MB / {storageInfo.limitMB} MB 사용 중
                  </div>
                  
                  {isCritical && (
                    <div className="mt-2 text-[10px] text-red-400">
                      ⚠️ 저장공간이 거의 가득 찼습니다! 오래된 이미지가 자동으로 정리됩니다.
                    </div>
                  )}
                  
                  {isWarning && !isCritical && (
                    <div className="mt-2 text-[10px] text-yellow-400">
                      ⚠️ 저장공간이 부족합니다. Export로 백업을 권장합니다.
                    </div>
                  )}
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm('브라우저 저장소를 정리하시겠습니까?\n\n주의: 모든 이미지 데이터가 삭제됩니다. 먼저 Export로 백업하세요!')) {
                        clearStorageByPattern('nano-banana')
                        window.location.reload()
                      }
                    }}
                    className="mt-2 w-full rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-semibold text-red-400 hover:bg-red-500/20"
                  >
                    🗑️ 저장소 정리 (위험!)
                  </button>
                </div>
              )
            })()}
            
            <div>
              <div className="text-sm font-semibold text-slate-100">
                🔵 Google Gemini API Key
              </div>
              <p className="mt-1 text-xs text-slate-400">
                이미지 생성 (Nano Image), 비디오 생성 (Gemini Video), LLM Prompt Helper에 사용됩니다.
              </p>
              <input
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="AIza..."
                className="mt-3 w-full rounded-md border border-white/10 bg-[#0b1117] px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200/60"
              />
            </div>
            
            <div>
              <div className="text-sm font-semibold text-slate-100">
                🟢 OpenAI API Key
              </div>
              <p className="mt-1 text-xs text-slate-400">
                LLM Prompt Helper에서 GPT-4o, GPT-4o-mini 등 OpenAI 모델 사용시 필요합니다.
                <br />
                <a 
                  href="https://platform.openai.com/api-keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  OpenAI에서 API 키 발급받기 →
                </a>
              </p>
              <input
                type="password"
                value={openaiApiKey}
                onChange={(event) => setOpenaiApiKey(event.target.value)}
                placeholder="sk-proj-..."
                className="mt-3 w-full rounded-md border border-white/10 bg-[#0b1117] px-3 py-2 text-sm text-slate-100 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200/60"
              />
            </div>
            
            <div>
              <div className="text-sm font-semibold text-slate-100">
                🎬 Kling AI API Key
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Access Key와 Secret Key를 콜론(:)으로 구분해서 입력하세요.
                <br />
                형식: <code className="text-blue-400">AccessKey:SecretKey</code>
                <br />
                <a 
                  href="https://app.klingai.com/global/dev/api-key" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline"
                >
                  Kling AI에서 API 키 발급받기 →
                </a>
                <br />
                비워두면 Mock 모드로 동작합니다.
              </p>
              <input
                type="password"
                value={klingApiKey}
                onChange={(event) => setKlingApiKey(event.target.value)}
                placeholder="AccessKey:SecretKey"
                className="mt-3 w-full rounded-md border border-white/10 bg-[#0b1117] px-3 py-2 text-sm text-slate-100 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200/60"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <OnboardingGuide />
    </div>
  )
}

export default App
