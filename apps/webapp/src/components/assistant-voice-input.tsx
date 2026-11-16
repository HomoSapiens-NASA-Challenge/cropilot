import {
  transcribeCaseQuestionMutation,
  transcribePrivateQuestionMutation,
} from "@cropilot/api"
import { useMutation } from "@tanstack/react-query"
import { LoaderCircle, Mic, Square, X } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n"

const MAX_RECORDING_MS = 60_000
const MAX_AUDIO_BYTES = 4_000_000
type Phase = "idle" | "requesting" | "recording" | "transcribing"

function encodedAudio(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read the recording"))
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Could not encode the recording"))
        return
      }
      resolve(reader.result.slice(reader.result.indexOf(",") + 1))
    }
    reader.readAsDataURL(blob)
  })
}

function recordingType() {
  for (const mime of ["audio/webm", "audio/mp4", "audio/ogg"] as const) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  throw new Error(
    "This browser cannot record a supported audio format. Please type your question."
  )
}

/** Closing the panel or changing its context releases every microphone track. */
export function AssistantVoiceInput({
  disabled,
  privateContext,
  onTranscript,
  onBusy,
}: {
  disabled: boolean
  privateContext: boolean
  onTranscript: (text: string) => void
  onBusy: (busy: boolean) => void
}) {
  const { t } = useI18n("app")

  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const publicTranscription = useMutation(transcribeCaseQuestionMutation())
  const privateTranscription = useMutation(transcribePrivateQuestionMutation())
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const generation = useRef(0)
  const upload = useRef<AbortController | null>(null)

  function release() {
    if (stopTimer.current) clearTimeout(stopTimer.current)
    if (tickTimer.current) clearInterval(tickTimer.current)
    for (const track of stream.current?.getTracks() ?? []) track.stop()
    stream.current = null
  }

  function cancel() {
    generation.current += 1
    upload.current?.abort()
    const active = recorder.current
    if (active) {
      active.onstop = null
      active.ondataavailable = null
      active.onerror = null
      if (active.state !== "inactive") active.stop()
    }
    release()
    setPhase("idle")
    onBusy(false)
  }

  useEffect(
    () => () => {
      generation.current += 1
      upload.current?.abort()
      if (stopTimer.current) clearTimeout(stopTimer.current)
      if (tickTimer.current) clearInterval(tickTimer.current)
      const active = recorder.current
      if (active) {
        active.onstop = null
        active.ondataavailable = null
        active.onerror = null
        if (active.state !== "inactive") active.stop()
      }
      for (const track of stream.current?.getTracks() ?? []) track.stop()
      onBusy(false)
    },
    [onBusy]
  )

  async function start() {
    setError(null)
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError(
        "Microphone recording requires HTTPS or localhost and a supported browser."
      )
      return
    }
    const session = ++generation.current
    setPhase("requesting")
    onBusy(true)
    try {
      const mime = recordingType()
      const capture = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (session !== generation.current) {
        for (const track of capture.getTracks()) track.stop()
        return
      }
      stream.current = capture
      const active = new MediaRecorder(capture, {
        mimeType: mime,
        audioBitsPerSecond: 64000,
      })
      recorder.current = active
      const chunks: Blob[] = []
      let size = 0
      active.ondataavailable = (event) => {
        size += event.data.size
        if (size > MAX_AUDIO_BYTES) {
          cancel()
          setError("Recording is too large. Try a shorter question.")
        } else if (event.data.size > 0) chunks.push(event.data)
      }
      active.onerror = () => {
        cancel()
        setError("The microphone stopped unexpectedly. Please try again.")
      }
      active.onstop = async () => {
        release()
        if (session !== generation.current) return
        setPhase("transcribing")
        const controller = new AbortController()
        upload.current = controller
        try {
          const body = {
            audio_base64: await encodedAudio(new Blob(chunks, { type: mime })),
            mime_type: mime,
          }
          if (session !== generation.current) return
          const result = privateContext
            ? await privateTranscription.mutateAsync({
                body,
                signal: controller.signal,
              })
            : await publicTranscription.mutateAsync({
                body,
                signal: controller.signal,
              })
          if (session === generation.current) onTranscript(result.text)
        } catch (failure) {
          if (session !== generation.current) return
          setError(
            typeof failure === "object" &&
              failure !== null &&
              "detail" in failure &&
              typeof failure.detail === "string"
              ? failure.detail
              : "Could not transcribe the recording. Try again or type your question."
          )
        } finally {
          if (session === generation.current) {
            setPhase("idle")
            onBusy(false)
          }
        }
      }
      active.start(250)
      setSeconds(0)
      setPhase("recording")
      tickTimer.current = setInterval(
        () => setSeconds((value) => value + 1),
        1000
      )
      stopTimer.current = setTimeout(() => {
        if (active.state === "recording") active.stop()
      }, MAX_RECORDING_MS)
    } catch (failure) {
      if (session !== generation.current) return
      release()
      setPhase("idle")
      onBusy(false)
      setError(
        failure instanceof DOMException && failure.name === "NotAllowedError"
          ? "Microphone access was denied. Allow it in your browser or type your question."
          : failure instanceof Error
            ? failure.message
            : "The microphone could not start."
      )
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {phase === "idle" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => void start()}
          >
            <Mic aria-hidden data-icon="inline-start" />
            {t("Record question")}
          </Button>
        ) : (
          <>
            {phase === "recording" ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => recorder.current?.stop()}
              >
                <Square aria-hidden data-icon="inline-start" />
                {t("Stop recording")}
              </Button>
            ) : (
              <span className="flex items-center gap-2 text-xs">
                <LoaderCircle className="size-3 animate-spin" aria-hidden />
                {phase === "requesting"
                  ? t("Waiting for microphone…")
                  : t("Transcribing…")}
              </span>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={cancel}>
              <X aria-hidden data-icon="inline-start" />
              {t("Cancel recording")}
            </Button>
          </>
        )}
        {phase === "recording" && (
          <span className="text-xs text-primary" role="status">
            {t("Recording · ")}
            {seconds}
            {t("/60 s")}
          </span>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {t(error)}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t(
          "Review the transcript before sending. Audio is processed by OpenAI."
        )}
      </p>
    </div>
  )
}
