import { View } from "react-native"
import { Text } from "@/components/ui/text"

interface PageHeaderProps {
  title: string
  description: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <View className="gap-2">
      <Text className="text-3xl font-light tracking-tight text-foreground">
        {title}
      </Text>
      <Text className="text-base text-muted-foreground">{description}</Text>
    </View>
  )
}
