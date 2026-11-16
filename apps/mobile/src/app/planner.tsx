import { Stack } from "expo-router"
import { ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { ListRow } from "@/components/list-row"
import { Text } from "@/components/ui/text"
import { InfoButton } from "@/features/case/info-button"
import { appSections } from "@/features/shell/sections"

const section = appSections.rotationPlanner

export default function PlannerScreen() {
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-background"
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <InfoButton title={section.title}>
              <Text className="font-medium">How the score is built</Text>
              <Text>
                Each outcome is divided by its standard deviation across the
                fitted campaigns, so dollars and millimetres can be added.
                Margin counts up and the other four count down, each times its
                share of your priorities. A score has no unit: it ranks
                policies, and the real units are always shown beside it.
              </Text>
              <Text className="font-medium">Held-out comparison</Text>
              <Text>
                Every held-out gap is the optimum minus one baseline, campaign
                by campaign, with a 95% interval. The 12 held-out campaigns are
                cut into 4 blocks of 3 in a row. The gap is recomputed for every
                ordered way to draw 4 blocks with replacement: 256 resamples,
                with no random draws. The interval runs from the 2.5th to the
                97.5th percentile of their means.
              </Text>
              <Text>
                Better: the whole interval is above zero. Worse: the whole
                interval is below zero. Inconclusive: the interval contains
                zero. Identical: every campaign scores the same under both
                policies.
              </Text>
              <Text>
                Few blocks give a coarse interval, so Better needs nearly every
                block to agree. Consecutive campaigns carry soil water into the
                next, so the blocks are not independent restarts. Read the
                conclusion as a guide, not as a test with a guaranteed error
                rate.
              </Text>
              <Text>
                Bad-year margin is the mean gross margin, in USD/ha, of the
                worst fifth of campaigns, rounded up (ceil(n/5)): 3 of the 12
                held-out campaigns. It is reported per policy and is not one of
                your priorities. It is a plain lower-tail mean, not a CVaR.
              </Text>
              <Text className="font-medium">Assumptions</Text>
              <Text>
                The decision process is built from the 1984/85 to 2012/13
                campaigns, and every policy is judged again on the held-out
                2013/14 to 2024/25 campaigns. The best fixed rotation is chosen
                on the fitted campaigns only.
              </Text>
              <Text>
                The August decision does not see the August soil water. Weather
                years are drawn within the El Niño phase of the decision: the
                planner does not forecast a particular year.
              </Text>
              <Text className="font-medium">Simulator limits</Text>
              <Text>
                Weather is a 55 km NASA POWER cell, yields are department
                statistics, nitrogen, residues and diseases are not modelled,
                excess water is not modelled, prices are international
                benchmarks and costs are assumptions. Do not use a region where
                the simulator tracks reported yield anomalies poorly.
              </Text>
              <Text>
                Cover crops are not modelled. Second soybean is only available
                where MAGyP has a usable record. Strategies that need either are
                listed as unavailable with the reason.
              </Text>
              <Text className="font-medium">Availability</Text>
              <Text>
                Runs need a signed-in workspace with a chosen region and
                simulator data installed by the operator.
              </Text>
            </InfoButton>
          ),
        }}
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-4 px-4 py-4">
          <Text className="text-sm text-muted-foreground">
            {section.description}
          </Text>
          <View className="gap-2 rounded-xl border border-border bg-card p-4">
            <Text className="font-medium">Unavailable in this demo</Text>
            <Text className="text-sm text-muted-foreground">
              A run happens inside a signed-in workspace with a chosen region.
              This demo has no signed-in session, so it cannot start a run.
            </Text>
          </View>
          <View>
            <ListRow
              title="Starting point"
              subtitle="Soil water on June 1 and the El Niño phases you want to read the plan for."
            />
            <ListRow
              title="Priorities"
              subtitle="Gross margin · Crop water deficit · Days of bare soil · Rain on bare soil · Drainage below the root zone"
            />
            <ListRow
              title="Horizon and review"
              subtitle="Campaigns planned ahead, and a last check before the run."
            />
            <ListRow
              title="Simulate and solve"
              subtitle="Simulator, exact backward induction and five Q-learning agents. Baselines: one campaign at a time (greedy) and margin only."
            />
            <ListRow
              title="Held-out comparison"
              subtitle="Exact optimum minus each baseline on 12 held-out campaigns: block-resample 95% interval and conclusion."
            />
            <ListRow
              title="Next campaign"
              subtitle="Re-read the plan for a chosen starting point; nothing runs again."
            />
            <ListRow
              title="Limits"
              subtitle="The planner does not forecast a particular year. A policy chosen on training campaigns can lose on the held-out campaigns. The interval rests on 4 blocks, which is coarse."
            />
          </View>
          <Text className="text-sm text-muted-foreground">
            Every output is a simulated scenario, not an agronomic
            recommendation; it supports the agronomist’s judgment.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
