import { router } from "expo-router"
import { Pressable, View } from "react-native"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Text } from "@/components/ui/text"
import type { FieldSummary } from "./field-data"

export function FieldCard({ field }: { field: FieldSummary }) {
  const showCadastralDisclaimer =
    !field.farmerConfirmed && !field.cadastralBoundary

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${field.label}`}
      onPress={() => {
        router.push({
          pathname: "/fields/[fieldId]",
          params: { fieldId: field.id },
        })
      }}
    >
      <Card className="gap-2">
        <CardHeader className="gap-1.5">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-base font-medium text-foreground">
              {field.label}
            </Text>
            {field.isDemoField ? (
              <Badge variant="secondary">
                <Text>Demo footprint</Text>
              </Badge>
            ) : null}
          </View>
          <Text className="text-sm text-foreground">
            {field.areaHa.toFixed(1)} ha · estimated boundary
          </Text>
          {showCadastralDisclaimer ? (
            <Text className="text-xs text-muted-foreground">
              Satellite-estimated footprint, not farmer-confirmed or cadastral
            </Text>
          ) : null}
        </CardHeader>
        <CardContent>
          <Text className="text-xs text-muted-foreground">
            Crop history · NDVI{field.hasSoilProfile ? " · Soil profile" : ""}
          </Text>
        </CardContent>
      </Card>
    </Pressable>
  )
}
