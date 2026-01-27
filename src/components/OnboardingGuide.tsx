import { useState, useEffect } from 'react'
import { X, Lightbulb, MousePointer, Play, Save } from 'lucide-react'

const ONBOARDING_KEY = 'nano-banana-onboarding-completed'

export const OnboardingGuide = () => {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY)
    if (!completed) {
      // Show after 1 second delay
      const timer = setTimeout(() => setShow(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true')
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-2xl rounded-xl border border-cyan-500/30 bg-[#0f141a] p-6 shadow-2xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-slate-400 hover:bg-white/5 hover:text-slate-200 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-cyan-500/10 p-3">
              <Lightbulb className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Gen AI Playground에 오신 것을 환영합니다! 🎮
              </h2>
              <p className="text-sm text-slate-400">
                AI 기반 이미지 & 비디오 생성 워크플로우 빌더
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 rounded-lg border border-white/10 bg-[#121824] p-4">
              <div className="flex items-center gap-2">
                <MousePointer className="h-5 w-5 text-violet-400" />
                <h3 className="font-semibold text-slate-100">1. 노드 추가</h3>
              </div>
              <p className="text-xs text-slate-400">
                좌측 팔레트에서 노드를 클릭하여 캔버스에 추가하고, 핸들을 드래그하여 연결하세요.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-white/10 bg-[#121824] p-4">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold text-slate-100">2. 실행</h3>
              </div>
              <p className="text-xs text-slate-400">
                노드를 클릭하여 우측 패널에서 설정 후 "실행" 버튼을 클릭하세요.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-white/10 bg-[#121824] p-4">
              <div className="flex items-center gap-2">
                <Save className="h-5 w-5 text-blue-400" />
                <h3 className="font-semibold text-slate-100">3. 저장/공유</h3>
              </div>
              <p className="text-xs text-slate-400">
                Export 버튼으로 워크플로우를 저장하고 팀원들과 공유하세요.
              </p>
            </div>

            <div className="space-y-2 rounded-lg border border-white/10 bg-[#121824] p-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-gradient-to-r from-yellow-400 to-yellow-500" />
                <h3 className="font-semibold text-slate-100">4. API 키</h3>
              </div>
              <p className="text-xs text-slate-400">
                우측 상단 "API Key" 버튼에서 Google Gemini API 키를 입력하세요.
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
            <h4 className="text-sm font-semibold text-cyan-400 mb-2">💡 빠른 시작</h4>
            <ul className="space-y-1 text-xs text-slate-300">
              <li>• <strong>이미지 생성:</strong> TextPrompt → Nano Banana</li>
              <li>• <strong>비디오 생성:</strong> ImageImport → MotionPrompt → Kling Video</li>
              <li>• <strong>단축키:</strong> ⌘Z (되돌리기), ⌘⇧Z (다시 실행)</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 transition"
          >
            시작하기
          </button>
        </div>
      </div>
    </div>
  )
}
