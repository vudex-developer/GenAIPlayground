export interface SoraGenerationSettings {
  duration: 4 | 8 | 12
  resolution: '720x1280' | '1280x720' | '1024x1792' | '1792x1024'
  model?: 'sora-2' | 'sora-2-pro'
}

// OpenAI Sora API 클라이언트
export class SoraAPIClient {
  private apiKey: string
  private baseURL = 'https://api.openai.com/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateVideo(
    prompt: string,
    imageDataUrl?: string,
    settings?: SoraGenerationSettings,
  ): Promise<string> {
    // 1. 비디오 생성 작업 시작
    const videoId = await this.createVideo(prompt, imageDataUrl, settings)

    // 2. 폴링으로 완료 대기
    await this.pollVideoStatus(videoId)

    // 3. 비디오 다운로드
    const videoUrl = await this.downloadVideo(videoId)

    return videoUrl
  }

  private async createVideo(
    prompt: string,
    imageDataUrl?: string,
    settings?: SoraGenerationSettings,
  ): Promise<string> {
    const model = settings?.model || 'sora-2'
    const seconds = String(settings?.duration || 4)
    const size = settings?.resolution || '1280x720'

    // OpenAI Sora API는 multipart/form-data 형식 사용
    const formData = new FormData()
    formData.append('model', model)
    formData.append('prompt', prompt)
    formData.append('seconds', seconds)
    formData.append('size', size)

    // 이미지가 있으면 input_reference로 파일 첨부
    if (imageDataUrl) {
      const blob = await this.dataUrlToBlob(imageDataUrl)
      if (blob) {
        formData.append('input_reference', blob, 'reference.png')
      }
    }

    const response = await fetch(`${this.baseURL}/videos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        // Content-Type은 FormData가 자동으로 설정 (boundary 포함)
      },
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
      throw new Error(`Sora API error (${response.status}): ${error.error?.message || response.statusText}`)
    }

    const data = await response.json()
    return data.id
  }

  // Data URL을 Blob으로 변환
  private async dataUrlToBlob(dataUrl: string): Promise<Blob | null> {
    try {
      if (!dataUrl.startsWith('data:')) return null
      const response = await fetch(dataUrl)
      return await response.blob()
    } catch {
      console.error('❌ Failed to convert dataUrl to Blob')
      return null
    }
  }

  private async pollVideoStatus(videoId: string): Promise<void> {
    const maxAttempts = 90 // 최대 15분 (10초마다 체크)
    let attempts = 0

    while (attempts < maxAttempts) {
      const response = await fetch(`${this.baseURL}/videos/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to check video status')
      }

      const data = await response.json()
      const status = data.status

      if (status === 'completed') {
        return
      }

      if (status === 'failed') {
        throw new Error(data.error?.message || 'Video generation failed')
      }

      // queued, in_progress 상태: 10초 대기 후 재시도 (OpenAI 권장: 10~20초)
      await new Promise((resolve) => setTimeout(resolve, 10000))
      attempts++
    }

    throw new Error('Video generation timeout (15분 초과)')
  }

  private async downloadVideo(videoId: string): Promise<string> {
    const response = await fetch(`${this.baseURL}/videos/${videoId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to download video (${response.status})`)
    }

    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      })
      return response.ok
    } catch {
      return false
    }
  }
}

// Mock API (개발/테스트용)
export class MockSoraAPI {
  async generateVideo(
    prompt: string,
    _imageDataUrl?: string,
    settings?: SoraGenerationSettings,
  ): Promise<string> {
    console.log('🧪 Mock Sora API:', { prompt, settings })

    // 시뮬레이션: 5초 대기
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // 샘플 비디오 반환
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  }

  async checkAvailability(): Promise<boolean> {
    return true
  }
}
