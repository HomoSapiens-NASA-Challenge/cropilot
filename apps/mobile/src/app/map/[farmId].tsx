import { router, Stack, useLocalSearchParams } from "expo-router"
import { useState } from "react"
import { Linking, Pressable, ScrollView, View } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Text } from "@/components/ui/text"
import { CropSwatch } from "@/features/farm-map/crop-swatch"
import { CROPS } from "@/features/farm-map/crops"
import { FarmSchematic } from "@/features/farm-map/farm-schematic"
import {
  formatHectares,
  formatLngLat,
  formatShare,
} from "@/features/farm-map/format"
import {
  powerCellAt,
  powerDailySeriesUrl,
} from "@/features/farm-map/nasa-power-grid"
import {
  cropMix,
  SYNTHETIC_DEMO_FARMS,
} from "@/features/farm-map/synthetic-demo-farms"
import { SyntheticNotice } from "@/features/farm-map/synthetic-notice"
import { cn } from "@/lib/utils"

export default function FarmScreen() {
  const { farmId } = useLocalSearchParams<{ farmId: string }>()
  const [selectedLotId, setSelectedLotId] = useState<string | null>(null)
  const farm = SYNTHETIC_DEMO_FARMS.find((item) => item.farmId === farmId)
  if (!farm)
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        className="flex-1 bg-secondary"
      >
        <Stack.Screen options={{ title: "Farm" }} />
        <View className="items-start gap-4 p-6">
          <Text className="text-muted-foreground">
            This demo farm does not exist.
          </Text>
          <Button variant="ghost" onPress={() => router.back()}>
            <Text>Back</Text>
          </Button>
        </View>
      </SafeAreaView>
    )
  const lot = farm.lots.find((item) => item.lotId === selectedLotId)
  const cell = powerCellAt(farm.center)
  const others = SYNTHETIC_DEMO_FARMS.filter(
    (item) =>
      item.farmId !== farm.farmId &&
      powerCellAt(item.center).cellId === cell.cellId
  )
  const lastFullYear = new Date().getFullYear() - 1
  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-secondary"
    >
      <Stack.Screen options={{ title: farm.name }} />
      <ScrollView contentContainerClassName="gap-6 p-6">
        <SyntheticNotice />
        <Card>
          <CardContent>
            <FarmSchematic
              farm={farm}
              height={320}
              selectedLotId={selectedLotId}
              onSelectLot={setSelectedLotId}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{lot ? lot.name : "Lot details"}</CardTitle>
            {lot && <CardDescription>{lot.lotId}</CardDescription>}
          </CardHeader>
          <CardContent>
            {lot ? (
              <View className="gap-2">
                <View className="flex-row items-center gap-2">
                  <CropSwatch crop={lot.crop} />
                  <Text>{CROPS[lot.crop].label}</Text>
                </View>
                <Text>
                  {formatHectares(lot.areaHa)} ·{" "}
                  {formatShare(lot.areaHa / farm.areaHa)} of the farm
                </Text>
              </View>
            ) : (
              <Text className="text-muted-foreground">
                Tap a lot to inspect it.
              </Text>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-light tracking-tight">
              Farm details
            </CardTitle>
            <CardDescription>{farm.name}</CardDescription>
          </CardHeader>
          <CardContent className="gap-5">
            <View className="flex-row gap-2">
              <View className="flex-1 gap-1 rounded-lg border border-border bg-secondary p-3">
                <Text className="text-xs text-muted-foreground">Area</Text>
                <Text className="text-xl font-light tracking-tight">
                  {formatHectares(farm.areaHa)}
                </Text>
              </View>
              <View className="flex-1 gap-1 rounded-lg border border-border bg-secondary p-3">
                <Text className="text-xs text-muted-foreground">Lots</Text>
                <Text className="text-xl font-light tracking-tight">
                  {farm.lots.length}
                </Text>
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-xs font-medium text-muted-foreground">
                Crop mix this campaign
              </Text>
              {cropMix(farm).map((entry) => (
                <View
                  key={entry.crop}
                  className="flex-row items-center justify-between gap-2"
                >
                  <View className="flex-row items-center gap-2">
                    <CropSwatch crop={entry.crop} />
                    <Text className="text-sm">{CROPS[entry.crop].label}</Text>
                  </View>
                  <Text className="text-sm text-muted-foreground">
                    {formatHectares(entry.areaHa)} · {formatShare(entry.share)}
                  </Text>
                </View>
              ))}
            </View>
            <View className="gap-1">
              <Text className="text-xs font-medium text-muted-foreground">
                Current rotation
              </Text>
              <Text>{farm.rotation}</Text>
            </View>
            <View className="gap-1">
              <Text className="text-xs font-medium text-muted-foreground">
                Center
              </Text>
              <Text>{formatLngLat(farm.center)}</Text>
            </View>
            <Separator />
            <View className="gap-2">
              <Text className="text-xl font-light tracking-tight">Lots</Text>
              <View className="flex-row gap-2">
                <Text className="flex-1 text-xs text-muted-foreground">
                  Lot
                </Text>
                <Text className="flex-1 text-xs text-muted-foreground">
                  Crop
                </Text>
                <Text className="text-xs text-muted-foreground">Area</Text>
              </View>
              {farm.lots.map((item) => (
                <Pressable
                  key={item.lotId}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: item.lotId === selectedLotId,
                  }}
                  onPress={() => setSelectedLotId(item.lotId)}
                  className={cn(
                    "flex-row items-center gap-2 rounded-lg py-2",
                    item.lotId === selectedLotId && "bg-secondary"
                  )}
                >
                  <Text className="flex-1 text-sm font-medium">
                    {item.name}
                  </Text>
                  <View className="flex-1 flex-row items-center gap-1">
                    <CropSwatch crop={item.crop} />
                    <Text className="text-xs">{CROPS[item.crop].label}</Text>
                  </View>
                  <Text className="text-sm">{formatHectares(item.areaHa)}</Text>
                </Pressable>
              ))}
            </View>
            <Separator />
            <View className="gap-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-medium text-muted-foreground">
                  NASA POWER grid cell
                </Text>
                <Badge variant="outline">
                  <Text>computed</Text>
                </Badge>
              </View>
              <Text className="text-sm">Cell ID: {cell.cellId}</Text>
              <Text className="leading-relaxed">
                This farm falls in the cell centered at{" "}
                {formatLngLat(cell.center)}, about {cell.heightKm.toFixed(0)} ×{" "}
                {cell.widthKm.toFixed(0)} km. POWER gives one value for the
                whole cell.
              </Text>
              <View className="rounded-lg border border-border bg-secondary p-3">
                <Text className="text-sm leading-relaxed">
                  {others.length > 0
                    ? `Shares the cell with ${others.length} other demo ${others.length === 1 ? "farm" : "farms"}: ${others.map((other) => other.name).join(", ")}. POWER cannot tell them apart; lot-level differences need 30 m imagery.`
                    : "No other demo farm shares this cell."}
                </Text>
              </View>
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  Linking.openURL(
                    powerDailySeriesUrl(farm.center, lastFullYear)
                  )
                }
                className="gap-1 rounded-lg border border-border p-3"
              >
                <Text className="text-sm font-medium">
                  Open the raw daily series
                </Text>
                <Text className="text-xs text-muted-foreground">
                  GWETROOT and PRECTOTCORR, {lastFullYear}, at the farm center
                </Text>
              </Pressable>
            </View>
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}
