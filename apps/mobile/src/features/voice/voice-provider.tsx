import { ConversationProvider } from "@elevenlabs/react-native"
import { useQueryClient } from "@tanstack/react-query"
import { useGlobalSearchParams } from "expo-router"
import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react"
import { DEFAULT_ZONE_ID } from "@/features/case/zone"
import { createClientTools } from "@/features/voice/client-tools"

export type TranscriptLine = {
  id: number
  role: "user" | "agent"
  text: string
}

type VoicePanel = {
  expanded: boolean
  setExpanded: (expanded: boolean) => void
  transcript: ReadonlyArray<TranscriptLine>
  clearTranscript: () => void
  error: string | null
  setError: (error: string | null) => void
}

const VoicePanelContext = createContext<VoicePanel | null>(null)
const TRANSCRIPT_LINES = 6

export function useVoicePanel() {
  const panel = useContext(VoicePanelContext)
  if (!panel) throw new Error("useVoicePanel needs a VoiceProvider above it")
  return panel
}

/** One voice conversation for the whole app, so it survives navigation. */
export function VoiceProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { zoneId } = useGlobalSearchParams<{ zoneId?: string }>()
  // Tools run long after render; they read the zone on screen at call time.
  const zoneRef = useRef(DEFAULT_ZONE_ID)
  zoneRef.current = zoneId ?? DEFAULT_ZONE_ID

  const [expanded, setExpanded] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [error, setError] = useState<string | null>(null)
  const nextLineId = useRef(0)

  const clientTools = useMemo(() => {
    const tools = createClientTools(queryClient, () => zoneRef.current)
    return {
      ...tools,
      // The user has to see the screen the agent opened, so the sheet steps aside.
      show_case_screen: (parameters: Record<string, unknown>) => {
        const result = tools.show_case_screen(parameters)
        setExpanded(false)
        return result
      },
    }
  }, [queryClient])

  const panel = useMemo(
    () => ({
      expanded,
      setExpanded,
      transcript,
      clearTranscript: () => setTranscript([]),
      error,
      setError,
    }),
    [expanded, transcript, error]
  )

  return (
    <ConversationProvider
      clientTools={clientTools}
      onMessage={({ message, role }) => {
        nextLineId.current += 1
        const line = { id: nextLineId.current, role, text: message }
        setTranscript((lines) => [...lines, line].slice(-TRANSCRIPT_LINES))
      }}
      onError={(message) => setError(message)}
    >
      <VoicePanelContext.Provider value={panel}>
        {children}
      </VoicePanelContext.Provider>
    </ConversationProvider>
  )
}
