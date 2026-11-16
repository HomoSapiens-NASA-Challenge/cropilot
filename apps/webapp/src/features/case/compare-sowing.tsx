import {
  type CaseBundle,
  type SowingWindow,
  sowingWindows,
} from "@cropilot/api"
import { cn } from "cn"
import { CropSwatch } from "@/components/crop-swatch"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatMm, formatShare } from "@/features/case/case-format"
import { ComparisonRow, strategyLabel } from "@/features/case/compare-layout"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { type Locale, translate, useI18n } from "@/lib/i18n"

function shiftLabel(locale: Locale, days: number): string {
  if (days === 0) return translate("on the default date", locale)
  return days < 0
    ? translate("{value1} days earlier", locale, { value1: Math.abs(days) })
    : translate("{value1} days later", locale, { value1: days })
}

function headline(locale: Locale, window: SowingWindow): string {
  const list = new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  })
  const best = window.lowestMedianShifts
  const when =
    best.length > 1 && best.every((shift) => shift < 0)
      ? translate("{value1} to {value2} days earlier", locale, {
          value1: Math.min(...best.map(Math.abs)),
          value2: Math.max(...best.map(Math.abs)),
        })
      : list.format(best.map((shift) => shiftLabel(locale, shift)))
  const crop = translate(window.crop, locale).toLowerCase()
  const lowest = best.includes(0)
    ? translate(
        "Sowing {crop} {when} had the fewest median stress days at the critical stage: {value1}.",
        locale,
        { crop, when, value1: window.lowestMedianStressDays }
      )
    : translate(
        "Sowing {crop} {when} had the fewest median stress days at the critical stage: {value1}, against {value2} on the default date.",
        locale,
        {
          crop,
          when,
          value1: window.lowestMedianStressDays,
          value2: window.defaultMedianStressDays,
        }
      )
  const counts = {
    dates: list.format(
      window.topFewestShifts.map((shift) => shiftLabel(locale, shift))
    ),
    value1: window.topFewestCount,
    value2: window.campaigns.length,
  }
  const mostOften =
    window.topFewestCount === window.campaigns.length
      ? translate(
          "The best date was the same in every campaign: {dates}.",
          locale,
          counts
        )
      : window.topFewestShifts.length > 1
        ? translate(
            "No date held up best every year: {dates} each did in {value1} of {value2} campaigns.",
            locale,
            counts
          )
        : translate(
            "No date held up best every year: {dates} did in {value1} of {value2} campaigns.",
            locale,
            counts
          )
  return `${lowest} ${mostOften}`
}

export function SowingWindowRow({ bundle }: { bundle: CaseBundle }) {
  const { t, locale } = useI18n("case")
  const water = bundle.compare.water
  const windows = sowingWindows(bundle)
  if (!water || windows.length === 0) return null
  const list = new Intl.ListFormat(locale, {
    style: "long",
    type: "conjunction",
  })
  const shortDate = new Intl.DateTimeFormat(
    locale === "es" ? "es-AR" : "en-GB",
    { day: "numeric", month: "short", timeZone: "UTC" }
  )

  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <ComparisonRow
        title={t("Sowing window")}
        description={t(
          "Which summer sowing date held up best in the campaigns that started like this one, by days of water stress at the crop's critical stage."
        )}
        evidence={
          <EvidenceChip
            meta={water.meta}
            scaleLabel={t("Footprint {value1}", { value1: water.field_id })}
            horizon="First summer crop of each analog campaign"
          />
        }
      >
        {windows.map((window) => {
          const crop = t(window.crop)
          const strategies = list.format(
            window.strategyIds.map((id) =>
              strategyLabel(bundle.compare.strategies, id)
            )
          )
          return (
            <Card
              key={window.strategyIds.join(",")}
              className="min-w-0 max-w-full"
              size="sm"
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CropSwatch crop={window.crop} />
                  {crop}
                </CardTitle>
                <p className="text-muted-foreground">
                  {window.strategyIds.length > 1
                    ? t(
                        "In a season like this, {strategies} all start with {crop}, so they share this window.",
                        { strategies, crop: crop.toLowerCase() }
                      )
                    : t(
                        "In a season like this, {strategies} starts with {crop}.",
                        { strategies, crop: crop.toLowerCase() }
                      )}
                </p>
                <p>{headline(locale, window)}</p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    "Stress days: days of water stress in the crop's mid-season (critical) stage. Shaded cells have the fewest stress days; ties are included. Dates use the median day of the year."
                  )}
                </p>
              </CardHeader>
              <Table
                aria-label={t(
                  "{crop} sowing window: stress days by analog campaign",
                  { crop }
                )}
                className="min-w-[720px] tabular-nums"
              >
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">{t("Campaign")}</TableHead>
                    {window.shifts.map((shift) => (
                      <TableHead
                        key={shift.shiftDays}
                        scope="col"
                        className="text-right"
                      >
                        <span className="block first-letter:uppercase">
                          {shiftLabel(locale, shift.shiftDays)}
                        </span>
                        <span className="font-normal text-muted-foreground">
                          {shortDate.format(
                            new Date(`${shift.typicalSowingDate}T00:00:00Z`)
                          )}
                        </span>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {window.campaigns.map((campaign) => (
                    <TableRow key={campaign.campaign}>
                      <TableHead scope="row">{campaign.campaign}</TableHead>
                      {campaign.cells.map((cell, index) => (
                        <TableCell
                          key={window.shifts[index]?.shiftDays}
                          className={cn(
                            "text-right",
                            cell.stressDays === campaign.fewestStressDays &&
                              "bg-muted font-medium"
                          )}
                        >
                          {cell.stressDays}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableHead scope="row">{t("Median")}</TableHead>
                    {window.shifts.map((shift) => (
                      <TableCell
                        key={shift.shiftDays}
                        className={cn(
                          "text-right",
                          shift.medianStressDays ===
                            window.lowestMedianStressDays &&
                            "bg-muted font-medium"
                        )}
                      >
                        {shift.medianStressDays}
                        <span className="block text-xs font-normal text-muted-foreground">
                          {t("Median deficit {value1}", {
                            value1: formatMm(shift.medianDeficitMm),
                          })}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                  <TableRow>
                    <TableHead scope="row">{t("Fewest stress days")}</TableHead>
                    {window.shifts.map((shift) => (
                      <TableCell
                        key={shift.shiftDays}
                        className={cn(
                          "text-right",
                          shift.fewestCount === window.topFewestCount &&
                            "bg-muted font-medium"
                        )}
                      >
                        {t("{value1} of {value2}", {
                          value1: shift.fewestCount,
                          value2: window.campaigns.length,
                        })}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableBody>
              </Table>
            </Card>
          )
        })}
        <p className="text-xs text-muted-foreground">
          {t(
            "One reference footprint ({value1}) of {value2}, {value3} m of soil starting at {value4} of available water, NASA POWER weather. Not a sowing recommendation: check soil temperature, waterlogging and the cultivar on the lot.",
            {
              value1: water.field_id,
              value2: bundle.zone_name,
              value3: water.default_depth_m,
              value4: formatShare(water.default_initial_water_fraction),
            }
          )}
        </p>
      </ComparisonRow>
    </div>
  )
}
