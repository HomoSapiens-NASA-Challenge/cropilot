import type { AssistantResponse, EvidenceCard } from "@cropilot/api"
import { Linking, Pressable, ScrollView, View } from "react-native"
import { Sheet } from "@/components/ui/sheet"
import { Text } from "@/components/ui/text"

export type AssistantDetails =
  | { kind: "evidence"; card: EvidenceCard }
  | { kind: "sources"; response: AssistantResponse }

function EvidenceTable({ card }: { card: EvidenceCard }) {
  return (
    <>
      <Text className="text-xs text-muted-foreground">
        {card.provenance} · {card.scale} · Published evidence
      </Text>
      <ScrollView horizontal>
        <View className="rounded-lg border border-border">
          <View className="flex-row bg-muted">
            {card.columns.map((column) => (
              <Text key={column} className="w-40 p-2 text-xs font-medium">
                {column}
              </Text>
            ))}
          </View>
          {card.rows.map((row, index) => (
            <View
              key={`${card.title}-${index}`}
              className="flex-row border-t border-border"
            >
              {row.map((value, column) => (
                <Text
                  key={card.columns[column]}
                  className="w-40 p-2 text-xs tabular-nums"
                >
                  {value === null
                    ? "Missing"
                    : typeof value === "number"
                      ? value.toLocaleString("en", {
                          maximumFractionDigits: 3,
                        })
                      : value}
                </Text>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <Text className="text-xs leading-relaxed text-muted-foreground">
        {card.note}
      </Text>
    </>
  )
}

function Sources({ response }: { response: AssistantResponse }) {
  return (
    <>
      {response.sources.map((source) => (
        <View key={source.id} className="gap-1">
          {source.url && /^https?:\/\//.test(source.url) ? (
            <Pressable
              accessibilityRole="link"
              className="min-h-11 justify-center"
              onPress={() => {
                if (source.url) void Linking.openURL(source.url)
              }}
            >
              <Text className="text-sm text-primary underline">
                {source.dataset}
              </Text>
            </Pressable>
          ) : (
            <Text className="text-sm">{source.dataset}</Text>
          )}
          <Text className="text-xs text-muted-foreground">
            {source.provider} · {source.period} · {source.location}
          </Text>
          <Text className="text-xs text-muted-foreground">
            {source.nature} · {source.id}
          </Text>
        </View>
      ))}
      <Text className="text-xs leading-relaxed text-muted-foreground">
        Case snapshot: {response.generated_utc}. Model: {response.model}. Tools:{" "}
        {response.tools_used.join(", ") || "Case metadata"}.
      </Text>
    </>
  )
}

export function DetailsSheet({
  details,
  onClose,
}: {
  details: AssistantDetails | null
  onClose: () => void
}) {
  return (
    <Sheet
      open={details !== null}
      onClose={onClose}
      title={
        details?.kind === "evidence"
          ? details.card.title
          : details?.kind === "sources"
            ? `Sources and context (${details.response.sources.length})`
            : undefined
      }
    >
      {details?.kind === "evidence" && <EvidenceTable card={details.card} />}
      {details?.kind === "sources" && <Sources response={details.response} />}
    </Sheet>
  )
}
