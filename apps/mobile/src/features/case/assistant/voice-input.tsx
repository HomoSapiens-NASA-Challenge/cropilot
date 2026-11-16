import { transcribeCaseQuestionMutation } from "@cropilot/api"
import { useMutation } from "@tanstack/react-query"
import {
  type AudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio"
import { Mic, Square, X } from "lucide-react-native"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { ActivityIndicator, Platform, View } from "react-native"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import {
  discardRecording,
  RecordingValidationError,
  readRecording,
} from "@/features/case/assistant/recorded-audio"
import { SVG_COLORS } from "@/lib/theme"

type Phase = "idle" | "requesting" | "recording" | "transcribing" | "stopping"
type Capture = {
  generation: number
  preparing: Promise<void> | null
  released: Promise<void> | null
  started: boolean
  finished: boolean
  finishing: boolean
  uri: string | null
  timer: ReturnType<typeof setInterval> | null
  upload: AbortController
}

function clearTimer(capture: Capture) {
  if (capture.timer !== null) clearInterval(capture.timer)
  capture.timer = null
}

function releaseMicrophone(recorder: AudioRecorder, capture: Capture) {
  if (capture.released) return capture.released
  clearTimer(capture)
  capture.released = (async () => {
    try {
      if (!capture.started) await capture.preparing
      if (capture.started && !capture.finished) await recorder.stop()
      if (Platform.OS === "web") capture.uri = recorder.uri
    } finally {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      })
    }
  })()
  return capture.released
}

function transcriptionError(failure: unknown) {
  return typeof failure === "object" &&
    failure !== null &&
    "detail" in failure &&
    typeof failure.detail === "string"
    ? failure.detail
    : "Could not transcribe the recording. Try again or type your question."
}

export function VoiceInput({
  disabled,
  onTranscript,
  onBusy,
  children,
}: {
  disabled: boolean
  onTranscript: (text: string) => void
  onBusy: (busy: boolean) => void
  children: ReactNode
}) {
  const [phase, setPhase] = useState<Phase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [seconds, setSeconds] = useState(0)
  const generation = useRef(0)
  const active = useRef<Capture | null>(null)
  const transcription = useMutation(transcribeCaseQuestionMutation())
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, (status) => {
    const capture = active.current
    if (!capture || capture.generation !== generation.current) return
    if (status.isFinished || status.hasError) {
      capture.finished = status.isFinished
      capture.uri = status.url ?? capture.uri
      void finishRecording(
        capture,
        status.hasError
          ? new Error("The microphone stopped unexpectedly. Please try again.")
          : undefined
      )
    }
  })

  useEffect(
    () => () => {
      generation.current += 1
      const capture = active.current
      if (capture) {
        capture.upload.abort()
        void releaseMicrophone(recorder, capture)
          .then(() => {
            if (!capture.finishing && capture.uri) discardRecording(capture.uri)
          })
          .catch((failure: unknown) => {
            console.warn("Could not release the microphone", failure)
          })
      }
      onBusy(false)
    },
    [recorder, onBusy]
  )

  async function finishRecording(capture: Capture, recordingError?: Error) {
    if (capture.finishing || capture.generation !== generation.current) return
    capture.finishing = true
    setPhase("transcribing")
    try {
      await releaseMicrophone(recorder, capture)
      if (capture.generation !== generation.current) return
      if (recordingError) throw recordingError
      if (!capture.uri) throw new Error("Could not read the recording")
      const body = await readRecording(capture.uri, capture.upload.signal)
      if (capture.generation !== generation.current) return
      const result = await transcription.mutateAsync({
        body,
        signal: capture.upload.signal,
      })
      if (capture.generation === generation.current) onTranscript(result.text)
    } catch (failure) {
      if (capture.generation === generation.current) {
        setError(
          recordingError?.message ??
            (failure instanceof RecordingValidationError
              ? failure.message
              : transcriptionError(failure))
        )
      }
    } finally {
      if (capture.uri) {
        try {
          discardRecording(capture.uri)
        } catch (failure) {
          console.warn("Could not delete the recording", failure)
        }
      }
      if (capture.generation === generation.current) {
        active.current = null
        setPhase("idle")
        onBusy(false)
      }
    }
  }

  async function start() {
    if (disabled || active.current) return
    const capture: Capture = {
      generation: ++generation.current,
      preparing: null,
      released: null,
      started: false,
      finished: false,
      finishing: false,
      uri: null,
      timer: null,
      upload: new AbortController(),
    }
    active.current = capture
    setError(null)
    setPhase("requesting")
    onBusy(true)
    try {
      if (
        Platform.OS === "web" &&
        (typeof MediaRecorder === "undefined" ||
          !navigator.mediaDevices?.getUserMedia)
      ) {
        throw new Error(
          "Microphone recording requires HTTPS or localhost and a supported browser."
        )
      }
      const permission = await requestRecordingPermissionsAsync()
      if (capture.generation !== generation.current) return
      if (!permission.granted) {
        throw new Error(
          "Microphone access was denied. Allow it in Settings or type your question."
        )
      }
      capture.preparing = (async () => {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        })
        await recorder.prepareToRecordAsync()
        capture.uri = recorder.uri
        // A prepared web recorder must start before stop() can release its stream.
        recorder.record({ forDuration: 60 })
        capture.started = true
      })()
      await capture.preparing
      if (capture.generation !== generation.current) return
      setSeconds(0)
      setPhase("recording")
      const startedAt = Date.now()
      capture.timer = setInterval(() => {
        setSeconds(Math.min(60, Math.floor((Date.now() - startedAt) / 1000)))
      }, 250)
    } catch (failure) {
      if (capture.generation !== generation.current) return
      try {
        await releaseMicrophone(recorder, capture)
      } catch (releaseError) {
        console.warn("Could not release the microphone", releaseError)
      }
      if (capture.generation !== generation.current) return
      active.current = null
      setPhase("idle")
      onBusy(false)
      setError(
        failure instanceof Error
          ? failure.message
          : "The microphone could not start."
      )
    }
  }

  async function cancel() {
    const capture = active.current
    if (!capture || phase === "stopping") return
    const cancelledGeneration = ++generation.current
    capture.upload.abort()
    setPhase("stopping")
    try {
      await releaseMicrophone(recorder, capture)
      if (!capture.finishing && capture.uri) discardRecording(capture.uri)
    } catch (failure) {
      if (cancelledGeneration === generation.current) {
        setError("The microphone could not stop. Please try again.")
      }
      console.warn("Could not release the microphone", failure)
    } finally {
      if (cancelledGeneration === generation.current) {
        active.current = null
        setPhase("idle")
        onBusy(false)
      }
    }
  }

  return (
    <View className="gap-1">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <View className="flex-row items-center gap-1">
          {phase === "idle" || phase === "recording" ? (
            <Button
              variant="outline"
              size="sm"
              className="h-11 gap-1.5 px-2"
              accessibilityLabel={
                phase === "idle" ? "Record question" : "Stop recording"
              }
              disabled={disabled}
              onPress={() => {
                const capture = active.current
                if (capture) void finishRecording(capture)
                else void start()
              }}
            >
              <Icon as={phase === "idle" ? Mic : Square} size={16} />
              <Text className="text-xs">
                {phase === "idle" ? "Record question" : "Stop recording"}
              </Text>
            </Button>
          ) : (
            <View className="min-h-11 flex-row items-center gap-2">
              <ActivityIndicator
                size="small"
                color={SVG_COLORS.mutedForeground}
              />
              <Text role="status" className="text-xs text-muted-foreground">
                {phase === "requesting"
                  ? "Waiting for microphone…"
                  : phase === "stopping"
                    ? "Stopping recording…"
                    : "Transcribing…"}
              </Text>
            </View>
          )}
          {phase !== "idle" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-11 gap-1 px-2"
              accessibilityLabel="Cancel recording"
              disabled={phase === "stopping"}
              onPress={() => void cancel()}
            >
              <Icon as={X} size={16} />
              <Text className="text-xs">Cancel recording</Text>
            </Button>
          )}
        </View>
        {children}
      </View>
      {phase === "recording" && (
        <Text role="status" className="text-xs text-primary">
          Recording · {seconds}/60 s
        </Text>
      )}
      {error && (
        <Text role="alert" className="text-xs text-destructive">
          {error}
        </Text>
      )}
    </View>
  )
}
