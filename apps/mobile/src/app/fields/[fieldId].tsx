import { router, Stack, useLocalSearchParams } from "expo-router"
import { ScrollView, View } from "react-native"
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
import { Text } from "@/components/ui/text"
import { CropHistoryChart } from "@/features/fields/crop-history-chart"
import {
  COMPARISON,
  findField,
  getCropHistory,
  getNdviSeries,
  getSoilProfile,
  getSurfaceWaterStatus,
} from "@/features/fields/field-data"
import { NdviChart } from "@/features/fields/ndvi-chart"
import { SoilTable } from "@/features/fields/soil-table"
import { SourceNote } from "@/features/fields/source-note"

export default function FieldDetailScreen() {
  const { fieldId } = useLocalSearchParams<{ fieldId: string }>()
  const field = typeof fieldId === "string" ? findField(fieldId) : undefined

  if (!field) {
    return (
      <SafeAreaView
        edges={["bottom", "left", "right"]}
        className="flex-1 bg-secondary justify-center items-center p-4 gap-4"
      >
        <Text className="text-muted-foreground text-center">
          No local diagnostics for this field ID.
        </Text>
        <Button variant="ghost" onPress={() => router.back()}>
          <Text>Back to fields</Text>
        </Button>
      </SafeAreaView>
    )
  }

  const cropHistory = getCropHistory(field.id)
  const ndviSeries = getNdviSeries(field.id)
  const soilProfile = getSoilProfile(field.id)
  const surfaceWater = getSurfaceWaterStatus(field.id)

  const latestSample = ndviSeries[ndviSeries.length - 1]
  let latestSampleText = "No observations"
  if (latestSample) {
    const sampleDate = latestSample.acquiredUtc.slice(0, 10)
    if (latestSample.ndviMean !== null) {
      const validPct = Math.round(latestSample.validFraction * 100)
      latestSampleText = `${sampleDate} · NDVI ${latestSample.ndviMean.toFixed(2)}, ${validPct}% valid`
    } else {
      latestSampleText = `${sampleDate} · no valid NDVI`
    }
  }

  const firstMonth = ndviSeries[0]?.month ?? ""
  const lastMonth = ndviSeries[ndviSeries.length - 1]?.month ?? ""

  return (
    <SafeAreaView
      edges={["bottom", "left", "right"]}
      className="flex-1 bg-secondary"
    >
      <Stack.Screen options={{ title: field.label }} />
      <ScrollView contentContainerClassName="gap-4 p-6">
        {/* 1. Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
            <CardDescription>
              What this footprint is and what we know
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <View className="divide-y divide-border">
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-muted-foreground">Area</Text>
                <Text className="text-sm font-medium text-foreground">
                  {field.areaHa.toFixed(1)} ha
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-muted-foreground">Boundary</Text>
                <Text className="text-sm font-medium text-foreground">
                  FTW {field.boundaryMethod}, {field.boundaryDate}
                </Text>
              </View>
              <View className="flex-row items-center justify-between py-2">
                <Text className="text-sm text-muted-foreground">
                  FTW model confidence
                </Text>
                <Text className="text-sm font-medium text-foreground">
                  {field.confidence0to100.toFixed(1)} / 100
                </Text>
              </View>
              <View className="flex-row items-start justify-between py-2 gap-2">
                <Text className="text-sm text-muted-foreground">
                  Latest HLS sample
                </Text>
                <Text className="text-sm font-medium text-foreground text-right flex-1">
                  {latestSampleText}
                </Text>
              </View>
            </View>
            <Text className="text-xs text-muted-foreground">
              Satellite-estimated footprint; not a producer's field, cadastral
              parcel or validated boundary. The confidence is a model score, not
              the probability that the boundary is exact.
            </Text>
            {field.isDemoField ? (
              <Text className="text-xs text-muted-foreground">
                Demonstration footprint chosen for its clear outline in HLS
                imagery.
              </Text>
            ) : null}
          </CardContent>
        </Card>

        {/* 2. Crop history */}
        <Card>
          <CardHeader>
            <CardTitle>Crop history</CardTitle>
            <CardDescription>
              INTA crop map classes inside the footprint
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <CropHistoryChart campaigns={cropHistory} />
            <SourceNote>
              INTA national crop maps (Zenodo) · 2018/19–2024/25 · 30 m pixels
            </SourceNote>
          </CardContent>
        </Card>

        {/* 3. Greenness (NDVI) */}
        <Card>
          <CardHeader>
            <CardTitle>Greenness (NDVI)</CardTitle>
            <CardDescription>One NASA HLS scene per month</CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            <NdviChart samples={ndviSeries} />
            <SourceNote>
              {`NASA HLS (Landsat 8/9 and Sentinel-2) · ${firstMonth}–${lastMonth} · 30 m`}
            </SourceNote>
          </CardContent>
        </Card>

        {/* 4. Soil profile */}
        <Card>
          <CardHeader>
            <CardTitle>Soil profile</CardTitle>
            <CardDescription>
              {soilProfile
                ? "Modeled, one point inside this footprint"
                : "Not available for this footprint"}
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-3">
            {soilProfile ? (
              <>
                <SoilTable profile={soilProfile} />
                <SourceNote>ISRIC SoilGrids 2.0 · 250 m model</SourceNote>
              </>
            ) : (
              <Text className="text-sm text-muted-foreground">
                No SoilGrids profile was queried inside this footprint. The
                modeled point belongs to FTW 268949 and is not reused here.
              </Text>
            )}
          </CardContent>
        </Card>

        {/* 5. Surface water */}
        <Card>
          <CardHeader>
            <CardTitle>Surface water</CardTitle>
            <CardDescription>NASA OPERA DSWx</CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            <Text className="text-sm text-foreground">
              {surfaceWater.usableMonths > 0
                ? `${surfaceWater.usableMonths} months with valid pixels`
                : "No valid observations for this footprint."}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {surfaceWater.requestedMonths} monthly samples requested:{" "}
              {surfaceWater.notDownloadedMonths} not downloaded,{" "}
              {surfaceWater.maskedOrFillMonths} fully masked or fill.
            </Text>
            <Text className="text-xs text-muted-foreground">
              Missing data is not 0% water and does not mean there was no
              flooding.
            </Text>
            <SourceNote>
              {`NASA OPERA DSWx catalog ${surfaceWater.catalogStart} to ${surfaceWater.catalogEnd}`}
            </SourceNote>
          </CardContent>
        </Card>

        {/* 6. Compare rotations */}
        <Card>
          <CardHeader>
            <View className="flex-row items-center justify-between gap-2">
              <CardTitle>Compare rotations</CardTitle>
              <Badge variant="outline">
                <Text>Pending</Text>
              </Badge>
            </View>
            <CardDescription>
              Evaluation of alternative rotation strategies
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            <Text className="text-sm text-foreground">{COMPARISON.reason}</Text>
            <Text className="text-sm text-muted-foreground">
              Needs the confirmed current rotation and two alternatives
              evaluated for this same footprint over a common horizon.
            </Text>
            <Text className="text-xs text-muted-foreground">
              The three footprints in this study window are spatial units, not
              three rotation strategies.
            </Text>
          </CardContent>
        </Card>

        {/* 7. Footer */}
        <Text className="text-xs text-muted-foreground">
          Cropilot supports the agronomist's judgment. It never replaces it.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}
