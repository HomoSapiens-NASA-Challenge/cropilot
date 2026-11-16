import type { TranscriptionRequest } from "@cropilot/api"
import { File } from "expo-file-system"
import { Platform } from "react-native"

const MAX_AUDIO_BYTES = 4_000_000
const UNSUPPORTED_FORMAT =
  "This device cannot record a supported audio format. Please type your question."

export class RecordingValidationError extends Error {}

function mimeFromType(type: string): TranscriptionRequest["mime_type"] | null {
  switch (type.toLowerCase().split(";")[0]?.trim()) {
    case "audio/mp4":
    case "audio/m4a":
    case "audio/x-m4a":
    case "audio/aac":
    case "audio/x-aac":
      return "audio/mp4"
    case "audio/webm":
      return "audio/webm"
    case "audio/ogg":
      return "audio/ogg"
    case "audio/wav":
    case "audio/wave":
    case "audio/x-wav":
    case "audio/vnd.wave":
      return "audio/wav"
    default:
      return null
  }
}

function mimeFromExtension(
  uri: string
): TranscriptionRequest["mime_type"] | null {
  switch (uri.split(/[?#]/)[0]?.split(".").pop()?.toLowerCase()) {
    case "m4a":
    case "mp4":
    case "aac":
      return "audio/mp4"
    case "webm":
      return "audio/webm"
    case "ogg":
    case "oga":
      return "audio/ogg"
    case "wav":
      return "audio/wav"
    default:
      return null
  }
}

/** The reported type first; a type the backend does not list (some devices report m4a oddly) falls back to the extension. */
function recordingMimeType(
  type: string,
  uri: string
): TranscriptionRequest["mime_type"] {
  const mime = mimeFromType(type) ?? mimeFromExtension(uri)
  if (mime === null) throw new RecordingValidationError(UNSUPPORTED_FORMAT)
  return mime
}

function checkSize(bytes: number) {
  if (bytes > MAX_AUDIO_BYTES) {
    throw new RecordingValidationError(
      "Recording is too large. Try a shorter question."
    )
  }
}

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

export async function readRecording(
  uri: string,
  signal: AbortSignal
): Promise<TranscriptionRequest> {
  if (Platform.OS === "web") {
    const response = await fetch(uri, { signal })
    if (!response.ok) throw new Error("Could not read the recording")
    const blob = await response.blob()
    checkSize(blob.size)
    const mime_type = recordingMimeType(blob.type, uri)
    return { mime_type, audio_base64: await encodedAudio(blob) }
  }
  const file = new File(uri)
  checkSize(file.size)
  const mime_type = recordingMimeType(file.type, uri)
  return { mime_type, audio_base64: await file.base64() }
}

export function discardRecording(uri: string) {
  if (Platform.OS === "web") {
    URL.revokeObjectURL(uri)
  } else {
    const file = new File(uri)
    if (file.exists) file.delete()
  }
}
