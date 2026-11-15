import type { CampaignNote, CampaignPoint, CaseBundle } from "@cropilot/api"
import { cn } from "cn"
import { Pin, TriangleAlert } from "lucide-react"
import { useState } from "react"
import { SegmentedControl } from "@/components/segmented-control"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  BlockSection,
  Callout,
  NotAvailable,
  Panel,
} from "@/features/case/block-frame"
import { CaseReferencesProvider } from "@/features/case/case-context"
import {
  ENSO_PHASE_LABEL,
  formatPercentSigned,
  formatSigned,
  formatWetness,
  PROVENANCE,
  pluralize,
} from "@/features/case/case-format"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { Term } from "@/features/case/glossary-term"
import {
  YearsScatter,
  YIELD_CROP_LABEL,
  type YieldCrop,
  yieldOf,
} from "@/features/case/years-scatter"
import { anomalyColor } from "@/lib/data-colors"

const NOTE_KIND_LABEL = {
  worst_on_record: "Worst on record",
  june_dry_soil_alert: "June dry-soil alert",
  counterexample: "Counterexample",
  dated_event: "Dated event",
  strongest_start: "Strongest start",
} as const satisfies Record<CampaignNote["kind"], string>

const CROP_OPTIONS = [
  { value: "soybean", label: YIELD_CROP_LABEL.soybean },
  { value: "maize", label: YIELD_CROP_LABEL.maize },
] as const

const LEGEND_STEPS = [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1] as const

/** Colors of the yield anomaly, from the loss limit to the gain limit. */
function AnomalyLegend({ limitPct }: { limitPct: number }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <span>{formatPercentSigned(-limitPct)} or lower</span>
        <span aria-hidden className="flex gap-0.5">
          {LEGEND_STEPS.map((step) => (
            <span
              key={step}
              className="block size-4 rounded-full ring-1 ring-foreground/20"
              style={{
                backgroundColor: anomalyColor(step * limitPct, limitPct),
              }}
            />
          ))}
        </span>
        <span>{formatPercentSigned(limitPct)} or higher</span>
        <span>yield vs trend</span>
      </div>
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="block size-3.5 rounded-full border-2 border-foreground/50 bg-background"
        />
        Hollow: yield modeled
      </span>
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="block size-3 rounded-full border-2 border-dashed border-muted-foreground bg-background"
        />
        No yield value
      </span>
      <span className="flex items-center gap-1.5">
        <span
          aria-hidden
          className="block size-4 rounded-full border-[1.5px] border-foreground"
        />
        Analog
      </span>
      <span className="flex items-center gap-1.5">
        <Pin className="size-3.5" />
        Campaign note
      </span>
    </div>
  )
}

function AnomalyCell({
  campaign,
  crop,
  limitPct,
}: {
  campaign: CampaignPoint
  crop: YieldCrop
  limitPct: number
}) {
  const { anomalyPct, provenance } = yieldOf(campaign, crop)
  if (anomalyPct === null) {
    return <span className="text-muted-foreground">Missing</span>
  }
  return (
    <span className="inline-flex items-center gap-2 tabular-nums">
      <span
        aria-hidden
        className={cn(
          "block size-3 shrink-0 rounded-full",
          provenance === "modeled"
            ? "border-2 bg-background"
            : "ring-1 ring-foreground/20"
        )}
        style={
          provenance === "modeled"
            ? { borderColor: anomalyColor(anomalyPct, limitPct) }
            : { backgroundColor: anomalyColor(anomalyPct, limitPct) }
        }
      />
      {formatPercentSigned(anomalyPct)}
      <span className="text-xs text-muted-foreground">
        {PROVENANCE[provenance].label}
      </span>
    </span>
  )
}

function AnalogTable({
  analogs,
  crop,
  limitPct,
}: {
  analogs: ReadonlyArray<CampaignPoint>
  crop: YieldCrop
  limitPct: number
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">Rank</TableHead>
          <TableHead>Campaign</TableHead>
          <TableHead className="hidden sm:table-cell">Phase</TableHead>
          <TableHead className="text-right">ONI</TableHead>
          <TableHead className="text-right">
            <Term term="Soil wetness">Wetness</Term>
          </TableHead>
          <TableHead className="hidden text-right md:table-cell">
            Distance
          </TableHead>
          <TableHead>{YIELD_CROP_LABEL[crop]} yield vs trend</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {analogs.map((campaign) => (
          <TableRow key={campaign.campaign}>
            <TableCell className="tabular-nums">
              {campaign.analog_rank}
            </TableCell>
            <TableCell className="font-medium">{campaign.campaign}</TableCell>
            <TableCell className="hidden sm:table-cell">
              {ENSO_PHASE_LABEL[campaign.enso_phase]}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatSigned(campaign.oni_jas)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {campaign.soil_wetness_end_aug === null
                ? "Missing"
                : formatWetness(campaign.soil_wetness_end_aug)}
            </TableCell>
            <TableCell className="hidden text-right tabular-nums md:table-cell">
              {campaign.analog_distance === null
                ? "Missing"
                : campaign.analog_distance.toFixed(2)}
            </TableCell>
            <TableCell>
              <AnomalyCell
                campaign={campaign}
                crop={crop}
                limitPct={limitPct}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

/**
 * B2. The campaigns that started like this one: all past campaigns on a scatter of the
 * two signals, the analogs ranked below it, the method, and its measured limit.
 */
export function YearsBlock({
  bundle,
  id,
}: {
  bundle: CaseBundle
  id?: string
}) {
  const [crop, setCrop] = useState<YieldCrop>("soybean")
  const years = bundle.years_like_this

  if (bundle.modules.years_like_this === "not_available") {
    return (
      <BlockSection id={id} title="Years like this">
        <NotAvailable />
      </BlockSection>
    )
  }

  const { campaigns, current, method, signals, yields, backtest } = years
  const analogs = campaigns
    .filter((campaign) => campaign.is_analog)
    .sort((a, b) => (a.analog_rank ?? 0) - (b.analog_rank ?? 0))
  const withYield = campaigns.filter(
    (campaign) => yieldOf(campaign, crop).anomalyPct !== null
  )
  const modeledCount = withYield.filter(
    (campaign) => yieldOf(campaign, crop).provenance === "modeled"
  ).length
  const withoutWetness = campaigns.filter(
    (campaign) => campaign.soil_wetness_end_aug === null
  )
  const largestAnomaly = Math.max(
    0,
    ...withYield.map((campaign) =>
      Math.abs(yieldOf(campaign, crop).anomalyPct ?? 0)
    )
  )
  const limitPct = Math.max(10, Math.ceil(largestAnomaly / 10) * 10)
  const notes = campaigns.flatMap((campaign) =>
    campaign.notes.map((note) => ({ campaign: campaign.campaign, note }))
  )

  return (
    <CaseReferencesProvider sources={bundle.sources} glossary={bundle.glossary}>
      <BlockSection
        id={id}
        title="Years like this"
        lead={`Every past campaign at ${bundle.zone_name}, placed by the two signals known at the end of August. The ${pluralize(analogs.length, "analog")} closest to ${current.campaign} are ringed and ranked.`}
      >
        <Panel className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              <span className="font-medium tabular-nums">
                n = {campaigns.length}
              </span>{" "}
              <span className="text-muted-foreground">
                campaigns, {analogs.length} analogs (k = {method.k}).{" "}
                {YIELD_CROP_LABEL[crop]} yield is known for {withYield.length}
                {modeledCount > 0 && `, ${modeledCount} of them modeled`}.
              </span>
            </p>
            <SegmentedControl
              label="Crop for the yield color"
              value={crop}
              options={CROP_OPTIONS}
              onChange={setCrop}
            />
          </div>
          <YearsScatter
            campaigns={campaigns}
            current={current}
            crop={crop}
            yieldLimitPct={limitPct}
          />
          <AnomalyLegend limitPct={limitPct} />
          {current.outside_historical_range && (
            <p className="text-sm text-muted-foreground">
              {current.campaign} sits outside the cloud: its{" "}
              <Term term="ONI">ONI</Term> of {formatSigned(current.oni_jas)} is
              higher than every past campaign, so there is no dot near it.
            </p>
          )}
          {withoutWetness.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Not on the plot, no soil wetness value:{" "}
              {withoutWetness.map((campaign) => campaign.campaign).join(", ")}.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <EvidenceChip
              meta={signals}
              horizon="ONI July to September, soil wetness 22 to 31 August"
            />
            <EvidenceChip
              meta={yields}
              horizon="One campaign, anomaly against the trend"
            />
          </div>
        </Panel>

        <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
          <Panel className="flex min-w-0 flex-col gap-3">
            <h3 className="font-medium">
              The {pluralize(analogs.length, "analog")}, closest first
            </h3>
            <AnalogTable analogs={analogs} crop={crop} limitPct={limitPct} />
          </Panel>
          <Panel className="flex flex-col gap-3">
            <h3 className="font-medium">Method</h3>
            <dl className="flex flex-col gap-2.5 text-sm">
              <div>
                <dt className="text-muted-foreground">Analogs (k)</dt>
                <dd className="tabular-nums">{method.k}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Features</dt>
                <dd>{method.features.join(", ")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Distance</dt>
                <dd>{method.distance}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Candidates</dt>
                <dd>{method.candidates}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Phase rule</dt>
                <dd>{method.phase_rule}</dd>
              </div>
            </dl>
          </Panel>
        </div>

        <Callout icon={TriangleAlert} title="A measured limit of this method">
          <p>{backtest.text}</p>
          <EvidenceChip sourceIds={backtest.source_ids} />
        </Callout>

        {notes.length > 0 && (
          <Panel className="flex flex-col gap-3">
            <h3 className="font-medium">Campaign notes</h3>
            <ul className="flex flex-col divide-y">
              {notes.map(({ campaign, note }) => (
                <li
                  key={`${campaign}-${note.kind}`}
                  className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{campaign}</span>
                    <Badge variant="outline">
                      {NOTE_KIND_LABEL[note.kind]}
                    </Badge>
                  </span>
                  <p className="text-muted-foreground">{note.text}</p>
                  <EvidenceChip sourceIds={note.source_ids} />
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </BlockSection>
    </CaseReferencesProvider>
  )
}
