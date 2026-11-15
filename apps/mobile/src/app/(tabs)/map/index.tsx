import { router } from "expo-router"
import { Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import { CropSwatch } from "@/features/farm-map/crop-swatch"
import { CROP_IDS, CROPS } from "@/features/farm-map/crops"
import { FarmSchematic } from "@/features/farm-map/farm-schematic"
import { formatHectares } from "@/features/farm-map/format"
import { SYNTHETIC_DEMO_FARMS } from "@/features/farm-map/synthetic-demo-farms"
import { SyntheticNotice } from "@/features/farm-map/synthetic-notice"

export default function FarmMapScreen() {
  return (
    <SafeAreaView edges={["left", "right"]} className="flex-1 bg-secondary">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-6 p-6"
      >
        <PageHeader
          title="Farm map"
          description="Demo farms on the map. Tap a lot to inspect it, open a farm to see its data."
        />
        <SyntheticNotice />
        <View className="gap-2">
          <Text className="text-sm font-medium">Crop this campaign</Text>
          {CROP_IDS.map((crop) => (
            <View key={crop} className="flex-row items-center gap-2">
              <CropSwatch crop={crop} />
              <Text className="text-sm text-muted-foreground">
                {CROPS[crop].label}
              </Text>
            </View>
          ))}
        </View>
        {SYNTHETIC_DEMO_FARMS.map((farm) => (
          <Pressable
            key={farm.farmId}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/map/[farmId]",
                params: { farmId: farm.farmId },
              })
            }
          >
            <Card>
              <CardHeader>
                <CardTitle>{farm.name}</CardTitle>
                <CardDescription>{farm.rotation}</CardDescription>
                <Text className="text-sm text-muted-foreground">
                  {formatHectares(farm.areaHa)} · {farm.lots.length} lots
                </Text>
              </CardHeader>
              <CardContent>
                <FarmSchematic farm={farm} height={120} />
              </CardContent>
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  )
}
