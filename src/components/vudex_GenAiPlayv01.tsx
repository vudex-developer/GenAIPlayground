import { useState } from 'react'
import { Sparkles } from 'lucide-react'

type MotionPromptBuilderProps = {
  onPromptChange: (prompt: string) => void
}

const presets = {
  camera: [
    { label: 'Zoom In', value: 'slow zoom in' },
    { label: 'Zoom Out', value: 'smooth zoom out' },
    { label: 'Pan Left', value: 'camera pans left' },
    { label: 'Pan Right', value: 'camera pans right' },
    { label: 'Orbit', value: 'camera orbits around subject' },
    { label: 'Static', value: 'static camera' },
  ],
  motion: [
    { label: 'Gentle', value: 'gentle, subtle movement' },
    { label: 'Dynamic', value: 'dynamic, energetic movement' },
    { label: 'Flowing', value: 'smooth, flowing motion' },
    { label: 'Wind', value: 'wind blowing, leaves rustling' },
    { label: 'Water', value: 'water flowing, ripples forming' },
  ],
  lighting: [
    { label: 'Sunrise', value: 'sun rising, light gradually increasing' },
    { label: 'Sunset', value: 'golden hour light, sun setting' },
    { label: 'Clouds', value: 'clouds drifting across sky' },
    { label: 'Light Rays', value: 'light rays piercing through' },
    { label: 'Flicker', value: 'soft flickering light' },
  ],
}

export function MotionPromptBuilder({ onPromptChange }: MotionPromptBuilderProps) {
  const [prompt, setPrompt] = useState('')

  const handlePresetClick = (value: string) => {
    const nextPrompt = prompt ? `${prompt}, ${value}` : value
    setPrompt(nextPrompt)
    onPromptChange(nextPrompt)
  }

  const handlePromptChange = (value: string) => {
    setPrompt(value)
    onPromptChange(value)
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900">모션 프롬프트</h3>
      <textarea
        value={prompt}
        onChange={(event) => handlePromptChange(event.target.value)}
        placeholder="카메라 움직임과 장면 변화를 설명해 주세요."
        className="mt-4 h-32 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200"
      />

      <div className="mt-4 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-slate-500">카메라 무브먼트</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.camera.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-orange-100 hover:text-orange-700"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500">피사체 모션</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.motion.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-orange-100 hover:text-orange-700"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-slate-500">환경/조명</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {presets.lighting.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handlePresetClick(preset.value)}
                className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-orange-100 hover:text-orange-700"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-900">
        <Sparkles className="mr-2 inline h-4 w-4 text-blue-500" />
        구체적으로 묘사할수록 더 자연스러운 모션이 나와요.
      </div>
    </div>
  )
}
