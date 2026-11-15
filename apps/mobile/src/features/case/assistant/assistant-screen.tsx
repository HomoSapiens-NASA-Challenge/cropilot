import { Stack } from "expo-router"
import { useHeaderHeight } from "expo-router/react-navigation"
import { ArrowUp, RotateCcw } from "lucide-react-native"
import { useState } from "react"
import { Keyboard, KeyboardAvoidingView, Platform, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Button } from "@/components/ui/button"
import { Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Text } from "@/components/ui/text"
import { Conversation } from "@/features/case/assistant/conversation"
import {
  type AssistantDetails,
  DetailsSheet,
} from "@/features/case/assistant/details-sheet"
import { useAssistant } from "@/features/case/assistant/use-assistant"
import { CaseState } from "@/features/case/case-state"
import { InfoButton } from "@/features/case/info-button"
import { useCaseBundle } from "@/features/case/use-case"
import { headerOptions } from "@/features/shell/header-options"

export function AssistantScreen({ zoneId }: { zoneId: string }) {
  const bundle = useCaseBundle(zoneId)
  const assistant = useAssistant(zoneId)
  const headerHeight = useHeaderHeight()
  const [sheet, setSheet] = useState<
    AssistantDetails | { kind: "info" } | null
  >(null)

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={headerHeight}
    >
      <Stack.Screen
        options={{
          ...headerOptions,
          title: "Ask Cropilot",
          headerRight:
            bundle.status === "ready"
              ? () => (
                  <View className="flex-row items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      accessibilityLabel="New conversation"
                      disabled={
                        assistant.pending || assistant.turns.length === 0
                      }
                      onPress={() => {
                        setSheet(null)
                        assistant.newConversation()
                      }}
                    >
                      <Icon as={RotateCcw} size={20} className="text-primary" />
                    </Button>
                    <InfoButton
                      title="Explore the evidence"
                      open={sheet?.kind === "info"}
                      onOpenChange={(open) => {
                        Keyboard.dismiss()
                        setSheet(open ? { kind: "info" } : null)
                      }}
                    >
                      <Text className="text-sm text-muted-foreground">
                        {bundle.data.zone_name} · Published case
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        AI explanations of scenarios, with sources. Supports
                        your agronomic judgment.
                      </Text>
                      <Text className="text-sm text-muted-foreground">
                        Answers follow your question's language. The last three
                        exchanges are sent for follow-ups.
                      </Text>
                    </InfoButton>
                  </View>
                )
              : undefined,
        }}
      />
      {bundle.status !== "ready" ? (
        <CaseState status={bundle.status} />
      ) : (
        <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1">
          <Conversation
            turns={assistant.turns}
            pendingQuestion={assistant.pendingQuestion}
            pending={assistant.pending}
            onQuestion={assistant.setQuestion}
            onEvidence={(card) => {
              Keyboard.dismiss()
              setSheet({ kind: "evidence", card })
            }}
            onSources={(response) => {
              Keyboard.dismiss()
              setSheet({ kind: "sources", response })
            }}
          />
          <View className="gap-3 border-t border-border p-4">
            {assistant.error && (
              <Text role="alert" className="text-sm text-destructive">
                {assistant.error}
              </Text>
            )}
            <View className="flex-row items-end gap-2">
              <Input
                className="h-24 max-h-32 flex-1 py-3 sm:h-24"
                multiline
                textAlignVertical="top"
                maxLength={2000}
                placeholder="Ask about this case…"
                accessibilityLabel="Your question"
                accessibilityState={{ disabled: assistant.pending }}
                editable={!assistant.pending}
                value={assistant.question}
                onChangeText={assistant.setQuestion}
              />
              <Button
                size="icon"
                className="size-11"
                accessibilityLabel="Send"
                disabled={assistant.pending || !assistant.question.trim()}
                onPress={() => void assistant.send()}
              >
                <Icon as={ArrowUp} size={22} />
              </Button>
            </View>
          </View>
          <DetailsSheet
            details={sheet?.kind === "info" ? null : sheet}
            onClose={() => setSheet(null)}
          />
        </SafeAreaView>
      )}
    </KeyboardAvoidingView>
  )
}
