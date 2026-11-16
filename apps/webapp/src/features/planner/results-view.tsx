import type { RotationPlanResult, RotationPlanRun } from "@cropilot/api"
import { cn } from "cn"
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BacktestTimeline } from "@/features/planner/backtest-timeline"
import { ConvergenceChart } from "@/features/planner/convergence-chart"
import { DecisionMap } from "@/features/planner/decision-map"
import { HeldOutChart } from "@/features/planner/held-out-chart"
import { MethodBlock } from "@/features/planner/method-block"
import { NextCampaignCard } from "@/features/planner/next-campaign-card"
import { PipelineStages } from "@/features/planner/pipeline-stages"
import {
  formatScore,
  formatShare,
  sourcesById,
} from "@/features/planner/planner-format"
import type { Situation } from "@/features/planner/planner-situation"
import { PolicyComparison } from "@/features/planner/policy-comparison"
import { PriorityTradeoffCard } from "@/features/planner/priority-tradeoff-card"
import { ResultSection } from "@/features/planner/result-section"
import { RunSummary } from "@/features/planner/training-console"
import { VerdictBlock } from "@/features/planner/verdict-block"
import { useI18n } from "@/lib/i18n"

const TABS = [
  { id: "plan", label: "Plan" },
  { id: "evidence", label: "Evidence" },
  { id: "learning", label: "Learning" },
  { id: "method", label: "Method" },
] as const

type TabId = (typeof TABS)[number]["id"]

function isTabId(value: unknown): value is TabId {
  return TABS.some((tab) => tab.id === value)
}

function LearningTab({
  run,
  result,
}: {
  run: RotationPlanRun
  result: RotationPlanResult
}) {
  const { t } = useI18n("app")

  const { verdict } = result
  return (
    <>
      <ResultSection
        title={t("How this run computed")}
        lead={t(
          "The six stages of the run, with the work each one did. Counts are real simulated units; times are measured on the server."
        )}
        sources={sourcesById(result.sources, ["nasa-power", "magyp"])}
      >
        <RunSummary run={run} />
        <PipelineStages stages={run.stages} />
      </ResultSection>
      <ResultSection
        title={t("How the agent learned")}
        lead={t(
          "The agent picks the optimal action in {value1} of the states, and its expected score differs from the exact optimum by {value2} per campaign.",
          {
            value1: formatShare(verdict.agent_agreement_share),
            value2: formatScore(verdict.agent_minus_optimal_expected),
          }
        )}
        sources={sourcesById(result.sources, ["nasa-power"])}
      >
        <ConvergenceChart
          points={run.convergence}
          optimalScore={run.optimal_score}
          episodesPerAgent={result.episodes}
          agentSeeds={run.agent_seeds}
        />
      </ResultSection>
    </>
  )
}

/**
 * A finished run: the verdict above four tabs. The tab lives here, outside the element keyed
 * by the run, so a new run replays the entrance without sending the reader back to Plan.
 */
export function ResultsView({
  run,
  result,
  isDimmed,
  situation,
  onSituationChange,
}: {
  run: RotationPlanRun
  result: RotationPlanResult
  isDimmed: boolean
  situation: Situation
  onSituationChange: (situation: Situation) => void
}) {
  const { t } = useI18n("app")

  const [tab, setTab] = useState<TabId>("plan")

  return (
    <div
      // A different run replays the entrance, so new results do not just swap in.
      key={run.run_id}
      inert={isDimmed}
      className={cn(
        "flex animate-reveal flex-col gap-10 transition-opacity duration-300 motion-reduce:animate-none motion-reduce:transition-none",
        isDimmed && "opacity-50"
      )}
    >
      <VerdictBlock result={result} />

      <Tabs
        value={tab}
        onValueChange={(next) => {
          if (isTabId(next)) setTab(next)
        }}
        className="gap-6"
      >
        <TabsList variant="line" className="h-10 w-full justify-start gap-2">
          {TABS.map((entry) => (
            <TabsTrigger
              key={entry.id}
              value={entry.id}
              className="h-9 flex-none px-3"
            >
              {t(entry.label)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="plan" className="flex flex-col gap-6">
          <NextCampaignCard
            result={result}
            situation={situation}
            onSituationChange={onSituationChange}
          />
          <DecisionMap
            result={result}
            situation={situation}
            onSituationChange={onSituationChange}
          />
          <PriorityTradeoffCard result={result} />
        </TabsContent>
        <TabsContent value="evidence" className="flex flex-col gap-6">
          <HeldOutChart result={result} />
          <PolicyComparison result={result} />
          <BacktestTimeline result={result} />
        </TabsContent>
        <TabsContent value="learning" className="flex flex-col gap-6">
          <LearningTab run={run} result={result} />
        </TabsContent>
        <TabsContent value="method" className="flex flex-col gap-6">
          <MethodBlock result={result} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
