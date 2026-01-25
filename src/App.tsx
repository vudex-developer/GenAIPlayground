import { useState, useEffect } from 'react'
import { ReactFlowProvider } from 'reactflow'
import 'reactflow/dist/style.css'
import { Download, FolderOpen, Save, Settings, Undo2, Redo2 } from 'lucide-react'
import Canvas from './components/Canvas'
import { useFlowStore } from './stores/flowStore'
import type { WorkflowEdge, WorkflowNode } from './types/nodes'
import vudexLogo from './assets/vudex-logo.png'

function App() {
  const saveWorkflow = useFlowStore((state) => state.saveWorkflow)
  const importWorkflow = useFlowStore((state) => state.importWorkflow)
  const exportWorkflow = useFlowStore((state) => state.exportWorkflow)
  const undo = useFlowStore((state) => state.undo)
  const redo = useFlowStore((state) => state.redo)
  const historyIndex = useFlowStore((state) => state.historyIndex)
  const history = useFlowStore((state) => state.history)
  const apiKey = useFlowStore((state) => state.apiKey)
  const setApiKey = useFlowStore((state) => state.setApiKey)
  const klingApiKey = useFlowStore((state) => state.klingApiKey)
  const setKlingApiKey = useFlowStore((state) => state.setKlingApiKey)
  const [showSettings, setShowSettings] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')

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
                    setSaveStatus(ok ? '파일 불러옴' : '파일 불러오기 실패')
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

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1">
          <ReactFlowProvider>
            <Canvas />
          </ReactFlowProvider>
        </main>
      </div>

      {showSettings ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md space-y-4 rounded-xl bg-[#111821] p-5 shadow-lg">
            <div>
              <div className="text-sm font-semibold text-slate-100">
                Google Gemini API Key
              </div>
              <p className="mt-1 text-xs text-slate-400">
                이미지 생성 (Nano Image)과 비디오 생성 (Gemini Video)에 사용됩니다.
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
                Kling AI API Key
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
    </div>
  )
}

export default App
