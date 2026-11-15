import type { CaseBundle } from "@cropilot/api"
import { ExternalLink } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { BlockSection, NotAvailable, Panel } from "@/features/case/block-frame"
import { CaseReferencesProvider } from "@/features/case/case-context"
import { pluralize } from "@/features/case/case-format"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { FieldMap } from "@/features/case/field-map"
import {
  FieldLegend,
  hasLotData,
  LotList,
  LotPanel,
  ReferencePanel,
} from "@/features/case/field-panels"
import { ringCenter } from "@/lib/geo"
import { powerDailySeriesUrl } from "@/lib/nasa-power-grid"

/**
 * B4. The field: satellite-estimated lots on a map, one lot at a time in a panel,
 * and the reference footprint the water runs were made for.
 */
export function FieldMapBlock({
  bundle,
  id,
}: {
  bundle: CaseBundle
  id?: string
}) {
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null)
  const [isCellView, setCellView] = useState(false)
  const field = bundle.field

  if (bundle.modules.field === "not_available" || field === null) {
    return (
      <BlockSection id={id} title="The field">
        <NotAvailable description="Lots are mapped for Pergamino and Paraná only." />
      </BlockSection>
    )
  }

  const selectedLot = field.lots.find((lot) => lot.field_id === selectedLotId)
  const lotsWithData = field.lots.filter(hasLotData)
  const farmLots = lotsWithData.filter((lot) => lot.is_demo_farm).length
  const zoneLots = lotsWithData.length - farmLots
  const contextOnly = field.lots.length - lotsWithData.length
  const lead =
    lotsWithData.length === 0
      ? `${pluralize(contextOnly, "outline")} of ${bundle.zone_name} ${contextOnly === 1 ? "is" : "are"} on the map for context, with no crop, status or NDVI. They come from satellite imagery.`
      : [
          farmLots > 0 && `${pluralize(farmLots, "lot")} of ${field.farm_name}`,
          zoneLots > 0 &&
            (farmLots > 0
              ? `and ${pluralize(zoneLots, "more field")} of ${bundle.zone_name}`
              : `${pluralize(zoneLots, "field")} of ${bundle.zone_name}`),
          farmLots + zoneLots === 1 ? "carries" : "carry",
          "a crop, a status and an NDVI curve.",
          contextOnly > 0 &&
            `${pluralize(contextOnly, "more outline")} ${contextOnly === 1 ? "gives" : "give"} context.`,
          "All come from satellite imagery. Every crop says whether it comes from an INTA map or from the team's model.",
        ]
          .filter(Boolean)
          .join(" ")

  return (
    <CaseReferencesProvider sources={bundle.sources} glossary={bundle.glossary}>
      <BlockSection id={id} title="The field" lead={lead}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm">
            Farm: <span className="font-medium">{field.farm_name}</span>
          </span>
          {field.farm_name_is_made_up && (
            <Badge variant="outline">Made-up name</Badge>
          )}
          <span className="text-sm text-muted-foreground">
            {field.farm_name_is_made_up
              ? "The name is invented. The outlines, crops and NDVI are satellite estimates."
              : "Outlines, crops and NDVI are satellite estimates."}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
          <div className="flex min-w-0 flex-col gap-3">
            <FieldMap
              field={field}
              selectedLotId={selectedLotId}
              isCellView={isCellView}
              onSelectLot={setSelectedLotId}
              onToggleCellView={() => setCellView((previous) => !previous)}
            />
            <FieldLegend lots={field.lots} />
          </div>
          <Panel className="min-w-0 lg:max-h-136 lg:overflow-y-auto">
            {selectedLot ? (
              <LotPanel
                lot={selectedLot}
                field={field}
                onBack={() => setSelectedLotId(null)}
              />
            ) : (
              <LotList
                lots={field.lots}
                farmName={field.farm_name}
                onSelect={setSelectedLotId}
              />
            )}
          </Panel>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <EvidenceChip meta={field.lots_meta} />
          <span className="text-xs text-muted-foreground">
            The dashed rectangle is the NASA POWER cell: one climate value for
            all the lots inside it.
          </span>
          <a
            href={powerDailySeriesUrl(
              ringCenter(
                (field.reference_field?.polygon ?? field.lots[0].polygon)[0]
              ),
              Number(bundle.decision.decision_date.slice(0, 4))
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg text-xs font-medium text-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Open the raw daily series of the cell
            <ExternalLink className="size-3" />
          </a>
        </div>

        {field.reference_field && (
          <ReferencePanel
            reference={field.reference_field}
            meta={field.reference_meta}
          />
        )}

        {field.limitations.length > 0 && (
          <details className="text-sm">
            <summary className="w-fit cursor-pointer rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
              Limits of the field view
            </summary>
            <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted-foreground">
              {field.limitations.map((limitation) => (
                <li key={limitation}>{limitation}</li>
              ))}
            </ul>
          </details>
        )}
      </BlockSection>
    </CaseReferencesProvider>
  )
}
