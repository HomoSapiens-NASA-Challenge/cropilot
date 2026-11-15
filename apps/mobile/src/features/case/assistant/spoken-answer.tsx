import type { SpeechAudio } from "@cropilot/api"
import { Pause, Play } from "lucide-react-native"
import { useState } from "react"
import { ActivityIndicator, Pressable, View } from "react-native"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { SVG_COLORS } from "@/lib/theme"

export function SpokenAnswer({
  speech,
  playing,
  loading,
  disabled,
  error,
  onToggle,
}: {
  speech: SpeechAudio
  playing: boolean
  loading: boolean
  disabled: boolean
  error: string | null
  onToggle: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  return (
    <View className="gap-2 rounded-xl border border-border p-3">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-xs font-medium">
          AI-generated voice · spoken excerpt
        </Text>
        <Button
          variant="outline"
          size="icon"
          className="size-11"
          disabled={disabled || loading}
          accessibilityLabel={
            playing ? "Pause spoken answer" : "Play spoken answer"
          }
          onPress={onToggle}
        >
          {loading ? (
            <ActivityIndicator
              size="small"
              color={SVG_COLORS.mutedForeground}
            />
          ) : (
            <Icon as={playing ? Pause : Play} size={18} />
          )}
        </Button>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Spoken transcript"
        accessibilityState={{ expanded }}
        className="min-h-11 justify-center"
        onPress={() => setExpanded((value) => !value)}
      >
        <Text className="text-xs text-primary">Spoken transcript</Text>
      </Pressable>
      {expanded && (
        <Text className="text-xs leading-relaxed text-muted-foreground">
          {speech.text}
        </Text>
      )}
      {error && (
        <Text role="status" className="text-xs text-muted-foreground">
          {error}
        </Text>
      )}
      <Text className="text-xs text-muted-foreground">
        Press Play to listen, pause or replay. The complete answer and sources
        are below.
      </Text>
    </View>
  )
}
