import type { RotationPlanResult } from "@cropilot/api"
import {
  campaignName,
  formatOutcomeWithUnit,
  formatShare,
  formatWhole,
} from "@/features/planner/planner-format"
import { OUTCOMES } from "@/features/planner/planner-outcomes"
import { ResultSection } from "@/features/planner/result-section"

const EXPLANATIONS = [
  {
    term: "Decision process (MDP)",
    text: "A simplified map of the choices on a farm. Each state is what is known when deciding, such as the soil water and the El Niño phase, and in August also the winter crop. Each action is a crop, or fallow, for the coming season. What every action earns comes from the simulator, run on real weather.",
  },
  {
    term: "Exact solver",
    text: "Backward induction. It starts from the last campaign of the horizon, finds the best action in every state, and works back to the first. The map is small enough to check every option, so its answer is the true optimum of the map, not an approximation.",
  },
  {
    term: "Q-learning agent",
    text: "A learner that never sees the map. It plays thousands of simulated campaigns, tries actions and keeps a running estimate of how good each one is. Because the true optimum is known, the convergence chart shows how close learning gets to it, and the decision map shows where it still chooses differently.",
  },
] as const

/** What the planner does in plain words, how the score is built, what it assumes, and its sources. */
export function MethodBlock({ result }: { result: RotationPlanResult }) {
  const optimal = result.policies.find((policy) => policy.kind === "optimal")
  const fitted = optimal
    ? `${campaignName(optimal.train.first_year)} to ${campaignName(optimal.train.last_year)}`
    : "the training campaigns"
  const heldOut = optimal
    ? `${campaignName(optimal.test.first_year)} to ${campaignName(optimal.test.last_year)}`
    : "the held-out campaigns"

  return (
    <ResultSection
      title="Method and sources"
      lead="How the answer is computed, what it assumes and where the data comes from."
    >
      <div className="flex flex-col gap-8">
        <dl className="grid gap-6 md:grid-cols-3">
          {EXPLANATIONS.map((item) => (
            <div key={item.term} className="flex flex-col gap-1.5">
              <dt className="text-sm font-medium">{item.term}</dt>
              <dd className="text-sm text-muted-foreground">{item.text}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">How the score is built</h3>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Each outcome is divided by its standard deviation across the fitted
            campaigns, so margin in dollars and drainage in millimetres can be
            added. Margin counts up and the other four count down, each times
            its share of your priorities. A score has no unit: it ranks
            policies, and the real units are always shown beside it.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Outcome</th>
                  <th className="py-2 pr-4 text-right font-medium">
                    Share of priorities
                  </th>
                  <th className="py-2 text-right font-medium">
                    Scale (one standard deviation)
                  </th>
                </tr>
              </thead>
              <tbody>
                {OUTCOMES.map((outcome) => (
                  <tr key={outcome.id} className="border-b last:border-b-0">
                    <td className="py-2 pr-4">{outcome.label}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatShare(result.weights[outcome.id])}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {formatOutcomeWithUnit(
                        outcome.id,
                        result.outcome_scales[outcome.id]
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Assumptions</h3>
          <ul className="flex max-w-3xl list-disc flex-col gap-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              The decision process is built from the {fitted} campaigns, and
              every policy is judged again on the held-out {heldOut} campaigns.
              The best fixed rotation is chosen on the fitted campaigns only.
            </li>
            <li>The August decision does not see the August soil water.</li>
            <li>
              Weather years are drawn within the El Niño phase of the decision:
              the planner does not forecast a particular year.
            </li>
            <li>
              Soil water is read at {formatWhole(result.water_levels)} levels of
              a {formatWhole(result.soil_capacity_mm)} mm capacity, and the
              agent trained for {formatWhole(result.episodes)} episodes.
            </li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Sources</h3>
          <ul className="grid gap-4 md:grid-cols-2">
            {result.sources.map((source) => (
              <li
                key={source.source_id}
                className="flex flex-col gap-0.5 rounded-lg border p-3 text-sm"
              >
                <span className="font-medium">{source.dataset}</span>
                <span className="text-muted-foreground">
                  {source.provider}. {source.period}. {source.location}.
                </span>
                <span className="text-xs text-muted-foreground">
                  Used for: {source.used_for}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="border-t pt-4 text-sm font-medium">
          {
            "Simulated scenarios, not a recommendation. They support the agronomist's judgment; they do not replace it."
          }
        </p>
      </div>
    </ResultSection>
  )
}
