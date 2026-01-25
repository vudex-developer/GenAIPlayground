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

    const videoUri = await this.pollOperation(operation.name)
    return this.downloadVideo(videoUri)
  }

  async generateImage(
    prompt: string,
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '21:9' | '3:2' | '2:3' | '5:4' | '4:5',
    sourceImageDataUrl?: string,
    model: string = DEFAULT_IMAGE_MODEL,
    imageSize?: '1K' | '2K' | '4K',
  ): Promise<{ imageUrl: string; imageDataUrl: string }> {
    const enhancedPrompt = aspectRatio
      ? `${prompt}, aspect ratio ${aspectRatio}`
      : prompt

    const parts: Array<{
      text?: string
      inlineData?: { mimeType: string; data: string }
    }> = [{ text: enhancedPrompt }]

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

    const response = await fetch(
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
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Nano Image 요청 실패: ${errorText}`)
    }

    const result = await response.json()
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

  private async pollOperation(operationName: string): Promise<string> {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      await sleep(10000)
      const response = await fetch(`${BASE_URL}/${operationName}?key=${this.apiKey}`)
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Veo 상태 확인 실패: ${errorText}`)
      }
      const result = await response.json()
      if (result.done) {
        const uri =
          result?.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
        if (!uri) {
          throw new Error('비디오 URI를 찾지 못했습니다.')
        }
        return uri
      }
    }
    throw new Error('Veo 비디오 생성이 제한 시간 내 완료되지 않았습니다.')
  }

  private async downloadVideo(uri: string): Promise<string> {
    const response = await fetch(uri, {
      headers: { 'x-goog-api-key': this.apiKey },
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
    _sourceImageDataUrl?: string,
    _model?: string,
    _imageSize?: '1K' | '2K' | '4K',
  ): Promise<{ imageUrl: string; imageDataUrl: string }> {
    if (!prompt.trim()) {
      throw new Error('Prompt is empty')
    }
    await this.delay(1500)
    const url = `https://picsum.photos/1024/1024?random=${Date.now()}`
    return { imageUrl: url, imageDataUrl: '' }
  }

  async checkAvailability(): Promise<boolean> {
    return true
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
