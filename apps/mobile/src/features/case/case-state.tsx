import { ActivityIndicator, View } from "react-native"
import { Text } from "@/components/ui/text"
import { SVG_COLORS } from "@/lib/theme"

export function CaseState({
  status,
}: {
  status: "loading" | "notFound" | "unavailable"
}) {
  return (
    <View className="px-4 py-6">
      {status === "loading" ? (
        <ActivityIndicator size="small" color={SVG_COLORS.mutedForeground} />
      ) : (
        <Text className="text-sm text-muted-foreground">
          {status === "notFound"
            ? "Not available for this region yet"
            : "Case data unavailable"}
        </Text>
      )}
    </View>
  )
}
