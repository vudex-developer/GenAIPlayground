/**
 * Input validation utilities
 */

export const validation = {
  /**
   * Validate API key format
   */
  isValidApiKey: (key: string): boolean => {
    return key.trim().length > 0 && key.startsWith('AIza')
  },

  /**
   * Validate Kling API key format (AccessKey:SecretKey)
   */
  isValidKlingApiKey: (key: string): boolean => {
    if (!key.trim()) return true // Optional, so empty is valid
    return key.includes(':') && key.split(':').length === 2
  },

  /**
   * Validate prompt text
   */
  isValidPrompt: (prompt: string): boolean => {
    const trimmed = prompt.trim()
    return trimmed.length > 0 && trimmed.length <= 10000
  },

  /**
   * Validate image URL or data URL
   */
  isValidImageUrl: (url: string): boolean => {
    if (!url) return false
    return (
      url.startsWith('http://') ||
      url.startsWith('https://') ||
      url.startsWith('data:image/') ||
      url.startsWith('blob:')
    )
  },

  /**
   * Validate aspect ratio
   */
  isValidAspectRatio: (ratio: string): boolean => {
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9']
    return validRatios.includes(ratio)
  },

  /**
   * Validate resolution
   */
  isValidResolution: (resolution: string): boolean => {
    const validResolutions = ['1K', '2K', '4K']
    return validResolutions.includes(resolution)
  },

  /**
   * Sanitize text input
   */
  sanitizeText: (text: string): string => {
    return text.trim().slice(0, 10000)
  },

  /**
   * Get validation error message
   */
  getErrorMessage: (field: string, value: unknown): string | null => {
    switch (field) {
      case 'apiKey':
        if (typeof value !== 'string' || !validation.isValidApiKey(value)) {
          return 'Google Gemini API 키는 "AIza"로 시작해야 합니다.'
        }
        break
      case 'klingApiKey':
        if (typeof value === 'string' && value && !validation.isValidKlingApiKey(value)) {
          return 'Kling API 키는 "AccessKey:SecretKey" 형식이어야 합니다.'
        }
        break
      case 'prompt':
        if (typeof value !== 'string' || !validation.isValidPrompt(value)) {
          return '프롬프트를 입력해주세요 (최대 10,000자).'
        }
        break
      case 'imageUrl':
        if (typeof value !== 'string' || !validation.isValidImageUrl(value)) {
          return '유효한 이미지를 선택해주세요.'
        }
        break
    }
    return null
  }
}
