/**
 * Digital Leaf Colour Chart (LCC) tool.
 *
 * Provides two paths for determining the LCC band:
 * 1. Camera: takes a photo of the leaf as a visual aid for comparison
 * 2. Manual: dropdown selection (always available as fallback)
 *
 * The band is always selected by the farmer — no ML model is used.
 * The camera is a visual aid, not an automated classifier.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { postLccReading } from '../api/client'
import {
  ActionBar,
  Banner,
  Button,
  Card,
  Field,
  Screen,
  Select,
} from '../components/ui'

const LCC_BANDS = [
  { value: 1, label: 'Band 1 — Yellow-green', colour: '#c8d84c' },
  { value: 2, label: 'Band 2 — Light green', colour: '#8fbc3e' },
  { value: 3, label: 'Band 3 — Green', colour: '#5ca033' },
  { value: 4, label: 'Band 4 — Dark green', colour: '#3a7c2a' },
  { value: 5, label: 'Band 5 — Very dark green', colour: '#265a1e' },
  { value: 6, label: 'Band 6 — Deep dark green', colour: '#1a3d15' },
]

export default function LccTool() {
  const navigate = useNavigate()
  const [band, setBand] = useState('')
  const [method, setMethod] = useState('manual')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Camera state
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [capturedImage, setCapturedImage] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const startCamera = useCallback(async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraActive(true)
      setMethod('camera_visual')
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError(
          'Camera permission denied. You can still select the band manually below.',
        )
      } else {
        setCameraError(`Could not access camera: ${err.message}. Use the manual selector below.`)
      }
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop()
      }
      streamRef.current = null
    }
    setCameraActive(false)
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(dataUrl)
    stopCamera()
  }, [stopCamera])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) {
          track.stop()
        }
      }
    }
  }, [])

  async function handleSubmit() {
    if (!band) return
    setLoading(true)
    setError(null)
    try {
      const data = await postLccReading({ band: Number(band), method })
      setResult(data)
    } catch (err) {
      setError(err.message || 'Failed to get LCC decision.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen title="Leaf Colour Chart" subtitle="In-season nitrogen management tool">
      <Banner tone="info" title="How to use">
        Compare the colour of the topmost fully expanded leaf against the chart below.
        Select the matching band, then submit for a nitrogen top-dressing decision.
      </Banner>

      {/* Visual reference chart */}
      <Card title="LCC reference bands">
        <div className="flex gap-1">
          {LCC_BANDS.map((b) => (
            <button
              key={b.value}
              type="button"
              className={`flex-1 rounded-lg py-6 text-center text-xs font-bold transition ${
                Number(band) === b.value
                  ? 'ring-2 ring-green-600 ring-offset-2'
                  : 'opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: b.colour, color: b.value <= 3 ? '#000' : '#fff' }}
              onClick={() => setBand(String(b.value))}
              aria-label={`Select ${b.label}`}
            >
              {b.value}
            </button>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-slate-500">
          Tap the band that best matches your leaf colour
        </p>
      </Card>

      {/* Camera section */}
      <Card title="Camera (visual aid)">
        {!cameraActive && !capturedImage ? (
          <div className="space-y-2">
            <Button variant="secondary" onClick={startCamera}>
              📷 Open camera to compare leaf
            </Button>
            {cameraError ? (
              <p className="text-sm text-amber-700">{cameraError}</p>
            ) : (
              <p className="text-xs text-slate-500">
                The camera helps you visually compare the leaf. You still select the band yourself.
              </p>
            )}
          </div>
        ) : null}

        {cameraActive ? (
          <div className="space-y-2">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '300px', objectFit: 'cover' }}
            />
            <div className="flex gap-2">
              <Button onClick={capturePhoto}>📸 Capture</Button>
              <Button variant="secondary" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}

        {capturedImage ? (
          <div className="space-y-2">
            <img
              src={capturedImage}
              alt="Captured leaf"
              className="w-full rounded-lg"
              style={{ maxHeight: '200px', objectFit: 'cover' }}
            />
            <p className="text-xs text-slate-500">
              Compare this leaf to the colour bands above, then select the closest match.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setCapturedImage(null)
                setMethod('manual')
              }}
            >
              Retake
            </Button>
          </div>
        ) : null}
      </Card>

      {/* Manual selector (always visible) */}
      <Card title="Select band">
        <Field label="LCC band" hint="Always available — camera is not required.">
          <Select
            value={band}
            onChange={(e) => setBand(e.target.value)}
          >
            <option value="">— Select —</option>
            {LCC_BANDS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      {/* Result */}
      {result ? (
        <Card
          title={result.decision === 'top_dress' ? '⚠️ Top-dress nitrogen' : '✅ No action needed'}
          tone={result.decision === 'top_dress' ? 'warning' : 'default'}
        >
          <p className="text-sm text-slate-800">{result.explanation}</p>
          <p className="mt-2 text-xs text-slate-500">
            Source: {result.source}
          </p>
        </Card>
      ) : null}

      {error ? (
        <Banner tone="danger" title="Error">
          {error}
        </Banner>
      ) : null}

      <Banner tone="info">
        <p className="text-xs">
          <strong>Note:</strong> This is a visual comparison tool, not an ML model.
          The farmer selects the band manually. For production-scale Indian-language
          voice and image analysis, Bhashini (bhashini.gov.in) is the recommended path.
        </p>
      </Banner>

      <ActionBar>
        <Button variant="secondary" onClick={() => navigate('/results')}>
          Back to results
        </Button>
        <Button onClick={handleSubmit} disabled={!band || loading}>
          {loading ? 'Checking…' : 'Get decision'}
        </Button>
      </ActionBar>
    </Screen>
  )
}
