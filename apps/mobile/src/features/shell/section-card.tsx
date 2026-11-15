import { router } from "expo-router"
import { Pressable, View } from "react-native"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Icon } from "@/components/ui/icon"
import { Text } from "@/components/ui/text"
import type { AppSection } from "@/features/shell/sections"

export function SectionCard({ section }: { section: AppSection }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${section.title}`}
      onPress={() => router.push(section.href)}
    >
      <Card>
        <CardHeader>
          <View className="mb-3 flex-row items-start justify-between">
            <View className="size-10 items-center justify-center rounded-lg border border-border bg-background">
              <Icon as={section.icon} className="text-primary" size={20} />
            </View>
            {!section.isAvailable ? (
              <Badge variant="outline">
                <Text>Soon</Text>
              </Badge>
            ) : null}
          </View>
          <CardTitle className="font-medium">{section.title}</CardTitle>
          <CardDescription>{section.description}</CardDescription>
        </CardHeader>
      </Card>
    </Pressable>
  )
}
