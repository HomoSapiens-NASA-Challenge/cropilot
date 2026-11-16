import type { CaseBundle, Claim, Strategy } from "@cropilot/api"
import { cn } from "cn"
import { ArrowRight, ChevronDown } from "lucide-react"
import { Fragment, useState } from "react"
import { CropSwatch } from "@/components/crop-swatch"
import { Badge } from "@/components/ui/badge"
import {
  BlockSection,
  NotAvailable,
  NotComputedRow,
  Panel,
} from "@/features/case/block-frame"
import { CaseReferencesProvider } from "@/features/case/case-context"
import {
  ComparisonRow,
  StrategyCell,
  StrategyGrid,
} from "@/features/case/compare-layout"
import {
  type MarginKind,
  MarginRows,
  RiskSummary,
  UnharvestedRow,
} from "@/features/case/compare-margins"
import { SowingWindowRow } from "@/features/case/compare-sowing"
import { WaterRow } from "@/features/case/compare-water"
import { EvidenceChip } from "@/features/case/evidence-chip"
import { useI18n } from "@/lib/i18n"

const ANSWERS = [
  { key: "why", title: "Why it is suggested" },
  { key: "evidence", title: "The evidence behind it" },
  { key: "benefits", title: "The benefits it brings" },
  { key: "missing", title: "What information is missing" },
  { key: "local_review", title: "Check in the field" },
] as const satisfies ReadonlyArray<{
  key: keyof Strategy["answers"]
  title: string
}>

function StrategyHeader({ strategy }: { strategy: Strategy }) {
  const { t } = useI18n("case")

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-card p-4",
        strategy.is_current && "border-primary/50"
      )}
    >
      <div className="flex flex-col items-start gap-2">
        {strategy.is_current && <Badge>{t("Now · to confirm")}</Badge>}
        <h3 className="font-medium text-balance">{t(strategy.label)}</h3>
      </div>
      <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
        {strategy.sequence.map((crop, position) => (
          // The same crop can repeat in a rotation, so the position is part of the key.
          <Fragment key={`${crop}-${position}`}>
            {position > 0 && <ArrowRight aria-hidden className="size-3" />}
            <span className="inline-flex items-center gap-1">
              <CropSwatch crop={crop} />
              {t(crop)}
            </span>
          </Fragment>
        ))}
      </p>
      {strategy.current_note && (
        <p className="text-sm text-muted-foreground">
          {t(strategy.current_note)}
        </p>
      )}
    </article>
  )
}

function ClaimList({ claims }: { claims: ReadonlyArray<Claim> }) {
  const { t } = useI18n("case")

  if (claims.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("None listed.")}</p>
  }
  return (
    <ul className="flex flex-col gap-3">
      {claims.map((claim) => (
        <li key={claim.text} className="flex flex-col gap-1.5">
          <p className="text-sm">{t(claim.text)}</p>
          <EvidenceChip sourceIds={claim.source_ids} />
        </li>
      ))}
    </ul>
  )
}

/** The five answers the challenge asks of every strategy, each one opening on its claims. */
function AnswerList({ strategy }: { strategy: Strategy }) {
  const { t } = useI18n("case")

  return (
    <div className="flex flex-col divide-y rounded-lg border">
      {ANSWERS.map((answer) => (
        <details
          key={answer.key}
          open={answer.key === "why"}
          className="group/answer px-3 py-2.5"
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50 [&::-webkit-details-marker]:hidden">
            {t(answer.title)}
            <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open/answer:rotate-180" />
          </summary>
          <div className="pt-2.5">
            <ClaimList claims={strategy.answers[answer.key]} />
          </div>
        </details>
      ))}
    </div>
  )
}

/** Cropilot picks no winner: each row says what it measures and at what scale and horizon. */
export function CompareBlock({
  bundle,
  id,
}: {
  bundle: CaseBundle
  id?: string
}) {
  const { t } = useI18n("case")

  const [marginKind, setMarginKind] = useState<MarginKind>("gross")
  const { compare, modules } = bundle

  return (
    <CaseReferencesProvider sources={bundle.sources} glossary={bundle.glossary}>
      <BlockSection
        id={id}
        title={t("Compare rotations")}
        lead={t(
          "{value1} rotations for {value2}, side by side. Margins and water are shown for the real campaigns that started like {value3}.",
          {
            value1: compare.strategies.length,
            value2: bundle.zone_name,
            value3: bundle.years_like_this.current.campaign,
          }
        )}
      >
        <StrategyGrid>
          {compare.strategies.map((strategy) => (
            <StrategyHeader key={strategy.strategy_id} strategy={strategy} />
          ))}
        </StrategyGrid>

        {modules.margins === "available" ? (
          <>
            <MarginRows
              compare={compare}
              kind={marginKind}
              onKindChange={setMarginKind}
            />
            <UnharvestedRow compare={compare} />
          </>
        ) : (
          <NotAvailable
            description={t(
              "Margins by analog campaign need market data for this zone."
            )}
          />
        )}

        {modules.water === "available" && compare.water ? (
          <WaterRow
            compare={compare}
            water={compare.water}
            campaigns={bundle.years_like_this.campaigns}
          />
        ) : (
          <ComparisonRow
            title={t("Water: unmet crop water on the field footprint")}
            evidence={null}
          >
            <NotAvailable
              title={t("Not available for this region yet")}
              description={t(
                "The water runs exist for the Pergamino reference footprint only."
              )}
              className="py-8"
            />
          </ComparisonRow>
        )}

        {modules.water === "available" && <SowingWindowRow bundle={bundle} />}

        <ComparisonRow
          title={t("The five answers, for every strategy")}
          description={t(
            "Why it is suggested, the evidence, the benefits, what is missing and what to check in the field. Every claim names its sources."
          )}
          evidence={null}
        >
          <StrategyGrid>
            {compare.strategies.map((strategy) => (
              <StrategyCell key={strategy.strategy_id} strategy={strategy}>
                <AnswerList strategy={strategy} />
              </StrategyCell>
            ))}
          </StrategyGrid>
        </ComparisonRow>

        {modules.margins === "available" && <RiskSummary compare={compare} />}

        <Panel className="flex flex-col gap-3">
          <h3 className="font-medium">{t("Not computed")}</h3>
          <ul className="flex flex-col gap-2">
            {compare.not_computed.map((entry) => (
              <li key={entry.metric}>
                <NotComputedRow
                  title={t(entry.metric)}
                  reason={t(entry.reason)}
                />
              </li>
            ))}
          </ul>
        </Panel>

        <p className="text-center text-lg font-light tracking-tight text-balance">
          {t("Cropilot picks no winner. You and the producer decide.")}
        </p>
      </BlockSection>
    </CaseReferencesProvider>
  )
}
