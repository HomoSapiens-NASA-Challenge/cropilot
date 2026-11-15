import type { CaseBundle } from "@cropilot/api"
import { Linking, Pressable, View } from "react-native"
import { Text } from "@/components/ui/text"
import { BlockSection, Panel } from "@/features/case/block-section"
import { formatDate } from "@/features/case/case-format"
import {
  CaseReferencesProvider,
  EvidenceDetails,
} from "@/features/case/evidence-chip"

export function MethodLimits({ bundle }: { bundle: CaseBundle }) {
  return (
    <CaseReferencesProvider sources={bundle.sources} glossary={bundle.glossary}>
      <BlockSection
        title="Method and limits"
        lead="Read these before you trust a number. Cropilot supports the agronomist's judgment and the producer's decision. It does not replace them."
      >
        <Text className="font-medium">Limits</Text>
        {bundle.limits.map((limit) => (
          <Panel key={limit.title} className="gap-2">
            <Text className="font-medium">{limit.title}</Text>
            <Text className="text-sm text-muted-foreground">{limit.text}</Text>
            <EvidenceDetails sourceIds={limit.source_ids} />
          </Panel>
        ))}
        <Text className="font-medium">Sources</Text>
        {bundle.sources.map((source) => (
          <Panel key={source.id} className="gap-2">
            <Text className="font-medium">{source.dataset}</Text>
            {[
              ["Provider", source.provider],
              ["Period", source.period],
              ["Location", source.location],
              ["License", source.license ?? "Not stated"],
            ].map(([label, value]) => (
              <View key={label} className="gap-1">
                <Text className="text-xs text-muted-foreground">{label}</Text>
                <Text className="text-sm">{value}</Text>
              </View>
            ))}
            {source.url ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={`Open ${source.dataset}`}
                className="min-h-11 justify-center"
                onPress={() => {
                  if (source.url) void Linking.openURL(source.url)
                }}
              >
                <Text className="text-primary">Link</Text>
              </Pressable>
            ) : (
              <Text className="text-sm text-muted-foreground">None</Text>
            )}
          </Panel>
        ))}
        <Text className="font-medium">Glossary</Text>
        <Panel className="gap-4">
          {bundle.glossary.map((entry) => (
            <View key={entry.term} className="gap-1">
              <Text className="font-medium">{entry.term}</Text>
              <Text className="text-sm text-muted-foreground">
                {entry.definition}
              </Text>
            </View>
          ))}
        </Panel>
        <Text className="text-xs text-muted-foreground">
          Case built {formatDate(bundle.generated_utc.slice(0, 10))}. Schema{" "}
          {bundle.schema_version}.
        </Text>
      </BlockSection>
    </CaseReferencesProvider>
  )
}
