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
                fitted campaigns, so margin in dollars and drainage in
                millimetres can be added. Margin counts up and the other four
                count down, each times its share of your priorities. A score has
                no unit: it ranks policies, and the real units are always shown
                beside it.
              </Text>
              <Text className="font-medium">Assumptions</Text>
              <Text>
                Training campaigns: 1984/85–2012/13. Held-out campaigns:
                2013/14–2024/25. The best fixed rotation is chosen on the fitted
                campaigns only.
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
              title="Priorities"
              subtitle="Gross margin · Crop water deficit · Days of bare soil · Rain on bare soil · Drainage below the root zone"
            />
            <ListRow
              title="Simulate and solve"
              subtitle="Choose winter and summer crops each campaign. Run the simulator, then solve exactly by backward induction."
            />
            <ListRow
              title="Replay and compare"
              subtitle="Replay every policy through the real simulator on training and held-out campaigns. Compare with the best fixed rotation."
            />
            <ListRow
              title="Limits"
              subtitle="The planner does not forecast a particular year. A policy chosen on training campaigns can lose on the held-out campaigns."
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
