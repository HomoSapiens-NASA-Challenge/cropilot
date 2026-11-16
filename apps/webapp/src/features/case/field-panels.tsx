import type { FieldBlock, Lot, ReferenceField } from "@cropilot/api"
import { ArrowLeft } from "lucide-react"
import type { ReactNode } from "react"
import { CropSwatch } from "@/components/crop-swatch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Panel } from "@/features/case/block-frame"
import {
  formatDecimal,
  formatLotName,
  formatMm,
  formatShare,
  formatSigned,
  formatWhole,
  pluralize,
} from "@/features/case/case-format"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { Term } from "@/features/case/glossary-term"
import {
  monthLabel,
  NdviChart,
  type NdviSeries,
} from "@/features/case/ndvi-chart"
import {
  CROP_IDS,
  CROPS,
  cropOf,
  LOT_STATUS,
  LOT_STATUS_IDS,
} from "@/lib/data-colors"
import { translate, useI18n } from "@/lib/i18n"

const SOURCE_LABEL = { INTA: "INTA map", model: "Team model" } as const

const LIST_LIMIT = 30

function StatusDot({ status }: { status: Lot["status"] }) {
  const style = status ? LOT_STATUS[status] : null
  return (
    <span
      aria-hidden
      className="inline-block size-2.5 shrink-0 rounded-full border-2 bg-background"
      style={{ borderColor: style?.color ?? "var(--muted-foreground)" }}
    />
  )
}

function statusLabel(status: Lot["status"]): string {
  return translate(status ? LOT_STATUS[status].label : "No status")
}

/** An outline with neither a crop nor a status is there for context only. */
export function hasLotData(lot: Lot): boolean {
  return lot.latest_crop !== null || lot.status !== null
}

/** Legend of the map: the crops that are on it and what each outline means. */
export function FieldLegend({ lots }: { lots: ReadonlyArray<Lot> }) {
  const { t } = useI18n("case")

  const withData = lots.filter(hasLotData)
  const onMap = new Set(withData.map((lot) => cropOf(lot.latest_crop)))
  const cropIds = CROP_IDS.filter((crop) => onMap.has(crop))
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-3 text-xs text-muted-foreground">
      <div className="flex flex-col gap-1.5">
        <span className="font-medium text-foreground">
          {t("Fill: latest crop")}
        </span>
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {cropIds.map((crop) => (
            <li key={crop} className="flex items-center gap-1.5">
              <CropSwatch crop={CROPS[crop].label} />
              {t(CROPS[crop].label)}
            </li>
          ))}
          {withData.length < lots.length && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block size-2.5 shrink-0 rounded-sm border border-muted-foreground/60 bg-muted"
              />
              {t("Faint outline: no data, context only")}
            </li>
          )}
        </ul>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="font-medium text-foreground">
          {t("Outline: status")}
        </span>
        <ul className="flex flex-wrap gap-x-3 gap-y-1">
          {LOT_STATUS_IDS.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <StatusDot status={status} />
              {t(LOT_STATUS[status].label)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Measure({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-secondary px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-light tracking-tight tabular-nums">
        {value}
      </span>
    </div>
  )
}

function missingOr<T>(value: T | null, format: (value: T) => string): string {
  return value === null ? translate("Missing") : format(value)
}

/** One lot: crop per campaign, NDVI against the zone, vigor, purity and the reason of its status. */
export function LotPanel({
  lot,
  field,
  onBack,
}: {
  lot: Lot
  field: FieldBlock
  onBack: () => void
}) {
  const { t } = useI18n("case")

  const tickLabels = field.ndvi_months.map(monthLabel)
  const series: NdviSeries[] = [
    {
      id: "lot",
      label: "This lot",
      values: lot.ndvi_curve,
      tone: "primary",
    },
    {
      id: "zone",
      label: "Zone, same crop",
      values: lot.zone_ndvi_curve,
      tone: "muted",
    },
  ]

  if (!hasLotData(lot)) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("Back to the lots")}
            onClick={onBack}
          >
            <ArrowLeft />
          </Button>
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="font-medium">{formatLotName(lot.name)}</h3>
            <p className="text-sm text-muted-foreground tabular-nums">
              {t("{value1} ha", { value1: formatWhole(lot.area_ha) })}
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(
            "This outline carries no crop, status or NDVI. It is on the map for context: the numbers exist only for the lots of {value1}.",
            { value1: field.farm_name }
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t("Back to the lots")}
          onClick={onBack}
        >
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 flex-col gap-1">
          <h3 className="font-medium">{formatLotName(lot.name)}</h3>
          <p className="text-sm text-muted-foreground tabular-nums">
            {formatWhole(lot.area_ha)}
            {t(" ha")}
            {lot.is_demo_farm && ` · part of ${field.farm_name}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <StatusDot status={lot.status} />
          <span className="font-medium">{statusLabel(lot.status)}</span>
          <span className="text-xs text-muted-foreground">
            {t("latest campaign, {value1}", { value1: lot.latest_campaign })}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {t(lot.status_reason ?? "No reason recorded for this status.")}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">{t("Crop per campaign")}</h4>
        <ul className="flex flex-col divide-y rounded-lg border">
          {lot.history.map((entry) => (
            <li
              key={entry.campaign}
              className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
            >
              <span className="tabular-nums">{entry.campaign}</span>
              <span className="flex items-center gap-2">
                <CropSwatch crop={entry.crop} />
                {t(entry.crop ?? "Not classified")}
                <Badge variant="outline">{t(SOURCE_LABEL[entry.source])}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-medium">
          <Term term="NDVI">{t("NDVI")}</Term>
          {t(", September to May")}
        </h4>
        <NdviChart series={series} tickLabels={tickLabels} />
        <p className="flex flex-wrap gap-x-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="h-0.5 w-4 bg-primary" />
            {t("This lot, ")}
            {lot.latest_campaign}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-0 w-4 border-t-2 border-dashed border-muted-foreground"
            />
            {t("Zone median for the same crop")}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Measure
          label={t("Vigor gap vs zone")}
          value={missingOr(lot.vigor_gap, (value) => formatSigned(value, 2))}
        />
        <Measure
          label={t("Vigor (peak NDVI)")}
          value={missingOr(lot.vigor_ndvi, (value) => formatDecimal(value, 2))}
        />
        <Measure
          label={t("Crop purity")}
          value={missingOr(lot.crop_purity, formatShare)}
        />
        <Measure
          label={t("Evenness")}
          value={missingOr(lot.evenness, formatShare)}
        />
      </div>

      <EvidenceChip
        meta={field.lots_meta}
        horizon={t("Campaign {value1}", { value1: lot.latest_campaign })}
      />
    </div>
  )
}

/** List order of the statuses: the ones that need attention first, `ok` last. */
const LIST_ORDER: ReadonlyArray<NonNullable<Lot["status"]>> = [
  "alert",
  "watch",
  "check",
  "bare",
  "ok",
]

/**
 * The farm's lots that carry data as a list, worst status first. When the zone has no
 * farm lots, every lot with data is listed instead.
 */
export function LotList({
  lots,
  farmName,
  onSelect,
}: {
  lots: ReadonlyArray<Lot>
  farmName: string
  onSelect: (fieldId: string) => void
}) {
  const { t } = useI18n("case")

  const severity = (lot: Lot) =>
    lot.status ? LIST_ORDER.indexOf(lot.status) : LIST_ORDER.length
  const withData = lots.filter(hasLotData)
  const farmLots = withData.filter((lot) => lot.is_demo_farm)
  const listed = farmLots.length > 0 ? farmLots : withData
  const ordered = [...listed].sort(
    (a, b) =>
      severity(a) - severity(b) ||
      a.name.localeCompare(b.name, undefined, { numeric: true })
  )
  const shown = ordered.slice(0, LIST_LIMIT)
  const unlistedWithData = withData.length - listed.length
  const contextCount = lots.length - withData.length

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        {t(
          "Select a lot on the map or in the list to see its crops, NDVI and status."
        )}
        {farmLots.length > 0 && ` These are the lots of ${farmName}.`}
      </p>
      <ul className="flex flex-col gap-1">
        {shown.map((lot) => (
          <li key={lot.field_id}>
            <button
              type="button"
              onClick={() => onSelect(lot.field_id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <CropSwatch crop={lot.latest_crop} />
                <span className="truncate">{formatLotName(lot.name)}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {t(lot.latest_crop ?? "No crop")}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
                <StatusDot status={lot.status} />
                {statusLabel(lot.status)}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {ordered.length > shown.length && (
        <p className="text-xs text-muted-foreground">
          {t("Showing {value1} of {value2} lots.", {
            value1: shown.length,
            value2: ordered.length,
          })}
        </p>
      )}
      {unlistedWithData > 0 && (
        <p className="text-xs text-muted-foreground">
          {t(
            "{value1} of the zone {value2} the same data: select one on the map.",
            {
              value1: pluralize(unlistedWithData, "more field"),
              value2: unlistedWithData === 1 ? t("has") : t("have"),
            }
          )}
        </p>
      )}
      {contextCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {t(
            "{value1} more outlines of the zone are on the map for context. They carry no crop, status or NDVI.",
            { value1: contextCount }
          )}
        </p>
      )}
    </div>
  )
}

const SEASON_LABEL = {
  annual: "Annual",
  winter: "Winter",
  summer: "Summer",
} as const

/** The footprint the water runs were made for: its crop history, its NDVI and its soil. */
export function ReferencePanel({
  reference,
  meta,
}: {
  reference: ReferenceField
  meta: FieldBlock["reference_meta"]
}) {
  const { t } = useI18n("case")

  const sampled = reference.ndvi.filter((sample) => sample.ndvi_mean !== null)
  const meanCoverage =
    reference.ndvi.reduce((total, sample) => total + sample.valid_fraction, 0) /
    Math.max(reference.ndvi.length, 1)
  const series: NdviSeries[] = [
    {
      id: "footprint",
      label: t("Footprint {value1}", { value1: reference.field_id }),
      values: reference.ndvi.map((sample) => sample.ndvi_mean),
      tone: "primary",
      dotOpacity: reference.ndvi.map(
        (sample) => 0.2 + 0.8 * sample.valid_fraction
      ),
    },
  ]
  const tickLabels = reference.ndvi.map((sample, position) =>
    sample.month.endsWith("-01") || position === 0
      ? sample.month.slice(0, 4)
      : null
  )

  return (
    <Panel className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="font-medium">
          {t("Reference footprint {value1}", { value1: reference.field_id })}
        </h3>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {t(reference.note)}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="tabular-nums">
            {formatDecimal(reference.area_ha, 1)}
            {t(" ha")}
          </Badge>
          {meta && <EvidenceChip meta={meta} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="flex min-w-0 flex-col gap-2">
          <h4 className="text-sm font-medium">{t("INTA crop history")}</h4>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("Campaign")}</TableHead>
                  <TableHead>{t("Season")}</TableHead>
                  <TableHead>{t("Crop")}</TableHead>
                  <TableHead className="text-right">
                    {t("Of footprint")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reference.crop_history.map((entry) => (
                  <TableRow
                    key={`${entry.campaign}-${entry.season}-${entry.crop}`}
                  >
                    <TableCell className="tabular-nums">
                      {entry.campaign}
                    </TableCell>
                    <TableCell>{t(SEASON_LABEL[entry.season])}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2">
                        <CropSwatch crop={entry.crop} />
                        {t(entry.crop)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatShare(entry.fraction_of_field)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">
              {t("Monthly ")}
              <Term term="NDVI">{t("NDVI")}</Term>
            </h4>
            <NdviChart series={series} tickLabels={tickLabels} />
            <p className="text-xs text-muted-foreground tabular-nums">
              {t(
                "{value1} monthly values out of {value2} months. Valid coverage averages {value3} of the footprint. Fainter dots have less valid coverage.",
                {
                  value1: sampled.length,
                  value2: reference.ndvi.length,
                  value3: formatShare(meanCoverage),
                }
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">
              {t("Soil water capacity by depth")}
            </h4>
            <ul className="flex flex-col divide-y rounded-lg border text-sm">
              {reference.soil_capacity.map((entry) => (
                <li
                  key={entry.depth_m}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <span className="text-muted-foreground">
                    {t("{value1} m", { value1: entry.depth_m })}
                  </span>
                  <span className="tabular-nums">
                    {formatMm(entry.capacity_mm)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Panel>
  )
}
