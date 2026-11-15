import { createVoiceSession } from "@cropilot/api"
import {
  useConversationControls,
  useConversationInput,
  useConversationMode,
  useConversationStatus,
} from "@elevenlabs/react-native"
import { usePathname } from "expo-router"
import { AudioLines, Mic, MicOff, X } from "lucide-react-native"
import { useEffect } from "react"
import { Pressable, View } from "react-native"
import { useSharedValue } from "react-native-reanimated"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Sheet } from "@/components/ui/sheet"
import { Text } from "@/components/ui/text"
import { VoiceOrb } from "@/features/voice/voice-orb"
import { useVoicePanel } from "@/features/voice/voice-provider"
import { cn } from "@/lib/utils"

// Screens of the case, where the assistant has something to talk about.
const CASE_PATHS = /^\/(overview|years|strategies|map|case)(\/|$)/
const TAB_BAR_HEIGHT = 49
const LEVEL_POLL_MS = 50

/** Drives the orb from the live audio: the agent's voice while it speaks, the mic otherwise. */
function useVoiceMotion() {
  const { status } = useConversationStatus()
  const { isSpeaking } = useConversationMode()
  const { getInputVolume, getOutputVolume } = useConversationControls()
  const level = useSharedValue(0)
  const speed = useSharedValue(0.3)

  useEffect(() => {
    speed.value =
      status === "connecting"
        ? 2
        : status !== "connected"
          ? 0.3
          : isSpeaking
            ? 1.4
            : 0.7
    if (status !== "connected") {
      level.value = 0
      return
    }
    const timer = setInterval(() => {
      const volume = isSpeaking ? getOutputVolume() : getInputVolume()
      // Smoothed so the ribbons breathe instead of flickering with every syllable.
      level.value = level.value * 0.6 + Math.min(1, volume * 1.6) * 0.4
    }, LEVEL_POLL_MS)
    return () => clearInterval(timer)
  }, [status, isSpeaking, getInputVolume, getOutputVolume, level, speed])

  return { level, speed }
}

function statusLabel(status: string, isSpeaking: boolean) {
  if (status === "connecting") return "Connecting"
  if (status !== "connected") return "Tap to talk about this case"
  return isSpeaking ? "Speaking" : "Listening"
}

export function VoiceAssistant() {
  const pathname = usePathname()
  const insets = useSafeAreaInsets()
  const panel = useVoicePanel()
  const { status } = useConversationStatus()
  const { isSpeaking } = useConversationMode()
  const { isMuted, setMuted } = useConversationInput()
  const { startSession, endSession } = useConversationControls()
  const { level, speed } = useVoiceMotion()
  const live = status === "connected" || status === "connecting"

  const start = async () => {
    panel.setError(null)
    panel.clearTranscript()
    try {
      const { data } = await createVoiceSession({ throwOnError: true })
      await startSession({ conversationToken: data.conversation_token })
    } catch (error) {
      panel.setError(
        error instanceof Error ? error.message : "The assistant is unavailable"
      )
    }
  }

  const stop = async () => {
    await endSession()
    panel.setExpanded(false)
  }

  if (!CASE_PATHS.test(pathname) && !live) return null

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          live ? "Open the voice assistant" : "Talk to the assistant"
        }
        onPress={() => panel.setExpanded(true)}
        style={{ bottom: insets.bottom + TAB_BAR_HEIGHT + 16 }}
        className="absolute right-4 h-14 w-14 items-center justify-center rounded-full border border-border bg-background/75 shadow-md"
      >
        {live ? (
          <VoiceOrb size={56} level={level} speed={speed} />
        ) : (
          <Icon as={AudioLines} className="size-6 text-primary" />
        )}
      </Pressable>

      <Sheet
        open={panel.expanded}
        onClose={() => panel.setExpanded(false)}
        title="Case assistant"
      >
        <View className="items-center gap-2">
          <VoiceOrb size={220} level={level} speed={speed} />
          <Text className="text-muted-foreground text-sm">
            {statusLabel(status, isSpeaking)}
          </Text>
        </View>

        {panel.transcript.length > 0 && (
          <View className="gap-3 rounded-xl border border-border p-4">
            {panel.transcript.map((line) => (
              <Text
                key={line.id}
                className={cn(
                  "text-sm",
                  line.role === "user"
                    ? "text-muted-foreground"
                    : "text-foreground"
                )}
              >
                {line.text}
              </Text>
            ))}
          </View>
        )}

        {panel.error && (
          <Text className="text-destructive text-sm">{panel.error}</Text>
        )}

        <View className="flex-row gap-3">
          {live ? (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onPress={() => setMuted(!isMuted)}
                accessibilityLabel={
                  isMuted ? "Unmute microphone" : "Mute microphone"
                }
              >
                <Icon as={isMuted ? MicOff : Mic} className="size-4" />
                <Text>{isMuted ? "Unmute" : "Mute"}</Text>
              </Button>
              <Button variant="destructive" className="flex-1" onPress={stop}>
                <Icon as={X} className="size-4 text-destructive" />
                <Text>End</Text>
              </Button>
            </>
          ) : (
            <Button className="flex-1" onPress={start}>
              <Icon as={Mic} className="size-4 text-primary-foreground" />
              <Text>Start talking</Text>
            </Button>
          )}
        </View>

        <Text className="text-muted-foreground text-xs">
          Answers come only from this case's data and name their source. The
          assistant supports your judgment, it never replaces it. Voice by
          ElevenLabs.
        </Text>
      </Sheet>
    </>
  )
}
