/**
 * Voice interface hooks using Web Speech API.
 *
 * These use the browser-native SpeechRecognition and SpeechSynthesis APIs.
 * Support is inconsistent across browsers — Chrome has the best coverage.
 *
 * For production-scale Indian-language voice, Bhashini (bhashini.gov.in)
 * is the recommended path. Web Speech API is used here for the demo only.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

/* --------------------------------------------------------------------------
 * Speech-to-Text (STT)
 * ---------------------------------------------------------------------- */

const SpeechRecognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

/**
 * Hook for speech-to-text input.
 *
 * @param {string} [lang='hi-IN'] - BCP 47 language tag.
 * @returns {{ transcript, listening, start, stop, supported, error }}
 */
export function useSpeechRecognition(lang = 'hi-IN') {
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)

  const supported = !!SpeechRecognition

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.')
      return
    }
    setError(null)
    setTranscript('')

    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.continuous = false

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      setTranscript(result)
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setError('Microphone permission denied. Please allow microphone access.')
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Try again.')
      } else {
        setError(`Speech recognition error: ${event.error}`)
      }
      setListening(false)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }, [lang])

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [])

  return { transcript, listening, start, stop, supported, error }
}

/* --------------------------------------------------------------------------
 * Text-to-Speech (TTS)
 * ---------------------------------------------------------------------- */

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null

/**
 * Hook for text-to-speech output.
 *
 * @returns {{ speak, stop, speaking, supported }}
 */
export function useTextToSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const supported = !!synth

  const speak = useCallback(
    (text, lang = 'en-IN') => {
      if (!synth) return
      synth.cancel() // stop any current speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = lang
      utterance.rate = 0.9
      utterance.onstart = () => setSpeaking(true)
      utterance.onend = () => setSpeaking(false)
      utterance.onerror = () => setSpeaking(false)
      synth.speak(utterance)
    },
    [],
  )

  const stop = useCallback(() => {
    if (synth) {
      synth.cancel()
      setSpeaking(false)
    }
  }, [])

  // Cleanup
  useEffect(() => {
    return () => {
      if (synth) synth.cancel()
    }
  }, [])

  return { speak, stop, speaking, supported }
}
