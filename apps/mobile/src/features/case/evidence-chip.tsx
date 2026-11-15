import type { BlockMeta, GlossaryTerm, SourceRef } from "@cropilot/api"
import { ChevronDown, ExternalLink } from "lucide-react-native"
import { createContext, type ReactNode, useContext, useState } from "react"
import { Linking, Pressable, View } from "react-native"
import { Icon } from "@/components/ui/icon"
import { Sheet } from "@/components/ui/sheet"
import { Text } from "@/components/ui/text"
import { PROVENANCE, SCALE_LABEL } from "@/features/case/case-format"
import { cn } from "@/lib/utils"

type References = {
  sources: ReadonlyArray<SourceRef>
  glossary: ReadonlyArray<GlossaryTerm>
}
const ReferencesContext = createContext<References | null>(null)

export function CaseReferencesProvider({
  sources,
  glossary = [],
  children,
}: {
  sources: ReadonlyArray<SourceRef>
  glossary?: ReadonlyArray<GlossaryTerm>
  children: ReactNode
}) {
  return (
    <ReferencesContext.Provider value={{ sources, glossary }}>
      {children}
    </ReferencesContext.Provider>
  )
}

export function useGlossaryEntry(term: string) {
  const references = useContext(ReferencesContext)
  if (!references)
    throw new Error("Evidence needs a CaseReferencesProvider above it")
  const wanted = term.toLowerCase()
  return (
    references.glossary.find((entry) => entry.term.toLowerCase() === wanted) ??
    references.glossary.find((entry) =>
      entry.term.toLowerCase().includes(wanted)
    )
  )
}

type EvidenceMeta = Pick<
  BlockMeta,
  "provenance" | "scale" | "source_ids" | "note" | "unit"
>
type EvidenceChipProps = (
  | { meta: EvidenceMeta; sourceIds?: never }
  | { sourceIds: ReadonlyArray<string>; meta?: never }
) & {
  scaleLabel?: string
  horizon?: string
  className?: string
  sources?: ReadonlyArray<SourceRef>
}

export function EvidenceChip({
  meta,
  sourceIds,
  scaleLabel,
  horizon,
  className,
  sources,
}: EvidenceChipProps) {
  const [open, setOpen] = useState(false)
  const ids = meta ? meta.source_ids : sourceIds
  if (!ids.length)
    return (
      <Text
        className={cn(
          "self-start rounded-full border border-dashed border-border px-2 py-1 text-xs text-muted-foreground",
          className
        )}
      >
        No source listed
      </Text>
    )
  const parts = meta
    ? [PROVENANCE[meta.provenance].label, scaleLabel ?? SCALE_LABEL[meta.scale]]
    : []
  parts.push(ids.length === 1 ? "1 source" : `${ids.length} sources`)
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        hitSlop={12}
        className={cn(
          "min-h-11 max-w-full flex-row items-center gap-1.5 self-start rounded-full border border-border bg-background px-2",
          className
        )}
      >
        {meta && meta.provenance !== "missing" && (
          <View
            className={cn(
              "size-1.5 rounded-full border border-foreground",
              (meta.provenance === "observed" ||
                meta.provenance === "retrieved") &&
                "bg-foreground"
            )}
          />
        )}
        <Text className="shrink text-xs font-medium text-muted-foreground">
          {parts.join(" · ")}
        </Text>
        <Icon as={ChevronDown} size={12} className="text-muted-foreground" />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)}>
        {meta ? (
          <EvidenceDetails
            meta={meta}
            scaleLabel={scaleLabel}
            horizon={horizon}
            sources={sources}
          />
        ) : (
          <EvidenceDetails
            sourceIds={sourceIds}
            scaleLabel={scaleLabel}
            horizon={horizon}
            sources={sources}
          />
        )}
      </Sheet>
    </>
  )
}

/** Renders evidence inline without opening another sheet. */
export function EvidenceDetails({
  meta,
  sourceIds,
  scaleLabel,
  horizon,
  sources,
}: EvidenceChipProps) {
  const references = useContext(ReferencesContext)
  const ids = meta ? meta.source_ids : sourceIds
  if (!ids.length)
    return (
      <Text className="text-xs text-muted-foreground">No source listed</Text>
    )
  const availableSources = sources ?? references?.sources
  if (!availableSources)
    throw new Error("Evidence needs a CaseReferencesProvider above it")
  const selected = ids.map((id) => {
    const source = availableSources.find((entry) => entry.id === id)
    if (!source) throw new Error(`Unknown source id: ${id}`)
    return source
  })
  return (
    <View className="gap-4">
      <Text className="font-medium">Evidence</Text>
      {meta && (
        <>
          <Text className="text-sm text-muted-foreground">
            {PROVENANCE[meta.provenance].description}
          </Text>
          <Detail label="Scale" value={scaleLabel ?? SCALE_LABEL[meta.scale]} />
          {horizon && <Detail label="Horizon" value={horizon} />}
          {meta.unit && <Detail label="Unit" value={meta.unit} />}
          {meta.note && <Detail label="Note" value={meta.note} />}
        </>
      )}
      {selected.map((source) => (
        <View key={source.id} className="gap-2 border-t border-border pt-3">
          <Text className="font-medium">{source.dataset}</Text>
          <Text className="text-xs text-muted-foreground">
            {source.provider} · {source.nature.replace("_", " ")}
          </Text>
          <Detail label="Period" value={source.period} />
          <Detail label="Location" value={source.location} />
          {source.license && <Detail label="License" value={source.license} />}
          {source.url && (
            <Pressable
              accessibilityRole="link"
              className="min-h-11 flex-row items-center gap-1"
              onPress={() => {
                if (source.url) void Linking.openURL(source.url)
              }}
            >
              <Text className="text-xs font-medium text-primary">
                Open the source
              </Text>
              <Icon as={ExternalLink} size={12} className="text-primary" />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="w-16 text-xs text-muted-foreground">{label}</Text>
      <Text className="flex-1 text-xs">{value}</Text>
    </View>
  )
}
