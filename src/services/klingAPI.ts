export interface KlingGenerationSettings {
  duration: 5 | 10
  aspectRatio: '16:9' | '9:16' | '1:1'
  model?: 'kling-v1-5' | 'kling-v1-6' | 'kling-v1-pro' | 'kling-v2-5' | 'kling-v2-6'
  endImageDataUrl?: string
  cameraControl?: {
    type: 'horizontal' | 'vertical' | 'pan' | 'tilt' | 'roll' | 'zoom'
    value: number
  }
}

// Kling AI API 클라이언트 (프록시 서버 경유)
export class KlingAPIClient {
  private accessKey: string
  private secretKey: string
  private proxyURL = 'http://localhost:3001/api/kling'

  constructor(apiKey: string) {
    // API 키 형식: "AccessKey:SecretKey" (JWT 생성에 둘 다 필요)
    if (apiKey.includes(':')) {
      const [access, secret] = apiKey.split(':')
      this.accessKey = access
      this.secretKey = secret
    } else {
      throw new Error('API 키는 "AccessKey:SecretKey" 형식이어야 합니다')
    }
  }

  private getModelName(model: string): string {
    const modelMap: Record<string, string> = {
      'kling-v1-5': 'kling-v1-5',
      'kling-v1-6': 'kling-v1-6',
      'kling-v1-pro': 'kling-v1-pro',
      'kling-v2-5': 'kling-v2-5',
      'kling-v2-6': 'kling-v2-6',
    }
    return modelMap[model] || 'kling-v1-6'
  }

  async generateVideo(
    prompt: string,
    imageDataUrl: string,
    settings: KlingGenerationSettings,
  ): Promise<string> {
    // 1. 비디오 생성 작업 시작
    const taskId = await this.createTask(prompt, imageDataUrl, settings)

    // 2. 폴링으로 완료 대기
    const videoUrl = await this.pollTaskStatus(taskId)

    return videoUrl
  }

  private async createTask(
    prompt: string,
    imageDataUrl: string,
    settings: KlingGenerationSettings,
  ): Promise<string> {
    try {
      // base64 데이터에서 실제 이미지 데이터만 추출
      const base64Data = imageDataUrl.split(',')[1]

      // End Image 처리
      const endImageBase64 = settings.endImageDataUrl 
        ? settings.endImageDataUrl.split(',')[1] 
        : ''

      // Camera Control 처리
      const advancedCameraControl = settings.cameraControl
        ? {
            movement_type: settings.cameraControl.type,
            // 🔄 Roll의 경우 부호 반전 (Kling API에서 양수=반시계, 음수=시계 방향)
            movement_value: settings.cameraControl.type === 'roll' 
              ? -settings.cameraControl.value 
              : settings.cameraControl.value,
          }
        : undefined

      // 프록시 서버로 요청
      const requestBody: any = {
        model_name: this.getModelName(settings.model || 'kling-v1'),
        image: base64Data,
        prompt: prompt,
        negative_prompt: 'blur, distort, and low quality',
        cfg_scale: 0.5,
        mode: 'std',
        duration: settings.duration.toString(),
        aspect_ratio: settings.aspectRatio,
      }

      // End Image가 있으면 추가
      if (endImageBase64) {
        requestBody.image_tail = endImageBase64
      }

      // Camera Control이 있으면 추가
      if (advancedCameraControl) {
        requestBody.advanced_camera_control = advancedCameraControl
      }

      const response = await fetch(`${this.proxyURL}/videos/image2video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessKey: this.accessKey,
          secretKey: this.secretKey,
          body: requestBody,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(`Kling API error (${response.status}): ${error.message || response.statusText}`)
      }

      const data = await response.json()
      
      // API 응답 구조: { code: 0, message: "string", request_id: "string", data: { task_id: "string" } }
      if (data.code !== 0) {
        throw new Error(data.message || 'Failed to create task')
      }

      return data.data.task_id
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        throw new Error('프록시 서버 연결 실패: http://localhost:3001 이 실행 중인지 확인하세요.')
      }
      throw error
    }
  }

  private async pollTaskStatus(taskId: string): Promise<string> {
    const maxAttempts = 120 // 최대 10분 (5초마다 체크)
    let attempts = 0

    while (attempts < maxAttempts) {
      // 프록시 서버로 요청
      const response = await fetch(`${this.proxyURL}/videos/image2video/${taskId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessKey: this.accessKey,
          secretKey: this.secretKey,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to check video status')
      }

      const data = await response.json()
      
      if (data.code !== 0) {
        throw new Error(data.message || 'Failed to get task status')
      }

      const taskStatus = data.data.task_status

      if (taskStatus === 'succeed') {
        // 비디오 URL 반환
        const videos = data.data.task_result?.videos
        if (videos && videos.length > 0) {
          return videos[0].url
        }
        throw new Error('Video URL not found in response')
      }

      if (taskStatus === 'failed') {
        throw new Error(data.data.task_status_msg || 'Video generation failed')
      }

      // 진행 중 상태: submitted, processing
      // 5초 대기 후 재시도
      await new Promise((resolve) => setTimeout(resolve, 5000))
      attempts++
    }

    throw new Error('Video generation timeout (10분 초과)')
  }

  async checkAvailability(): Promise<boolean> {
    try {
      // 프록시 서버 연결 확인
      const response = await fetch('http://localhost:3001/health')
      return response.ok
    } catch {
      return false
    }
  }
}

// Mock API (개발/테스트용)
export class MockKlingAPI {
  async generateVideo(
    prompt: string,
    _imageDataUrl: string,
    settings: KlingGenerationSettings,
  ): Promise<string> {
    console.log('🧪 Mock Kling API:', { prompt, settings })
    
    // 시뮬레이션: 5초 대기
    await new Promise((resolve) => setTimeout(resolve, 5000))
    
    // 샘플 비디오 반환
    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'
  }

  async checkAvailability(): Promise<boolean> {
    return true
  }
}
