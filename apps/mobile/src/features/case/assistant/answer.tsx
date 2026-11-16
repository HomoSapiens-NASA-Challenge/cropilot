import type { AssistantResponse, EvidenceCard } from "@cropilot/api"
import { View } from "react-native"
import { ListRow, ListSection } from "@/components/list-row"
import { Text } from "@/components/ui/text"
import { QuestionSuggestions } from "@/features/case/assistant/question-suggestions"

export function Answer({
  response,
  pending,
  onQuestion,
  onEvidence,
  onSources,
}: {
  response: AssistantResponse
  pending: boolean
  onQuestion: (question: string) => void
  onEvidence: (card: EvidenceCard) => void
  onSources: (response: AssistantResponse) => void
}) {
  return (
    <View className="gap-4">
      {response.claims.map((claim) => (
        <View key={claim.text} className="gap-1">
          <Text className="text-sm leading-relaxed">{claim.text}</Text>
          <Text className="text-xs text-muted-foreground">
            {claim.source_ids
              .map(
                (id) =>
                  response.sources.find((source) => source.id === id)
                    ?.dataset ?? id
              )
              .join(" · ")}
          </Text>
        </View>
      ))}
      {response.cards.length > 0 && (
        <ListSection>
          {response.cards.map((card, index) => (
            <ListRow
              key={`${card.title}-${index}`}
              title={card.title}
              subtitle={`${card.provenance} · ${card.scale}`}
              onPress={() => onEvidence(card)}
            />
          ))}
        </ListSection>
      )}
      {response.limitations.length > 0 && (
        <View className="gap-2 border-l-2 border-primary pl-3">
          <Text className="text-xs font-medium">
            What this does not establish
          </Text>
          {response.limitations.map((limit) => (
            <Text
              key={limit}
              className="text-xs leading-relaxed text-muted-foreground"
            >
              {limit}
            </Text>
          ))}
        </View>
      )}
      <ListSection>
        <ListRow
          title={`Sources and context (${response.sources.length})`}
          onPress={() => onSources(response)}
        />
      </ListSection>
      <QuestionSuggestions
        questions={response.suggested_questions}
        disabled={pending}
        onQuestion={onQuestion}
      />
    </View>
  )
}
