import { useEffect, useRef } from 'react'

interface UseAutoSaveOptions {
  enabled?: boolean
  interval?: number // milliseconds
  onSave?: () => void
  onError?: (error: Error) => void
}

/**
 * Auto-save hook with debouncing
 */
export const useAutoSave = (
  data: unknown,
  options: UseAutoSaveOptions = {}
) => {
  const {
    enabled = true,
    interval = 30000, // 30 seconds
    onSave,
    onError
  } = options

  const savedDataRef = useRef<string | undefined>(undefined)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!enabled) return

    const save = () => {
      try {
        const serialized = JSON.stringify(data)
        
        // Only save if data has changed
        if (serialized === savedDataRef.current) {
          return
        }

        savedDataRef.current = serialized
        if (onSave) onSave()
      } catch (error) {
        if (onError) onError(error instanceof Error ? error : new Error(String(error)))
      }
    }

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }

    // Set up auto-save interval
    timerRef.current = window.setInterval(save, interval)

    // Save immediately on mount
    save()

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [data, enabled, interval, onSave, onError])
}
