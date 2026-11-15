import { View } from "react-native"
import { Badge } from "@/components/ui/badge"
import { Text } from "@/components/ui/text"

export function SyntheticNotice() {
  return (
    <View className="gap-2">
      <Badge variant="outline">
        <Text>Synthetic demo data</Text>
      </Badge>
      <Text className="text-xs text-muted-foreground">
        Boundaries, names, rotations and crops are made up to show the viewer;
        they are not real parcels. Schematic view, no basemap.
      </Text>
    </View>
  )
}
