import { Text as InlineText, View } from "react-native"
import { Text } from "@/components/ui/text"
import { openSitePage } from "@/features/landing/site-links"

export function AnnouncementBar() {
  return (
    <View className="bg-inverse px-4 py-2.5">
      <Text className="text-center text-sm text-inverse-foreground">
        <InlineText className="text-inverse-muted-foreground">
          NASA Space Apps Challenge 2026 ·
        </InlineText>{" "}
        Field Shift: Adapting Farms with NASA Data.{" "}
        <InlineText
          accessibilityRole="link"
          onPress={() => openSitePage("resources", "space-apps")}
          className="font-medium"
        >
          Learn more ›
        </InlineText>
      </Text>
    </View>
  )
}
