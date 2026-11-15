import type { AssistantResponse, EvidenceCard } from "@cropilot/api"
import { MessageCircle } from "lucide-react-native"
import { type ComponentRef, useEffect, useRef } from "react"
import { ActivityIndicator, ScrollView, View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import { Answer } from "@/features/case/assistant/answer"
import { QuestionSuggestions } from "@/features/case/assistant/question-suggestions"
import type { Turn } from "@/features/case/assistant/use-assistant"
import type { SpokenAnswers } from "@/features/case/assistant/use-spoken-answers"
import { SVG_COLORS } from "@/lib/theme"

const suggestions = [
  "Compare the rotations and their water tradeoffs.",
  "What happened in the published analog years?",
  "What do we actually know about the reference field?",
]

export function Conversation({
  turns,
  pendingQuestion,
  pending,
  voiceBusy,
  spokenAnswers,
  onQuestion,
  onEvidence,
  onSources,
}: {
  turns: Turn[]
  pendingQuestion: string | null
  pending: boolean
  voiceBusy: boolean
  spokenAnswers: SpokenAnswers
  onQuestion: (question: string) => void
  onEvidence: (card: EvidenceCard) => void
  onSources: (response: AssistantResponse) => void
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null)

  useEffect(() => {
    if (pendingQuestion || turns.length > 0) {
      scroll.current?.scrollToEnd({ animated: true })
    }
  }, [pendingQuestion, turns])

  return (
    <ScrollView
      ref={scroll}
      className="flex-1"
      accessibilityLabel="Conversation"
      accessibilityLiveRegion="polite"
      aria-busy={pending}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      onContentSizeChange={() => {
        if (pendingQuestion || turns.length > 0) {
          scroll.current?.scrollToEnd({ animated: true })
        }
      }}
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-8 p-4">
        {turns.length === 0 && !pending && (
          <View className="gap-5 py-5">
            <Icon as={MessageCircle} size={28} className="text-primary" />
            <Text className="text-xl font-light tracking-tight">
              What would you like to understand?
            </Text>
            <Text className="text-sm leading-relaxed text-muted-foreground">
              Compare alternatives, inspect their sources, or ask what is still
              missing. You can write in English or Spanish.
            </Text>
            <QuestionSuggestions
              questions={suggestions}
              disabled={pending || voiceBusy}
              onQuestion={onQuestion}
            />
          </View>
        )}
        {turns.map((turn) => (
          <View key={turn.id} className="gap-4">
            <Text className="rounded-lg bg-muted p-3 text-sm">
              {turn.question}
            </Text>
            <Answer
              response={turn.response}
              pending={pending || voiceBusy}
              turnId={turn.id}
              spokenAnswers={spokenAnswers}
              voiceBusy={voiceBusy}
              onToggleSpeech={() => void spokenAnswers.toggle(turn)}
              onQuestion={onQuestion}
              onEvidence={onEvidence}
              onSources={onSources}
            />
          </View>
        ))}
        {pendingQuestion && (
          <View className="gap-4">
            <Text className="rounded-lg bg-muted p-3 text-sm">
              {pendingQuestion}
            </Text>
            <View className="flex-row items-center gap-2">
              <ActivityIndicator
                size="small"
                color={SVG_COLORS.mutedForeground}
              />
              <Text className="flex-1 text-sm text-muted-foreground">
                Reading the evidence and preparing your answer…
              </Text>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  )
}
