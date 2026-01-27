import { useState, useRef, useEffect } from 'react'

/**
 * Hook for handling IME (Input Method Editor) composition
 * Prevents issues with Korean, Japanese, Chinese input
 * Uses local state for immediate display, updates store after composition
 */
export function useIMEInput(
  initialValue: string,
  onValueChange: (value: string) => void
) {
  const [localValue, setLocalValue] = useState(initialValue)
  const isComposingRef = useRef(false)

  // Sync with external value changes
  useEffect(() => {
    if (!isComposingRef.current) {
      setLocalValue(initialValue)
    }
  }, [initialValue])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    
    // Update store immediately if not composing
    if (!isComposingRef.current) {
      onValueChange(newValue)
    }
  }

  const handleCompositionStart = () => {
    isComposingRef.current = true
  }

  const handleCompositionEnd = (e: React.CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    isComposingRef.current = false
    const finalValue = (e.target as HTMLInputElement | HTMLTextAreaElement).value
    setLocalValue(finalValue)
    onValueChange(finalValue)
  }

  return {
    value: localValue,
    onChange: handleChange,
    onCompositionStart: handleCompositionStart,
    onCompositionEnd: handleCompositionEnd,
  }
}
