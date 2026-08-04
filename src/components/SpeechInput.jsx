import React, { useState, useRef } from 'react'

export default function SpeechInput({
  value,
  onChange,
  placeholder,
  label,
  multiline = false,
  rows = 2,
  className = '',
  onFocus,
}) {
  const [isListening, setIsListening] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const recognitionRef = useRef(null)

  const startListening = () => {
    setSpeechError('')
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechError('Speech recognition is not supported in this browser.')
      return
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        if (transcript) {
          const updatedValue = value ? `${value}, ${transcript}` : transcript
          onChange(updatedValue)
        }
      }

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error)
        setIsListening(false)
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone access denied. Please check site permissions.')
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Voice error: ${event.error}`)
        }
      }

      recognition.onend = () => {
        setIsListening(false)
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch (err) {
      console.error(err)
      setIsListening(false)
      setSpeechError('Could not launch microphone.')
    }
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
  }

  const toggleListening = (e) => {
    e.preventDefault()
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-purple-950">{label}</span>
          {isListening && (
            <span className="text-xs font-semibold text-purple-600 animate-pulse flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-purple-600"></span> Listening...
            </span>
          )}
        </div>
      )}

      <div className="relative flex items-center">
        {multiline ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            rows={rows}
            className={`input pr-11 py-3 w-full resize-none ${isListening ? 'border-purple-500 ring-2 ring-purple-200' : ''} ${className}`}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={onFocus}
            placeholder={placeholder}
            className={`input pr-11 w-full ${isListening ? 'border-purple-500 ring-2 ring-purple-200' : ''} ${className}`}
          />
        )}

        <button
          type="button"
          onClick={toggleListening}
          title={isListening ? 'Stop recording voice' : 'Speech to text microphone input'}
          className={`absolute right-2.5 ${multiline ? 'top-3' : 'top-1/2 -translate-y-1/2'} p-2 rounded-xl transition-all ${
            isListening
              ? 'bg-purple-600 text-white animate-pulse shadow-md shadow-purple-500/30'
              : 'bg-purple-100/60 text-purple-700 hover:bg-purple-200 hover:text-purple-900'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>
      </div>

      {speechError && <p className="mt-1 text-xs text-purple-600">{speechError}</p>}
    </div>
  )
}
