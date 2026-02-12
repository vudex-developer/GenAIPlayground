type MediaType = 'image' | 'video'

export type GenerationSettings = {
  mediaType: MediaType
  aspectRatio?: '16:9' | '9:16' | '1:1'
  duration?: 5 | 10
  quality?: 'standard' | 'high'
  motionIntensity?: 'low' | 'medium' | 'high'
}

type InlineImagePayload = {
  mimeType: string
  bytesBase64Encoded: string
}

const DEFAULT_VIDEO_MODEL = 'veo-3.1-generate-preview'
const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview'
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

const parseDataUrl = (dataUrl: string): InlineImagePayload | null => {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], bytesBase64Encoded: match[2] }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const extractVideoUri = (result: Record<string, any>): string | undefined => {
  const candidates = [
    result?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri,
    result?.response?.generateVideoResponse?.generatedSamples?.[0]?.videoUri,
    result?.response?.generateVideoResponse?.generatedVideos?.[0]?.video?.uri,
    result?.response?.generateVideoResponse?.generatedVideos?.[0]?.uri,
    result?.response?.generatedSamples?.[0]?.video?.uri,
    result?.response?.generatedSamples?.[0]?.videoUri,
    result?.response?.generatedVideos?.[0]?.video?.uri,
    result?.response?.generatedVideos?.[0]?.uri,
    result?.response?.videoUris?.[0],
    result?.response?.videoUri,
    result?.response?.outputs?.[0]?.video?.uri,
  ]
  const direct = candidates.find((value) => typeof value === 'string' && value.length > 0)
  if (direct) return direct

  const parts = result?.response?.candidates?.[0]?.content?.parts
  if (Array.isArray(parts)) {
    const filePart = parts.find(
      (part) => part?.fileData?.fileUri || part?.fileData?.uri || part?.inlineData?.fileUri,
    )
    const fileUri = filePart?.fileData?.fileUri || filePart?.fileData?.uri || filePart?.inlineData?.fileUri
    if (typeof fileUri === 'string' && fileUri.length > 0) return fileUri
  }

  return undefined
}

const mapDuration = (duration?: 5 | 10) => {
  if (!duration) return undefined
  return duration === 5 ? 6 : 8
}

export class GeminiAPIClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async generateMedia(
    prompt: string,
    settings: GenerationSettings,
    sourceImageDataUrl?: string,
    model: string = DEFAULT_VIDEO_MODEL,
    abortSignal?: AbortSignal,
  ): Promise<string> {
    if (settings.mediaType !== 'video') {
      throw new Error('Veo 모델은 video 생성 전용입니다.')
    }

    const enhancedPrompt = this.enhancePrompt(prompt, settings)
    const instance: Record<string, unknown> = { prompt: enhancedPrompt }

    if (sourceImageDataUrl) {
      const inlineData = parseDataUrl(sourceImageDataUrl)
      if (inlineData) {
        instance.image = inlineData
      }
    }

    const parameters: Record<string, unknown> = {}
    const durationSeconds = mapDuration(settings.duration)
    if (durationSeconds) {
      parameters.durationSeconds = durationSeconds
    }
    if (settings.aspectRatio && settings.aspectRatio !== '1:1') {
      parameters.aspectRatio = settings.aspectRatio
    }

    const response = await fetch(
      `${BASE_URL}/models/${model}:predictLongRunning?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [instance],
          parameters: Object.keys(parameters).length ? parameters : undefined,
        }),
        signal: abortSignal,
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Veo 요청 실패: ${errorText}`)
    }

    const operation = (await response.json()) as { name?: string }
    if (!operation.name) {
      throw new Error('Veo 작업 ID를 받지 못했습니다.')
    }

    const videoUri = await this.pollOperation(operation.name, abortSignal)
    return this.downloadVideo(videoUri, abortSignal)
  }

  async generateImage(
    prompt: string,
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '3:2' | '2:3' | '5:4' | '4:5',
    sourceImageDataUrl?: string,
    model: string = DEFAULT_IMAGE_MODEL,
    imageSize?: '1K' | '2K' | '4K',
    abortSignal?: AbortSignal,
    additionalImages?: string[],
  ): Promise<{ imageUrl: string; imageDataUrl: string }> {
    const enhancedPrompt = aspectRatio
      ? `${prompt}, aspect ratio ${aspectRatio}`
      : prompt

    const parts: Array<{
      text?: string
      inlineData?: { mimeType: string; data: string }
    }> = [{ text: enhancedPrompt }]

    // 추가 이미지들 (캐릭터 참조 등) 먼저 추가
    if (additionalImages && additionalImages.length > 0) {
      for (const imgDataUrl of additionalImages) {
        const inlineData = parseDataUrl(imgDataUrl)
        if (inlineData) {
          parts.unshift({
            inlineData: { mimeType: inlineData.mimeType, data: inlineData.bytesBase64Encoded },
          })
        }
      }
      console.log(`📸 Gemini API: ${additionalImages.length}개 추가 참조 이미지 포함`)
    }

    if (sourceImageDataUrl) {
      const inlineData = parseDataUrl(sourceImageDataUrl)
      if (inlineData) {
        parts.unshift({
          inlineData: { mimeType: inlineData.mimeType, data: inlineData.bytesBase64Encoded },
        })
      }
    }

    const imageConfig: Record<string, string> = {}
    if (aspectRatio) {
      imageConfig.aspectRatio = aspectRatio
    }
    if (model === 'gemini-3-pro-image-preview' && imageSize) {
      imageConfig.imageSize = imageSize
    }

    // ⏱️ 타임아웃 설정 (2분)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('이미지 생성 시간 초과 (2분). 다시 시도해주세요.')), 120000)
    })

    const fetchPromise = fetch(
      `${BASE_URL}/models/${model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts,
            },
          ],
          generationConfig: {
            responseModalities: ['image'],
            imageConfig: Object.keys(imageConfig).length ? imageConfig : undefined,
          },
        }),
        signal: abortSignal,
      },
    )

    const response = await Promise.race([fetchPromise, timeoutPromise])

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nano Image 요청 실패: ${errorText}`)
    }

    const result = await response.json()
    
    // 🔍 DEBUG: API 응답 전체 구조 확인
    console.log('🔍 [Gemini API] Full response structure:', JSON.stringify(result, null, 2))
    console.log('🔍 [Gemini API] Response keys:', Object.keys(result))
    if (result.candidates) {
      console.log('🔍 [Gemini API] Number of candidates:', result.candidates.length)
    }
    if (result.generatedImages) {
      console.log('🔍 [Gemini API] Number of generatedImages:', result.generatedImages.length)
    }
    
    const extractImagePayload = (
      response: Record<string, unknown>,
    ): { mimeType: string; data: string } | null => {
      const candidateParts = (response as {
        candidates?: Array<{
          content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string; bytesBase64Encoded?: string } }> }
        }>
      })?.candidates?.[0]?.content?.parts

      const inline = candidateParts?.find((item) =>
        item.inlineData?.mimeType?.startsWith('image/'),
      )?.inlineData

      if (inline?.mimeType && (inline.data || inline.bytesBase64Encoded)) {
        return {
          mimeType: inline.mimeType,
          data: inline.data ?? inline.bytesBase64Encoded ?? '',
        }
      }

      const generated = (response as {
        generatedImages?: Array<{ image?: { imageBytes?: string; bytesBase64Encoded?: string; mimeType?: string } }>
      })?.generatedImages?.[0]?.image

      if (generated?.mimeType && (generated.imageBytes || generated.bytesBase64Encoded)) {
        return {
          mimeType: generated.mimeType,
          data: generated.imageBytes ?? generated.bytesBase64Encoded ?? '',
        }
      }

      const nestedGenerated = (response as {
        response?: { generatedImages?: Array<{ image?: { imageBytes?: string; bytesBase64Encoded?: string; mimeType?: string } }> }
      })?.response?.generatedImages?.[0]?.image

      if (
        nestedGenerated?.mimeType &&
        (nestedGenerated.imageBytes || nestedGenerated.bytesBase64Encoded)
      ) {
        return {
          mimeType: nestedGenerated.mimeType,
          data: nestedGenerated.imageBytes ?? nestedGenerated.bytesBase64Encoded ?? '',
        }
      }

      return null
    }

    const payload = extractImagePayload(result)
    if (!payload) {
      throw new Error('이미지 데이터가 응답에 없습니다.')
    }

    const mimeType = payload.mimeType || 'image/png'
    const data = payload.data
    if (!data) {
      throw new Error('이미지 base64 데이터가 없습니다.')
    }

    const imageDataUrl = `data:${mimeType};base64,${data}`
    return { imageUrl: imageDataUrl, imageDataUrl }
  }

  async checkAvailability(): Promise<boolean> {
    try {
      await fetch(`${BASE_URL}/models/${DEFAULT_VIDEO_MODEL}?key=${this.apiKey}`)
      return true
    } catch {
      return false
    }
  }

  private async pollOperation(operationName: string, abortSignal?: AbortSignal): Promise<string> {
    const maxAttempts = 60 // 60 * 10초 = 10분
    
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      // Check if aborted before waiting
      if (abortSignal?.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }
      
      // 진행 상황 로그
      const elapsedMinutes = Math.floor((attempt * 10) / 60)
      const elapsedSeconds = (attempt * 10) % 60
      console.log(`🎬 Gemini Video 진행 중... ${elapsedMinutes}분 ${elapsedSeconds}초 (${attempt + 1}/${maxAttempts})`)
      
      await sleep(10000) // 10초 대기
      
      // Check if aborted after waiting
      if (abortSignal?.aborted) {
        throw new Error('작업이 취소되었습니다.')
      }
      
      const response = await fetch(`${BASE_URL}/${operationName}?key=${this.apiKey}`, {
        signal: abortSignal,
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Veo 상태 확인 실패:', errorText)
        throw new Error(`Veo 상태 확인 실패: ${errorText}`)
      }
      
      const result = await response.json()
      
      if (result.error?.message) {
        throw new Error(`Veo 작업 실패: ${result.error.message}`)
      }

      if (result.response?.error?.message) {
        throw new Error(`Veo 작업 실패: ${result.response.error.message}`)
      }

      if (result.done) {
        console.log('🔍 Gemini LRO done. Full result:', JSON.stringify(result, null, 2))
        const uri = extractVideoUri(result)
        if (!uri) {
          console.error('❌ 비디오 URI 없음. 응답 구조:')
          console.error('result.response:', result.response)
          console.error('Full result:', result)
          
          // Check for safety/filter blocks
          const blockReason = 
            result?.response?.promptFeedback?.blockReason ||
            result?.response?.candidates?.[0]?.finishReason ||
            'UNKNOWN'
          
          if (blockReason && blockReason !== 'STOP' && blockReason !== 'UNKNOWN') {
            throw new Error(`비디오 생성이 차단되었습니다 (${blockReason}). 프롬프트나 이미지를 변경해주세요.`)
          }
          
          throw new Error('비디오 URI를 찾지 못했습니다. Gemini API 응답 포맷이 변경되었을 수 있습니다. 콘솔을 확인해주세요.')
        }
        console.log('✅ 비디오 생성 완료! URI:', uri)
        return uri
      }
      
      // 진행 상태가 있다면 로그
      if (result.metadata) {
        console.log('📊 상태:', result.metadata)
      }
    }
    
    console.error('⏱️ 타임아웃: 10분 초과')
    throw new Error('Veo 비디오 생성이 10분을 초과했습니다. API 키를 확인하거나 나중에 다시 시도해주세요.')
  }

  private async downloadVideo(uri: string, abortSignal?: AbortSignal): Promise<string> {
    const response = await fetch(uri, {
      headers: { 'x-goog-api-key': this.apiKey },
      signal: abortSignal,
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`비디오 다운로드 실패: ${errorText}`)
    }
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  private enhancePrompt(prompt: string, settings: GenerationSettings): string {
    let enhanced = `Generate a smooth video: ${prompt}`
    if (settings.duration) {
      enhanced += `, duration ${settings.duration} seconds`
    }
    if (settings.motionIntensity) {
      enhanced += `, motion intensity ${settings.motionIntensity}`
    }
    if (settings.aspectRatio) {
      enhanced += `, aspect ratio ${settings.aspectRatio}`
    }
    enhanced += ', cinematic camera movement, high quality'
    return enhanced
  }
}

export class MockGeminiAPI {
  async generateMedia(
    prompt: string,
    settings: GenerationSettings,
    _sourceImageDataUrl?: string,
    _model?: string,
  ): Promise<string> {
    if (!prompt.trim()) {
      throw new Error('Prompt is empty')
    }

    await this.delay(2500)

    if (settings.mediaType === 'image') {
      return `https://picsum.photos/1024/1024?random=${Date.now()}`
    }

    return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
  }

  async generateImage(
    prompt: string,
    _aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '3:2' | '2:3' | '5:4' | '4:5',
    sourceImageDataUrl?: string,
    _model?: string,
    _imageSize?: '1K' | '2K' | '4K',
  ): Promise<{ imageUrl: string; imageDataUrl: string }> {
    if (!prompt.trim()) {
      throw new Error('Prompt is empty')
    }
    await this.delay(1500)
    
    // If source image is provided, return it as-is (for testing)
    if (sourceImageDataUrl && sourceImageDataUrl.startsWith('data:')) {
      return { imageUrl: sourceImageDataUrl, imageDataUrl: sourceImageDataUrl }
    }
    
    // Otherwise return a placeholder
    const url = `https://picsum.photos/1024/1024?random=${Date.now()}`
    return { imageUrl: url, imageDataUrl: url }
  }

  async checkAvailability(): Promise<boolean> {
    return true
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
